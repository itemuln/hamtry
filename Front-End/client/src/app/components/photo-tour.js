import { HamtryElement, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import { readPhoto } from '../state/media-store.js'
import css from './photo-tour.css?inline'
const sheet = new CSSStyleSheet(); sheet.replaceSync(css)

// Энгийн зургийг 360/3D гэж харуулахгүй. Өрөө ба тухайн өрөөний зургуудын хооронд шилжинэ.
export class HamtryPhotoTour extends HamtryElement {
  data = signal([])
  selected = signal('')
  index = signal(0)
  status = signal('idle')
  get rooms() { return this.data.get() }
  set rooms(value) { this.data.set(value || []); this.selected.set(value?.[0]?.id || ''); this.index.set(0) }
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = '<div class="tour"><div class="room-tabs" role="group" aria-label="Өрөө сонгох"></div><div class="viewport"><img><p class="feedback" role="status" aria-live="polite"></p></div><div class="navigation"><button class="previous" type="button" aria-label="Өмнөх зураг">←</button><p class="caption" aria-live="polite"></p><button class="next" type="button" aria-label="Дараагийн зураг">→</button></div><p class="note">Өрөөний зургууд · Энэ нь 360° эсвэл хэмжээс бүхий 3D загвар биш.</p></div>'
  }
  setup() {
    const step = direction => {
      const room = this.rooms.find(room => room.id === this.selected.get())
      if (room) this.index.set(index => Math.max(0, Math.min(room.photos.length - 1, index + direction)))
    }
    listen(required('.previous', this.root), 'click', () => step(-1))
    listen(required('.next', this.root), 'click', () => step(1))
    listen(required('.room-tabs', this.root), 'click', event => {
      const button = event.target.closest('[data-room]')
      if (button) { this.selected.set(button.dataset.room); this.index.set(0) }
    })
    listen(this.root, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1)
    })
    useEffect(() => {
      const rooms = this.rooms, selected = this.selected.get(), index = this.index.get()
      const tabs = required('.room-tabs', this.root)
      if ([...tabs.children].map(button => button.dataset.room).join(',') !== rooms.map(room => room.id).join(',')) {
        tabs.replaceChildren(...rooms.map(room => { const button = document.createElement('button'); button.type = 'button'; button.dataset.room = room.id; button.textContent = room.name; return button }))
      }
      for (const button of tabs.children) button.setAttribute('aria-pressed', String(button.dataset.room === selected))
      const room = rooms.find(room => room.id === selected), photo = room?.photos[index]
      const previous = required('.previous', this.root), next = required('.next', this.root)
      const focused = this.root.activeElement
      previous.disabled = !room || index === 0
      next.disabled = !room || index >= room.photos.length - 1
      // Захын зурагт товч disabled болоход keyboard focus-ийг ажиллах товчид үлдээнэ.
      if (focused === next && next.disabled && !previous.disabled) previous.focus()
      if (focused === previous && previous.disabled && !next.disabled) next.focus()
      required('.caption', this.root).textContent = room ? `${room.name} · ${index + 1} / ${room.photos.length}` : 'Зураг оруулаагүй'
      const image = required('img', this.root); image.alt = room ? `${room.name} — ${photo?.caption || 'өрөөний зураг'}` : ''
      image.removeAttribute('src'); this.status.set(photo ? 'loading' : 'empty')
      let active = true, url
      // Effect солигдоход өмнөх object URL-ийг чөлөөлж, хоцорсон async үр дүнг үл тооно.
      onCleanup(() => { active = false; if (url) URL.revokeObjectURL(url) })
      if (!photo) return
      if (photo.src) { image.src = photo.src; this.status.set('ready'); return }
      void readPhoto(photo.id).then(blob => {
        if (!active) return
        if (!blob) { this.status.set('missing'); return }
        url = URL.createObjectURL(blob); image.src = url; this.status.set('ready')
      }).catch(() => { if (active) this.status.set('missing') })
    })
    useEffect(() => {
      const status = this.status.get()
      required('img', this.root).hidden = status !== 'ready'
      const feedback = required('.feedback', this.root)
      feedback.hidden = status === 'ready'
      feedback.textContent = status === 'loading' ? 'Зураг ачаалж байна…' : status === 'missing' ? 'Энэ хөтөч дээр зураг олдсонгүй.' : 'Энэ зарын өрөөний зураг нэмэгдээгүй байна.'
      this.dataset.tourState = status
    })
    listen(required('img', this.root), 'error', () => this.status.set('missing'))
  }
}
