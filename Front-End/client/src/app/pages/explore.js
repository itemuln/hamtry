import { HamtryElement, listen, onCleanup, required, signal, untrack, useEffect } from '@hamtry/library'
import { places, placeById, readExploreRoute } from '../data/places.js'
import { listings } from '../data/listings.js'
import { money } from '../state/model.js'
import { createAppState } from '../state/store.js'
import css from '../explore.css?inline'

const sheet = new CSSStyleSheet()
sheet.replaceSync(css)

// Page owns navigation and fixture data; the Three scene only draws and emits intent.
export class HamtryExplore extends HamtryElement {
  route = signal(readExploreRoute(location.hash))
  travel = signal(false)
  arrived = signal(null)
  night = signal(false)
  status = signal('loading')
  reduced = signal(matchMedia('(prefers-reduced-motion: reduce)').matches)
  quality = signal('auto')
  app = createAppState()
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `
      <a class="skip" href="#controls">Удирдлага руу очих</a>
      <div class="world-shell">
        <header class="world-header"><a class="wordmark" href="/" aria-label="Hamtry нүүр">hamtry<span>.</span><small>explore</small></a>
          <nav aria-label="Ертөнцийн цэс"><a class="current" href="/explore.html" aria-current="page">Хот доторх таны булан</a><a href="/#rooms">Бүх өрөө</a></nav>
          <hamtry-button class="settings" variant="outline" size="sm">Тохиргоо</hamtry-button>
        </header>
        <main>
          <section class="world" aria-labelledby="world-title">
            <div class="scene-surface"><canvas aria-hidden="true"></canvas><div class="markers" aria-label="Сцен доторх газрууд"></div></div>
            <div class="world-copy"><h1 id="world-title">Хот доторх<br>таны <em>булан.</em></h1><p class="intro">Яарах хэрэггүй. Нэг газар сонгоод,<br>шинэ орон зайгаа нээгээрэй.</p><span class="scene-note">Улаанбаатар · Уран сэтгэмжит зохиомж</span></div>
            <div class="world-toolbar"><button class="back" type="button" hidden>Хот руу буцах</button><button class="light" type="button" aria-pressed="false">Оройн гэрэл</button><button class="reset-view" type="button">Харагдац сэргээх</button><button class="retry-scene" type="button" hidden>3D дахин ачаалах</button></div>
            <div class="loading" role="status">Таны жижиг ертөнцийг бэлдэж байна…</div>
            <div class="scene-feedback" role="status" aria-live="polite"></div>
            <div class="journey" hidden><span class="journey-dot"></span><div><strong></strong><small>Замын турш өөр сонголт хийж болно</small></div><hamtry-button class="skip-trip" variant="outline" size="sm">Шууд очих</hamtry-button></div>
            <div class="destination"><h2 class="destination-name"></h2><p class="destination-kind"></p><p class="destination-description"></p><div class="destination-footer"><span class="trip-hint">Таны дараагийн зогсоол</span><hamtry-button class="go">Энд очъё</hamtry-button></div></div>
            <div class="scene-caption"><span class="caption-dot"></span><span class="interaction-hint">Барилга дээр дарж сонго · Чирж харах өнцгөө өөрчил</span></div>
          </section>
          <section class="control-deck" id="controls" tabindex="-1" aria-label="Газар ба тавилга сонгох"><div class="deck-title"><span class="deck-label">ХААШАА ОЧИХ ВЭ?</span><span class="deck-counter">3 газар</span></div>
            <div class="places" role="group" aria-label="Очих газар">${places.map(place => `<button type="button" class="place" data-place="${place.id}" aria-pressed="false"><span><strong>${place.name}</strong><small>${place.kind}</small></span></button>`).join('')}</div>
            <div class="furniture" role="group" aria-label="Тавилгын үйлдлүүд" hidden></div>
          </section>
        </main>
        <footer><span>Өөрийн орон зай. Хамтын амьдрал.</span><a href="/components.html">Манай компонентууд</a><span>Туршилтын ертөнц · Жишээ зарууд</span></footer>
      </div>
      <hamtry-dialog class="content-dialog" heading=""><div class="content"></div></hamtry-dialog>
      <hamtry-dialog class="settings-dialog" heading="Таны аялах хэмнэл"><p>Тав тухтай харагдацаа сонгоорой.</p><hamtry-switch class="motion" label="Хөдөлгөөн багасгах"></hamtry-switch><hamtry-select class="quality" label="Дүрслэлийн чанар"><option value="auto">Автомат</option><option value="low">Хөнгөн · бага нягтаршил</option><option value="high">Өндөр · илүү тод</option></hamtry-select><p class="settings-note">Хөдөлгөөн багасгавал аяллын анимацыг алгасана. Ертөнц хөдөлгөөнгүй үед дахин зурдаггүй.</p><hamtry-button class="settings-done">Бэлэн</hamtry-button></hamtry-dialog>`
  }
  setup() {
    const $ = selector => required(selector, this.root)
    let active = true, scene, scenePending = false, inView = false
    // Салсан WebGL canvas-ийг дахин ашиглахгүй; reconnect шинэ context авна.
    const oldCanvas = $('canvas'), canvas = oldCanvas.cloneNode(false)
    oldCanvas.replaceWith(canvas)
    this.status.set('loading'); this.travel.set(false)
    const feedback = message => { $('.scene-feedback').textContent = message }
    const navigate = (mode, place = this.route.get().place) => {
      this.travel.set(false)
      location.hash = `${mode}/${place}`
    }
    const selectPlace = id => {
      if (this.route.get().mode !== 'city') return
      scene?.cancelTravel(); this.travel.set(false); this.arrived.set(null)
      location.hash = `city/${id}`
    }
    const finishTrip = id => {
      this.travel.set(false); this.arrived.set(id)
      feedback(`${placeById(id).name}-д ирлээ. Хаалгаар ороорой.`)
      queueMicrotask(() => { if (active) $('.go').focus() })
    }
    const go = () => {
      const { place } = this.route.get()
      if (this.route.get().mode === 'inside' || this.travel.get()) return
      if (this.arrived.get() === place || this.status.get() === 'fallback' || !scene || this.reduced.get()) { navigate('inside'); return }
      this.travel.set(true)
      feedback(`${placeById(place).name} руу явж байна.`)
      scene.travelTo(place, () => finishTrip(place))
    }
    const interact = action => {
      if (action.startsWith('place:')) { selectPlace(action.slice(6)); return }
      if (action === 'door') { this.route.get().mode === 'inside' ? navigate('city') : go(); return }
      if (action === 'lamp') { this.night.set(value => !value); return }
      this.showContent(action)
    }
    onCleanup(() => { active = false; scene?.dispose(); this.scene = undefined })
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      scene?.resize(width, height)
    }
    const load = async () => {
      if (scene || scenePending) return
      scenePending = true
      try {
        const { createExploreScene } = await import('../components/explore-scene.js')
        if (!active) return
        scene = createExploreScene(canvas, $('.markers'), interact)
        this.scene = scene; resize(); scene.setVisible(inView && !document.hidden); this.status.set('ready')
      } catch (error) {
        scene?.dispose(); scene = undefined
        if (active) { this.status.set('fallback'); feedback('3D дүрслэл нээгдсэнгүй. Доорх товчоор газар, тавилгаа сонгоорой.'); console.warn('Hamtry Explore:', error) }
      } finally { scenePending = false }
    }
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting
      scene?.setVisible(inView && !document.hidden)
      if (inView) void load()
    })
    observer.observe(this); onCleanup(() => observer.disconnect())
    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(canvas); onCleanup(() => sizeObserver.disconnect())
    listen(document, 'visibilitychange', () => scene?.setVisible(inView && !document.hidden))
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    listen(preference, 'change', event => this.reduced.set(event.matches))
    listen(window, 'hashchange', () => {
      const next = readExploreRoute(location.hash), modeChanged = next.mode !== this.route.get().mode
      scene?.cancelTravel(); this.travel.set(false); this.route.set(next)
      feedback(next.mode === 'inside' ? 'Тавилга дээр дарж орон зайгаа нээгээрэй.' : '')
      if (modeChanged) queueMicrotask(() => { if (active) $(next.mode === 'inside' ? '.back' : '.go').focus() })
    })
    listen(window, 'storage', () => { const updated = createAppState(); this.app.saved.set(updated.saved.get()); this.app.published.set(updated.published.get()); this.app.role.set(updated.role.get()) })
    listen(canvas, 'webglcontextlost', event => {
      event.preventDefault(); scene?.cancelTravel(); this.travel.set(false); this.status.set('fallback')
      feedback('3D дүрслэл түр зогслоо. Доорх удирдлагаар үргэлжлүүлээрэй.')
    })
    listen($('.go'), 'click', go)
    listen($('.skip'), 'click', event => { event.preventDefault(); $('#controls').focus() })
    listen($('.back'), 'click', () => navigate('city'))
    listen($('.light'), 'click', () => this.night.set(value => !value))
    listen($('.reset-view'), 'click', () => scene?.resetView())
    listen($('.retry-scene'), 'click', () => location.reload())
    listen($('.skip-trip'), 'click', () => { const id = this.route.get().place; scene?.finishTravel(); if (this.travel.get()) finishTrip(id) })
    listen($('.places'), 'click', event => { const button = event.target.closest('[data-place]'); if (button) selectPlace(button.dataset.place) })
    listen($('.furniture'), 'click', event => { const button = event.composedPath().find(node => node.dataset?.action); if (button) interact(button.dataset.action) })
    listen($('.settings'), 'click', () => $('.settings-dialog').showModal())
    listen($('.settings-done'), 'click', () => $('.settings-dialog').close())
    listen($('.motion'), 'change', () => this.reduced.set($('.motion').checked))
    listen($('.quality'), 'change', () => this.quality.set($('.quality').value))
    listen(this.root, 'keydown', event => {
      if (event.key === 'Escape' && !$('.content-dialog').open && !$('.settings-dialog').open) {
        if (this.travel.get()) { scene?.cancelTravel(); this.travel.set(false); feedback('Аяллыг зогсоолоо.') }
        else if (this.route.get().mode === 'inside') navigate('city')
      }
    })
    let renderedPlace
    useEffect(() => {
      const route = this.route.get(), place = placeById(route.place), inside = route.mode === 'inside', travelling = this.travel.get()
      const state = this.status.get(), night = this.night.get(), reduced = this.reduced.get(), quality = this.quality.get()
      this.dataset.sceneState = state; this.dataset.mode = route.mode; this.dataset.night = String(night)
      canvas.hidden = state !== 'ready'
      $('.markers').hidden = state !== 'ready'
      $('.retry-scene').hidden = state !== 'fallback'
      $('.loading').hidden = state !== 'loading'
      $('.world-copy').hidden = inside
      $('.back').hidden = !inside
      $('.light').textContent = night ? 'Өдрийн гэрэл' : 'Оройн гэрэл'
      $('.light').setAttribute('aria-pressed', String(night))
      $('.destination-kind').textContent = inside ? 'ТА ИРЛЭЭ · ДОТОРХ ОРОН ЗАЙ' : place.kind
      $('.destination-name').textContent = place.name
      $('.destination-description').textContent = inside ? place.detail : place.description
      $('.destination-footer').hidden = inside
      $('.go').disabled = travelling || state === 'loading'
      $('.go').textContent = state === 'loading' ? 'Бэлдэж байна…' : this.arrived.get() === place.id ? 'Хаалгаар орох' : state === 'fallback' ? 'Орон зай нээх' : 'Энд очъё'
      $('.journey').hidden = !travelling
      $('.journey strong').textContent = `${place.name} руу…`
      $('.places').hidden = inside; $('.furniture').hidden = !inside
      $('.deck-label').textContent = inside ? 'ЭНД БҮХ ЗҮЙЛ ӨӨРИЙН ҮҮРЭГТЭЙ' : 'ХААШАА ОЧИХ ВЭ?'
      $('.deck-counter').textContent = inside ? 'ТАВИЛГА = УДИРДЛАГА' : '3 газар'
      $('.interaction-hint').textContent = inside ? 'Тавилга дээр дарж нээ · Хаалга нь хот руу буцаана' : 'Барилга дээр дарж сонго · Чирж харах өнцгөө өөрчил'
      for (const button of this.root.querySelectorAll('[data-place]')) button.setAttribute('aria-pressed', String(button.dataset.place === place.id))
      if (renderedPlace !== place.id) {
        $('.furniture').innerHTML = [...place.actions, ['lamp', 'Гэрэл · Өдөр / орой'], ['door', 'Хаалга · Хот руу']].map(([action, name]) => `<hamtry-button variant="outline" data-action="${action}">${name}</hamtry-button>`).join('')
        renderedPlace = place.id
      }
      untrack(() => { $('.motion').checked = reduced; $('.quality').value = quality })
      scene?.update({ mode: route.mode, place: place.id, night, reduced, quality })
    })
    useEffect(() => {
      const saved = this.app.saved.get()
      for (const card of this.root.querySelectorAll('.content [data-id]')) card.saved = saved.includes(card.dataset.id)
    })
    listen($('.content'), 'hamtry-save', event => {
      const card = event.composedPath().find(node => node.dataset?.id)
      if (!card) return
      if (!this.app.toggleSaved(card.dataset.id)) feedback('Сонголт энэ удаа хадгалагдсангүй. Хөтөчийн хадгалах эрхийг шалгаарай.')
    })
  }
  showContent(action) {
    const dialog = required('.content-dialog', this.root), content = required('.content', this.root)
    content.replaceChildren()
    if (action === 'desk') {
      dialog.setAttribute('heading', 'Өөрийн өрөөг санал болгох')
      const paragraph = document.createElement('p')
      paragraph.textContent = 'Өрөөний байршил, зураг, түрээсээ бэлдээд Hamtry-ийн зарын хэсэгт урьдчилан хараарай. Зар зөвхөн энэ хөтөчид хадгалагдана.'
      const link = document.createElement('a'); link.className = 'content-link'; link.href = '/#dashboard'; link.textContent = 'Өрөөний зар бэлдэх →'
      // Provider сонголт нь өмнөх page-ийн browser-local dashboard-ийг нээнэ.
      link.addEventListener('click', event => { this.app.role.set('provider'); if (!this.app.persist()) { event.preventDefault(); paragraph.textContent = 'Сонголтоо хадгалж чадсангүй. Хөтөчийн хадгалах эрхийг шалгаад дахин оролдоорой.' } })
      content.append(paragraph, link)
    } else {
      const saved = action === 'shelf', roommates = action === 'menu'
      dialog.setAttribute('heading', saved ? 'Таны хадгалсан булангууд' : roommates ? 'Нэг шинэ танил' : 'Таны дараагийн орон зай')
      const note = document.createElement('p'); note.className = 'content-note'; note.textContent = 'Хичээлийн жишээ зарууд · Сонголт зөвхөн энэ хөтөчид хадгалагдана.'
      const grid = document.createElement('div'); grid.className = 'content-grid'
      const items = saved ? listings.filter(item => this.app.saved.get().includes(item.id)) : listings.filter(item => item.kind === (roommates ? 'roommates' : 'rooms'))
      for (const item of items) {
        const card = document.createElement(item.kind === 'rooms' ? 'hamtry-property-card' : 'hamtry-roommate-card')
        for (const [key, value] of Object.entries({ heading: item.title, image: item.image, 'image-alt': item.imageAlt, location: `${item.district} · ${item.area}`, price: `${money(item.price)} / сар`, description: item.size })) card.setAttribute(key, value)
        card.dataset.id = item.id; card.saved = this.app.saved.get().includes(item.id)
        const link = document.createElement('a'); link.className = 'content-link'; link.href = `/#listing/${item.id}`; link.textContent = 'Дэлгэрэнгүй үзэх →'
        card.append(link); grid.append(card)
      }
      if (!items.length) { const empty = document.createElement('p'); empty.textContent = 'Тавиур тань одоохондоо хоосон. Өрөө эсвэл хамтрагчийн зүрхэн товчоор сонголтоо хадгалаарай.'; grid.append(empty) }
      if (saved && this.app.published.get().some(item => this.app.saved.get().includes(item.id))) { const link = document.createElement('a'); link.className = 'content-link'; link.href = '/#saved'; link.textContent = 'Өөрийн заруудтай бүх хадгалсан сонголт →'; grid.append(link) }
      content.append(note, grid)
    }
    dialog.showModal()
  }
}
