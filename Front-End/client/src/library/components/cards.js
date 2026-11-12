import {
  HamtryElement,
  emit,
  listen,
  required,
  useEffect,
} from '../core/index.js'
import { style } from './styles.js'
export class HamtryRoommateCard extends HamtryElement {
  // Өгөгдлийг хуудас өгнө. Сан дотор API хүсэлт эсвэл зарын өгөгдөл хадгалахгүй.
  static observedAttributes = [
    'heading',
    'image',
    'image-alt',
    'location',
    'price',
    'description',
    'saved',
    'compact-preview',
  ]
  property = false
  get saved() {
    return this.hasAttribute('saved')
  }
  set saved(value) {
    this.toggleAttribute('saved', value)
  }
  render() {
    style(this.root)
    this.root.innerHTML = `<article class="ht-listing ${this.property ? 'ht-property' : ''}" part="card"><div class="ht-listing-image" part="media"><img part="image"><button class="ht-save" type="button"></button></div><div class="ht-listing-content" part="content"><h3 part="summary"><slot name="heading"><span class="heading-fallback"></span></slot></h3><p class="location" part="summary"></p><strong class="ht-budget" part="summary"></strong><div class="ht-card-peek" part="peek"><div class="ht-card-peek-inner"><p class="description" part="summary"></p><slot></slot></div></div></div></article>`
  }

  setup() {
    const card = required('article', this.root)
    const image = required('img', card)
    const button = required('button', card)
    useEffect(() => {
      this.attributesChanged.get()
      const source = this.getAttribute('image')
      if (source) image.src = source
      else image.removeAttribute('src')
      image.hidden = !source
      image.alt = this.getAttribute('image-alt') || ''
      image.loading = 'lazy'
      // Хэрэглэгчийн текстийг HTML болгон тайлбарлуулахгүйгээр оруулна.
      required('.heading-fallback', card).textContent = this.getAttribute('heading') || ''
      required('.location', card).textContent =
        this.getAttribute('location') || ''
      required('strong', card).textContent =
        this.getAttribute('price') || ''
      required('.description', card).textContent =
        this.getAttribute('description') || ''
      button.textContent = this.saved ? '♥' : '♡'
      button.setAttribute('aria-pressed', String(this.saved))
      button.setAttribute(
        'aria-label',
        `${this.getAttribute('heading') || 'Зар'} — ${this.saved ? 'Хадгалснаас хасах' : 'Хадгалах'}`,
      )
    })
    listen(button, 'click', () => {
      this.saved = !this.saved
      // Backend-д хадгалах эсэхийг хуудас энэ event-ийг сонсоод шийднэ.
      emit(this, 'hamtry-save', { saved: this.saved })
    })
  }
}
export class HamtryPropertyCard extends HamtryRoommateCard {
  property = true
}
