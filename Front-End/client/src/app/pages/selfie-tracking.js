// Browser-only interaction checks, not identity verification or spoof detection.
export function facePose(faces, video, viewport) {
  if (faces.length !== 1) return { valid: false, hint: faces.length ? 'Камерт зөвхөн нэг хүн харагдах ёстой.' : 'Нүүр харагдахгүй байна. Гэрлээ шалгаад хүрээнд байрлаарай.' }
  const face = faces[0]
  const scale = Math.max(viewport.width / video.width, viewport.height / video.height)
  const project = p => ({ x: (p.x * video.width * scale - (video.width * scale - viewport.width) / 2) / viewport.width, y: (p.y * video.height * scale - (video.height * scale - viewport.height) / 2) / viewport.height })
  const top = project(face[10]), chin = project(face[152])
  const height = chin.y - top.y, centerY = (chin.y + top.y) / 2
  const eyeA = face[33], eyeB = face[263], nose = face[1]
  const eyeDistance = Math.abs(eyeA.x - eyeB.x)
  const centerX = project({ x: (eyeA.x + eyeB.x) / 2, y: nose.y }).x
  if (height < .32) return { valid: false, hint: 'Камерт бага зэрэг ойртоорой.' }
  if (height > .85 || top.y < .03 || chin.y > .97) return { valid: false, hint: 'Камераас бага зэрэг холдоорой.' }
  if (Math.abs(centerX - .5) > .16 || Math.abs(centerY - .48) > .18) return { valid: false, hint: 'Нүүрээ хүрээний төвд байрлуулаарай.' }
  if (eyeDistance < .02) return { valid: false, hint: 'Нүүрээ камер руу харуулаарай.' }
  return { valid: true, turn: (nose.x - (eyeA.x + eyeB.x) / 2) / eyeDistance }
}

export function createPoseSequence() {
  let step = 0, since = null, baseline = 0, lastTime = null
  return {
    update(pose, now) {
      if (lastTime !== null && now - lastTime > 500) since = null
      lastTime = now
      const matches = pose.valid && (step === 1 ? Math.abs(pose.turn - baseline) > .22 : Math.abs(pose.turn - (step === 0 ? 0 : baseline)) < .16)
      if (!matches) since = null
      else since ??= now
      const duration = step === 1 ? 550 : 900
      const progress = since === null ? 0 : Math.min(1, (now - since) / duration)
      let advanced = false
      if (progress === 1) {
        if (step === 0) baseline = pose.turn
        step++; since = null; advanced = true
      }
      return { step, advanced, complete: step === 3, progress, hint: pose.valid ? (matches ? 'Түр тогтвортой бариарай…' : step === 1 ? 'Толгойгоо аль нэг тийш бага зэрэг эргүүлээрэй.' : 'Камер руу эгц хараарай.') : pose.hint }
    },
  }
}
