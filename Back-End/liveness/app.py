import base64
import binascii
import io
import logging
import os
import secrets
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

os.environ['DEEPFACE_BACKEND_ENGINE'] = 'onnx'
os.environ.setdefault('DEEPFACE_HOME', str(Path(__file__).parent / '.models'))

import numpy as np
from PIL import Image, UnidentifiedImageError
from deepface import DeepFace
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

sessions = {}
session_lock = threading.Lock()
inference_lock = threading.Lock()
SESSION_SECONDS = 180
MAX_BODY = 1_600_000


def fail(code, message, status=422):
    raise HTTPException(status, detail={'code': code, 'message': message})


@asynccontextmanager
async def lifespan(_app):
    # Load once before accepting sessions, so model loading cannot expire a capture.
    DeepFace.build_model('retinaface', task='face_detector')
    DeepFace.build_model('Fasnet', task='spoofing')
    DeepFace.build_model('SFace')
    yield


app = FastAPI(lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def invalid_request(_request, _error):
    # Do not echo submitted face images in validation errors.
    return JSONResponse({'detail': {'code': 'invalid_request', 'message': 'Гурван selfie зураг зөв хэлбэрээр илгээнэ үү.'}}, status_code=422)


@app.middleware('http')
async def limit_body(request: Request, call_next):
    size = 0
    chunks = []
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BODY:
            return JSONResponse({'detail': {'code': 'too_large', 'message': 'Зургийн хэмжээ хэтэрсэн байна.'}}, status_code=413)
        chunks.append(chunk)
    request._body = b''.join(chunks)
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/api/liveness/health')
def health():
    return {'status': 'ready'}


@app.post('/api/liveness/sessions')
def create_session():
    now = time.monotonic()
    with session_lock:
        for key, expiry in list(sessions.items()):
            if expiry <= now:
                del sessions[key]
        if len(sessions) >= 100:
            fail('busy', 'Түр хүлээгээд дахин оролдоорой.', 429)
        token = secrets.token_urlsafe(32)
        sessions[token] = now + SESSION_SECONDS
    return {'session_id': token, 'expires_in': SESSION_SECONDS}


class Capture(BaseModel):
    session_id: str = Field(min_length=40, max_length=64)
    frames: list[str] = Field(min_length=3, max_length=3)


def decode_frame(encoded):
    try:
        if len(encoded) > 500_000:
            raise ValueError('oversized image')
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(raw)) as image:
            if image.format != 'JPEG' or not (80 <= image.width <= 720 and 80 <= image.height <= 720):
                raise ValueError('unsupported image')
            return np.asarray(image.convert('RGB'))[:, :, ::-1].copy()
    except (ValueError, binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError):
        fail('invalid_image', 'Selfie зураг уншигдсангүй. Дахин оролдоорой.')


def inspect_frames(images):
    faces = []
    turns = []
    for image in images:
        try:
            found = DeepFace.extract_faces(image, detector_backend='retinaface', anti_spoofing=True,
                                           color_face='bgr', normalize_face=False)
        except ValueError:
            fail('face_missing', 'Нүүрээ бүтнээр нь харуулж, гэрэлтэй газар дахин оролдоорой.')
        if len(found) != 1:
            fail('face_count', 'Зураг бүрт зөвхөн нэг хүн харагдах ёстой.')
        face = found[0]
        if not face.get('is_real'):
            fail('spoof', 'Бодит нүүр батлагдсангүй. Зураг эсвэл дэлгэц ашиглалгүй дахин оролдоорой.')
        area = face['facial_area']
        left, right, nose = (area.get(key) for key in ('left_eye', 'right_eye', 'nose'))
        if left is None or right is None or nose is None or abs(left[0] - right[0]) < 10:
            fail('landmarks', 'Нүд, хамраа халхлалгүй камер руу хараарай.')
        turns.append((nose[0] - (left[0] + right[0]) / 2) / abs(left[0] - right[0]))
        faces.append(face['face'])
    # Fixed front/turn/front is a local demo check, not replay-proof identity verification.
    if abs(turns[0]) > .25 or abs(turns[1] - turns[0]) < .18 or abs(turns[2] - turns[0]) > .20:
        fail('movement', 'Камер руу хараад, толгойгоо эргүүлж, дахин эгц хараарай.')
    for face in faces[1:]:
        match = DeepFace.verify(faces[0], face, model_name='SFace', detector_backend='skip', align=False)
        if not match['verified']:
            fail('mismatch', 'Гурван зураг дахь нүүр тохирсонгүй. Дахин оролдоорой.')
    return {'status': 'passed'}


@app.post('/api/liveness/verify')
def verify(capture: Capture):
    with session_lock:
        expiry = sessions.pop(capture.session_id, 0)
    if expiry <= time.monotonic():
        fail('expired', 'Шалгалтын хугацаа дууссан эсвэл ашиглагдсан байна. Дахин эхлүүлээрэй.', 409)
    images = [decode_frame(frame) for frame in capture.frames]
    if not inference_lock.acquire(blocking=False):
        fail('busy', 'Өөр шалгалт явагдаж байна. Түр хүлээгээд дахин эхлүүлээрэй.', 429)
    try:
        return inspect_frames(images)
    except HTTPException:
        raise
    except Exception:
        logging.exception('Selfie inference failed')
        fail('unavailable', 'Шалгах үйлчилгээ алдаа гаргалаа. Дахин оролдоорой.', 503)
    finally:
        inference_lock.release()
