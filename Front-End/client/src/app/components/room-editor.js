import { HamtryElement, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import { preparePhoto } from '../state/media-store.js'
import css from './room-editor.css?inline'
const sheet = new CSSStyleSheet(); sheet.replaceSync(css)
const newRoom = () => ({ id: `room-${crypto.randomUUID()}`, name: 'Зочны өрөө', photos: [] })

export class HamtryRoomEditor extends HamtryElement {
  rooms = signal([newRoom()])
  pending = signal(0)
  message = signal('')
  get busy() { return this.pending.get() > 0 }
  get value() { return this.rooms.get().map(room => ({ id: room.id, name: room.name.trim(), photos: room.photos.map(({ id, caption }) => ({ id, caption })) })) }
  get records() { return this.rooms.get().flatMap(room => room.photos) }
  get cover() { return this.records[0]?.cover || '' }
  reset() { this.rooms.set([newRoom()]); this.message.set('') }
  validate() {
    const invalid = this.rooms.get().find(room => !room.name.trim() || !room.photos.length)
    if (this.busy) { this.message.set('Зургууд бэлэн болохыг түр хүлээнэ үү.'); return false }
    if (invalid) {
      this.message.set('Өрөө бүрт нэр болон хамгийн багадаа нэг зураг оруулна уу.')
      const row = this.root.querySelector(`[data-room="${invalid.id}"]`)
      row?.querySelector(invalid.name.trim() ? 'input[type=file]' : 'input[type=text]')?.focus()
      return false
    }
    this.message.set(''); return true
  }
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = '<div class="intro"><strong>Өрөөнүүдийн зураг</strong><span>Өрөө бүрийн зургийг тусад нь нэмнэ. JPG, PNG, WebP · нэг зураг 10 MB, нийт 12 зураг хүртэл.</span></div><div class="rooms"></div><button class="add-room" type="button">Өрөө нэмэх +</button><p class="message" role="status" aria-live="polite"></p>'
  }
  setup() {
    let active = true
    this.pending.set(0)
    onCleanup(() => { active = false })
    const update = (id, callback) => this.rooms.set(rooms => rooms.map(room => room.id === id ? callback(room) : room))
    listen(required('.add-room', this.root), 'click', () => {
      if (this.rooms.get().length >= 6) return
      const room = newRoom(); room.name = 'Шинэ өрөө'
      this.rooms.set(rooms => [...rooms, room])
      queueMicrotask(() => this.root.querySelector(`[data-room="${room.id}"] input`)?.focus())
    })
    listen(this.root, 'input', event => {
      if (event.target.type !== 'text') return
      update(event.target.closest('[data-room]').dataset.room, room => ({ ...room, name: event.target.value }))
    })
    listen(this.root, 'click', event => {
      const button = event.target.closest('[data-remove]')
      if (!button) return
      const id = button.closest('[data-room]').dataset.room
      if (button.dataset.remove === 'room') this.rooms.set(rooms => rooms.filter(room => room.id !== id))
      else update(id, room => ({ ...room, photos: room.photos.filter(photo => photo.id !== button.dataset.remove) }))
    })
    listen(this.root, 'change', async event => {
      if (event.target.type !== 'file') return
      const id = event.target.closest('[data-room]').dataset.room, files = [...event.target.files]
      event.target.value = ''
      if (this.records.length + files.length > 12) { this.message.set('Нийт 12 зураг хүртэл нэмнэ.'); return }
      this.pending.set(count => count + 1); this.message.set('Зураг бэлдэж байна…')
      try {
        for (const file of files) {
          const photo = await preparePhoto(file)
          if (!active) return
          update(id, room => ({ ...room, photos: [...room.photos, photo] }))
        }
        if (active) this.message.set('Зургууд нэмэгдлээ. Өрөөний нэр болон дарааллаа шалгаарай.')
      } catch (error) { if (active) this.message.set(error.message || 'Зургийг уншиж чадсангүй.') }
      finally { if (active) this.pending.set(count => Math.max(0, count - 1)) }
    })
    useEffect(() => {
      const rooms = this.rooms.get(), list = required('.rooms', this.root)
      for (const row of [...list.children]) if (!rooms.some(room => room.id === row.dataset.room)) row.remove()
      for (const room of rooms) {
        let row = [...list.children].find(row => row.dataset.room === room.id)
        if (!row) {
          row = document.createElement('section'); row.dataset.room = room.id
          row.innerHTML = '<div class="room-heading"><label>Өрөөний нэр<input type="text" maxlength="60"></label><button type="button" data-remove="room">Өрөө хасах</button></div><div class="photos"></div><label class="upload">Зураг нэмэх<input type="file" multiple accept="image/jpeg,image/png,image/webp"></label>'
          list.append(row)
        }
        row.querySelector('input[type=text]').value = room.name
        row.querySelector('[data-remove=room]').disabled = rooms.length === 1 || this.busy
        row.querySelector('input[type=file]').disabled = this.busy
        const photos = row.querySelector('.photos')
        for (const node of [...photos.children]) if (!room.photos.some(photo => photo.id === node.dataset.photo)) node.remove()
        for (const photo of room.photos) if (![...photos.children].some(node => node.dataset.photo === photo.id)) {
          const node = document.createElement('div'); node.dataset.photo = photo.id
          const image = document.createElement('img'); image.src = photo.cover; image.alt = photo.caption
          const button = document.createElement('button'); button.type = 'button'; button.dataset.remove = photo.id; button.textContent = '×'; button.setAttribute('aria-label', `${photo.caption} — зураг хасах`)
          node.append(image, button); photos.append(node)
        }
      }
      const add = required('.add-room', this.root); add.disabled = rooms.length >= 6 || this.busy
      required('.message', this.root).textContent = this.message.get()
    })
  }
}
