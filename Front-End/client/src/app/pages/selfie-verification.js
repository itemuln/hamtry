import { onCleanup } from '@hamtry/library'
import './selfie-verification.css'
import { facePose, createPoseSequence } from './selfie-tracking.js'

const face = `<svg viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M30 60c0-44 60-44 60 0v25c0 44-60 44-60 0Z"/><path d="M43 68h5m24 0h5M60 75v14m-12 9q12 8 24 0M20 147q8-29 27-30m26 0q19 1 27 30"/></svg>`
export function verificationMarkup() {
  return `<section class="dashboard-panel selfie-entry"><div class="selfie-entry-heading"><h2>Selfie баталгаажуулалт</h2><span>Баталгаажаагүй</span></div><p>Өөрийгөө бодит хүн гэдгийг батлах дараагийн алхам.</p><hamtry-button variant="outline" data-selfie-open>Selfie check эхлүүлэх</hamtry-button><small>Камер · DeepFace шалгалт</small></section>`
}
export function setupVerification(root, listen) {
  const dialog = document.createElement('hamtry-dialog')
  dialog.className = 'selfie-dialog'
  dialog.setAttribute('heading', 'Selfie баталгаажуулалт')
  dialog.innerHTML = `<div class="selfie-flow">
    <p class="selfie-demo-note">Нүүрний хөдөлгөөн, бодит нүүр болон алхмуудын тохирлыг шалгана.</p>
    <ol class="selfie-progress" aria-label="Баталгаажуулалтын явц"><li>Бэлтгэх</li><li>Selfie check</li><li>Дуусгах</li></ol>
    <div class="selfie-viewport"><video autoplay muted playsinline aria-label="Камерын шууд дүрс" hidden></video><div class="selfie-guide">${face}</div><span class="selfie-camera-label">Камер унтраалттай</span></div>
    <div class="selfie-instruction" role="status" aria-live="polite" aria-atomic="true"><h3></h3><p></p></div>
    <p class="selfie-feedback" role="status" aria-live="polite"></p><ul class="selfie-tips"><li>Гэрэлтэй газар, камерын өөдөөс сууна.</li><li>Нүдний шил, маск нүүрийг халхлахгүй байна.</li><li>Камераа нүдний түвшинд тогтвортой барина.</li></ul>
    <p class="selfie-privacy">Камер нээхэд та 3 selfie зургийг манай серверээр шалгуулахыг зөвшөөрнө. Зураг дискэнд хадгалахгүй. Хаахад камер унтарна. Камергүй demo зураг илгээхгүй.</p>
    <div class="selfie-actions"><hamtry-button data-selfie-next></hamtry-button><hamtry-button variant="ghost" data-selfie-demo>Камергүй demo үзэх</hamtry-button></div>
  </div>`
  root.append(dialog)
  const next = dialog.querySelector('[data-selfie-next]'), demo = dialog.querySelector('[data-selfie-demo]')
  const video = dialog.querySelector('video'), viewport = dialog.querySelector('.selfie-viewport')
  let stage = 'intro', step = 0, stream, request = 0, timer, cameraDemo = false
  let detector, frames = [], session, controller, lastFrame = -1, expiresAt = 0
  const feedback = dialog.querySelector('.selfie-feedback')
  const steps = [
    ['Нүүрээ хүрээнд байрлуулаарай', 'Нүүрээ бүтнээр нь харуулж, камер руу эгц хараарай.'],
    ['Толгойгоо аажмаар эргүүлээрэй', 'Толгойгоо аль нэг тийш бага зэрэг эргүүлээд тогтвортой бариарай.'],
    ['Камер руу дахин хараарай', 'Нүүрээ хүрээний төвд авчирч, хэсэг тогтвортой бариарай.'],
  ]
  function stop() {
    request++
    clearTimeout(timer)
    controller?.abort(); controller = undefined
    detector?.close(); detector = undefined
    frames = []; session = undefined; lastFrame = -1
    stream?.getTracks().forEach(track => track.stop())
    stream = undefined
    video.srcObject = null
    video.hidden = true
    dialog.querySelector('.selfie-guide').dataset.aligned = 'false'
  }
  function render(error = '') {
    const content = {
      intro: ['Selfie check-д бэлэн үү?', 'Камерын зөвшөөрөл өгөөд дэлгэцийн зааврыг дагана.', 'Камер нээх'],
      loading: ['Шалгалтыг бэлдэж байна', 'Нүүр илрүүлэх загварыг ачаалж байна. Эхний удаа бага зэрэг хүлээнэ үү.', 'Бэлдэж байна…'],
      permission: ['Камерын зөвшөөрөл хүлээж байна', 'Хөтчийн цонхноос камер ашиглахыг зөвшөөрөөрэй.', 'Хүлээж байна…'],
      capture: [...steps[step], step === 2 ? 'Demo-г дуусгах' : 'Дараагийн алхам'],
      processing: ['Шалгаж байна', cameraDemo ? 'Demo явцыг дуусгаж байна.' : 'DeepFace таны selfie зургуудыг шалгаж байна.', 'Түр хүлээнэ үү…'],
      complete: [cameraDemo ? 'Demo дууслаа' : 'Selfie шалгалт амжилттай', cameraDemo ? 'Та алхмуудыг үзлээ. Бодит шалгалт хийгдээгүй.' : 'Бодит нүүр, толгойн хөдөлгөөн, зургуудын тохирол шалгагдлаа. Энэ нь бүртгэлийн эзэмшигчийг таньсан баталгаа биш.', 'Дуусгах'],
      error: ['Шалгалтыг үргэлжлүүлж чадсангүй', error, 'Дахин оролдох'],
    }[stage]
    dialog.querySelector('h3').textContent = content[0]
    dialog.querySelector('.selfie-instruction p').textContent = content[1]
    next.textContent = content[2]
    next.toggleAttribute('disabled', ['permission', 'loading', 'processing'].includes(stage))
    next.hidden = stage === 'capture' && !cameraDemo
    feedback.hidden = stage !== 'capture' || cameraDemo
    feedback.textContent = ''
    demo.hidden = !['intro', 'error', 'permission'].includes(stage)
    dialog.querySelector('.selfie-tips').hidden = !['intro', 'error'].includes(stage)
    viewport.hidden = ['processing', 'complete'].includes(stage)
    viewport.dataset.step = String(step)
    dialog.querySelector('.selfie-guide svg').style.visibility = stream ? 'hidden' : 'visible'
    dialog.querySelector('.selfie-camera-label').textContent = stage === 'capture' ? `${cameraDemo ? 'Камергүй demo' : 'Камер асаалттай'} · ${step + 1} / 3` : 'Камер унтраалттай'
    dialog.querySelectorAll('.selfie-progress li').forEach((li, index) => {
      const current = ['processing', 'complete'].includes(stage) ? 2 : ['capture', 'loading'].includes(stage) ? 1 : 0
      if (index === current) li.setAttribute('aria-current', 'step')
      else li.removeAttribute('aria-current')
    })
  }
  async function startCamera() {
    stop()
    const id = request
    stage = 'permission'; render()
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unavailable')
      const incoming = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } } })
      if (id !== request || !dialog.open) { incoming.getTracks().forEach(track => track.stop()); return }
      stream = incoming
      video.srcObject = stream
      await video.play()
      if (id !== request) return
      video.hidden = false
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (id !== request) return
        stop(); stage = 'error'; render('Камерын холболт тасарлаа. Камераа шалгаад дахин оролдоорой.')
      }, { once: true })
      cameraDemo = false; step = 0; stage = 'loading'; render()
      controller = new AbortController()
      const created = await api('/sessions', {}, controller.signal)
      if (id !== request) return
      session = created.session_id
      expiresAt = performance.now() + (created.expires_in || 180) * 1000
      const { createDetector } = await import('./selfie-detector.js')
      if (id !== request) return
      const loaded = await createDetector()
      if (id !== request) { loaded.close(); return }
      detector = loaded
      stage = 'capture'; render()
      track(createPoseSequence(), id)
    } catch (error) {
      if (id !== request) return
      if (stage === 'loading') error.userMessage ||= 'Нүүр илрүүлэх загвар ачаалсангүй. Хуудсаа шинэчлээд дахин оролдоорой.'
      stop(); stage = 'error'
      render(error.userMessage || (error.name === 'NotAllowedError' ? 'Камерын зөвшөөрөл хаалттай байна. Хөтчийн тохиргооноос зөвшөөрөөд дахин оролдоорой.' : 'Камер олдсонгүй эсвэл ашиглах боломжгүй байна. HTTPS / localhost дээр нээж, камераа шалгана уу. Камергүй demo-г мөн үзэж болно.'))
    }
  }
  async function api(path, body, signal) {
    try {
      const response = await fetch(`/api/liveness${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]) })
      const data = await response.json()
      if (!response.ok) throw Object.assign(new Error('api'), { userMessage: data.detail?.message || 'Шалгах үйлчилгээ ажиллахгүй байна. Дахин оролдоорой.' })
      return data
    } catch (error) {
      if (error.name === 'AbortError') throw error
      error.userMessage ||= 'Шалгах сервертэй холбогдсонгүй. Backend-ээ асаагаад дахин оролдоорой.'
      throw error
    }
  }
  function capture() {
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', .85).split(',')[1]
  }
  function track(sequence, id) {
    if (id !== request || stage !== 'capture') return
    if (performance.now() > expiresAt) {
      stop(); stage = 'error'; render('Шалгалтын хугацаа дууслаа. Дахин эхлүүлээрэй.'); return
    }
    try {
      if (video.readyState >= 2 && video.currentTime !== lastFrame) {
        lastFrame = video.currentTime
        const result = detector.detectForVideo(video, performance.now())
        const pose = facePose(result.faceLandmarks, { width: video.videoWidth, height: video.videoHeight }, viewport.getBoundingClientRect())
        const state = sequence.update(pose, performance.now())
        dialog.querySelector('.selfie-guide').dataset.aligned = String(pose.valid)
        feedback.textContent = state.hint
        if (state.advanced) {
          frames.push(capture())
          if (state.complete) { void finish(); return }
          step = state.step; render()
        }
      }
      // Bound inference to ~8 fps instead of processing every camera frame.
      timer = setTimeout(() => track(sequence, id), 120)
    } catch {
      stop(); stage = 'error'; render('Нүүр илрүүлэлт тасарлаа. Камераа дахин нээгээд оролдоорой.')
    }
  }
  async function finish() {
    const payload = { session_id: session, frames }
    stop(); stage = 'processing'; render()
    const id = request
    if (cameraDemo) { timer = setTimeout(() => { stage = 'complete'; render() }, 700); return }
    controller = new AbortController()
    try {
      const result = await api('/verify', payload, controller.signal)
      if (id !== request) return
      if (result.status !== 'passed') throw Object.assign(new Error('failed'), { userMessage: 'Шалгалт амжилтгүй. Дахин оролдоорой.' })
      stage = 'complete'; render()
    } catch (error) {
      if (id !== request) return
      stage = 'error'; render(error.userMessage || 'Шалгалт тасарлаа. Дахин оролдоорой.')
    }
  }
  listen(root.querySelector('[data-selfie-open]'), 'click', () => {
    stop(); stage = 'intro'; step = 0; render(); dialog.showModal()
  })
  listen(demo, 'click', () => { stop(); cameraDemo = true; step = 0; stage = 'capture'; render() })
  listen(next, 'click', () => {
    if (stage === 'intro' || stage === 'error') { void startCamera(); return }
    if (stage === 'complete') { dialog.close(); return }
    if (stage !== 'capture' || !cameraDemo) return
    // Camera-free preview never submits images or grants verification.
    if (step < 2) { step++; render(); return }
    void finish()
  })
  listen(dialog, 'hamtry-dialog-close', stop)
  listen(window, 'hashchange', () => { stop(); dialog.close() })
  listen(document, 'visibilitychange', () => {
    if (document.hidden && dialog.open) { stop(); stage = 'intro'; step = 0; render() }
  })
  onCleanup(() => { stop(); dialog.close(); dialog.remove() })
}
