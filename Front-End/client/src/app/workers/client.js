// Worker-ийн бүх хүсэлт хаах, алдаа болон timeout үед заавал дуусна.
export function workerClient(worker) {
  let sequence = 0, closed = false
  const pending = new Map()
  const close = (error = new Error('Ажиллагаа цуцлагдлаа.')) => {
    if (closed) return
    closed = true
    worker.terminate()
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error) }
    pending.clear()
  }
  worker.onmessage = ({ data }) => {
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id); clearTimeout(entry.timer)
    if (data.error) entry.reject(new Error(data.error))
    else entry.resolve(data.result)
  }
  worker.onerror = event => { event.preventDefault(); close(new Error('Туслах ажиллагааг эхлүүлж чадсангүй.')) }
  worker.onmessageerror = () => close(new Error('Туслах ажиллагааны өгөгдлийг уншиж чадсангүй.'))
  return {
    close,
    request(type, payload, transfer = [], timeout = 60000) {
      if (closed) return Promise.reject(new Error('Ажиллагаа хаагдсан байна.'))
      const id = ++sequence
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => close(new Error('Ажиллагааны хугацаа дууслаа. Дахин оролдоорой.')), timeout)
        pending.set(id, { resolve, reject, timer })
        try { worker.postMessage({ id, type, payload }, transfer) }
        catch (error) { pending.delete(id); clearTimeout(timer); reject(error) }
      })
    },
  }
}
