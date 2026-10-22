import { HamtryElement, emit, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import css from './entrance.css?inline'

const sheet = new CSSStyleSheet()
sheet.replaceSync(css)

export class HamtryEntrance extends HamtryElement {
  screen = signal('door')
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `<div class="entrance" data-screen="door">
      <section class="threshold" aria-labelledby="entrance-title">
        <header><a class="brand" href="#home" aria-label="Хамт нүүр"><i aria-hidden="true"></i>Хамт</a><span class="tagline">ХАМТ АМЬДРАХ ХҮНЭЭ ОЛ.</span></header>
        <div class="composition"><div class="copy"><p class="invitation">ТАНЫ ДАРААГИЙН ОРОН ЗАЙ</p><h1 id="entrance-title">Хаалгаа нээ.<br><em>Хүнээ ол.</em></h1><p class="description">Зүгээр нэг өрөө биш. Таны хэмнэлд тохирох хүн, тухтай орон зай.</p></div><hamtry-door></hamtry-door></div>
        <div class="threshold-footer"><span>Улаанбаатар</span><span>Дотогш аялъя</span></div>
      </section>
      <section class="inside" aria-labelledby="inside-title" hidden inert>
        <header><button class="brand return" type="button" aria-label="Хаалга руу буцах"><i aria-hidden="true"></i>Хамт</button><button class="light" type="button" aria-pressed="false">Гэрэл асаах</button></header>
        <div class="inside-content"><p class="welcome">Тавтай морил.</p><h2 id="inside-title" tabindex="-1">Эндээс эхэлнэ.<br><em>Таны орон зай.</em></h2>
          <nav class="destinations" aria-label="Орон зайгаа олох"><a href="#rooms"><span><strong>Өрөөгөө олох</strong><small>Тухтай амьдрах дараагийн газар.</small></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a><a href="#roommates"><span><strong>Хүнээ олох</strong><small>Тантай нэг хэмнэлтэй хамтрагч.</small></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a></nav>
          <div class="other-paths"><a href="/explore.html#city/home">Хот дундуур аялах <span aria-hidden="true">↗</span></a><hamtry-button class="publish" variant="ghost">Өрөө санал болгох</hamtry-button></div>
        </div><p class="inside-note">Хичээлийн туршилтын хувилбар · Жишээ зарууд</p>
      </section><div class="blackout" aria-hidden="true"></div>
    </div>`
  }
  setup() {
    const $ = selector => required(selector, this.root)
    const door = $('hamtry-door')
    listen(door, 'hamtry-door-opening', () => $('.entrance').classList.add('opening'))
    listen(door, 'hamtry-door-open', () => {
      this.screen.set('inside')
      queueMicrotask(() => $('#inside-title').focus({ preventScroll:true }))
    })
    listen($('.return'), 'click', () => {
      this.screen.set('door'); door.reset()
      queueMicrotask(() => door.focus({ preventScroll:true }))
    })
    listen($('.light'), 'click', () => {
      const on = $('.inside').classList.toggle('lights-on')
      $('.light').setAttribute('aria-pressed', String(on))
      $('.light').textContent = on ? 'Гэрэл унтраах' : 'Гэрэл асаах'
    })
    listen($('.publish'), 'click', () => emit(this, 'hamtry-publish'))
    useEffect(() => {
      const inside = this.screen.get() === 'inside'
      $('.entrance').dataset.screen = this.screen.get()
      $('.threshold').hidden = inside; $('.threshold').inert = inside
      $('.inside').hidden = !inside; $('.inside').inert = !inside
      if (inside) $('.entrance').classList.remove('opening')
    })
    onCleanup(() => { $('.entrance').classList.remove('opening'); door.reset() })
  }
}
