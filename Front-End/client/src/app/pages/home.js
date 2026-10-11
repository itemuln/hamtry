import { Scope, $, listen, onCleanup, required, untrack, useEffect } from '@hamtry/library'
import { districts, listings, roomImage } from '../data/listings.js'
import { findListings, initialFilters, money, readRoute, validLocation } from '../state/model.js'
import { createAppState } from '../state/store.js'
import { savePhotos, deletePhotos } from '../state/media-store.js'

const districtOptions = '<option value="all">Бүх дүүрэг</option>' + districts.map(name => `<option>${name}</option>`).join('')
const budgets = '<option value="0">Төсөв сонгох</option><option value="700000">700,000 ₮ хүртэл</option><option value="1000000">1,000,000 ₮ хүртэл</option><option value="1500000">1,500,000 ₮ хүртэл</option>'
const text = (root, selector, value) => { required(selector, root).textContent = value }

// Page нь light DOM: layout/SEO нь хуудасных, дахин ашиглах controls нь Shadow DOM-той.
export class HamtryHome extends HTMLElement {
  state = createAppState()
  cards = new Map()
  previousPage = 'home'
  connectedCallback() {
    if (this.scope) return
    if (!this.rendered) { this.render(); this.rendered = true }
    this.scope = new Scope()
    this.scope.run(() => this.setup())
  }
  disconnectedCallback() { this.scope?.dispose(); this.scope = undefined }
  render() {
    this.innerHTML = `
      <a class="skip-link" href="#main-content">Үндсэн агуулга руу очих</a>
      <header class="site-header">
        <a class="wordmark" href="#home" aria-label="Hamtry нүүр"><span class="brand-mark" aria-hidden="true">h.</span>hamtry<span class="brand-period">.</span></a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Цэс нээх">☰</button>
        <nav id="main-nav" aria-label="Үндсэн цэс"><a href="/explore.html">3D ертөнц</a><a href="#map" data-nav="map">Газрын зураг</a><a href="#rooms" data-nav="rooms">Өрөөнүүд</a><a href="#roommates" data-nav="roommates">Хамтрагчид</a><a href="#saved" data-nav="saved">Хадгалсан <span class="saved-count">0</span></a><a href="#dashboard" data-nav="dashboard" class="dashboard-link" hidden>Миний зарууд</a></nav>
        <button type="button" class="profile-button" data-action="profile"><span aria-hidden="true">◎</span> Миний орон зай</button>
      </header>
      <main id="main-content">
        <section class="home-hero" aria-labelledby="hero-title">
          <div class="hero-inner"><div class="hero-copy">
            <h1 id="hero-title">Нэг орон зай.<br><span>Шинэ эхлэл.</span></h1>
            <p class="hero-description">Байршлаа сонго. Өрөөнүүдийн зургаар танилц. Өөрт тохирох орон зай, хамтрагчаа ол.</p>
            <a class="hero-link" href="#map">Газрын зургаас харах<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg></a>
          </div><hamtry-hero-scene id="hero-room" minimal></hamtry-hero-scene></div>
          <div class="search-wrap icon-search"><div class="search-kind" role="group" aria-label="Хайх төрөл"><button type="button" data-kind="rooms" data-direct-rooms><svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 27V6h22v21M3 27h26M9 21v-8h14v8M9 17h14M9 21v3M23 21v3"/><path d="M12 13v4M20 13v4"/></svg><span>Өрөөнүүдийг үзэх</span></button><button type="button" data-kind="roommates" data-reveal-roommates aria-controls="roommate-search" aria-expanded="false"><svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="10" r="5"/><path d="M6 27v-3a10 10 0 0 1 20 0v3M11 27v-5M21 27v-5"/></svg><span>Хамтрагч хайх</span></button></div><form id="roommate-search" class="hero-search" data-roommate-search hidden><hamtry-select name="district" label="Байршил">${districtOptions}</hamtry-select><hamtry-select name="maxPrice" label="Сарын төсөв">${budgets}</hamtry-select><hamtry-button type="submit" size="lg">Хамтрагч хайх</hamtry-button></form></div>
        </section>
        <section class="experience-intro page-width intro-door" aria-labelledby="experience-title"><div class="intro-heading"><h2 id="experience-title">Хаалганы цаана<br>өөрийн орон зай.</h2><p>Хот дундуур машинаар явж газраа сонго. Хаалгаар нь ор. Буйдангаас өрөөнүүдээ, кафены цэснээс хамтрагчаа нээ.</p><a class="intro-action" href="/explore.html#city/home">Хотыг тойрох <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div><div class="intro-room"><a class="intro-doorway" href="/explore.html#inside/home" aria-label="3D өрөөнд орох"><span class="intro-door-panel"><span class="intro-door-label">Ороорой</span></span></a><button class="intro-lamp" type="button" data-intro-lamp aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m20 9-9 25h42L44 9ZM32 34v20M19 54h26M46 34v10"/><circle cx="46" cy="47" r="3"/></svg><span class="lamp-label">Гэрэл унтраах</span></button><span class="intro-room-note">Хаалга дээр дарж 3D өрөөнд орно.</span></div></section>
<section class="listing-section page-width" id="results" aria-labelledby="results-title">
              <div class="section-heading"><div><h2 id="results-title">Тухтай булангаа олоорой<span class="heading-dot">.</span></h2></div><a class="all-listings" href="#map">Газрын зургаар үзэх <span aria-hidden="true">↗</span></a><hamtry-button class="new-listing" data-action="publish" hidden>Өрөө нэмэх +</hamtry-button></div>
              <div class="browse-types" role="group" aria-label="Зарын төрөл"><button type="button" data-kind="rooms">Өрөөнүүд</button><button type="button" data-kind="roommates">Хамтрагчид</button></div>
              <form class="filter-bar" aria-label="Зарын шүүлтүүр"><hamtry-input name="query" label="Түлхүүр үг" placeholder="Байршил, хэв маяг…"></hamtry-input><hamtry-select name="district" label="Дүүрэг">${districtOptions}</hamtry-select><hamtry-select name="maxPrice" label="Төсөв">${budgets}</hamtry-select><hamtry-chip class="pet-filter">Амьтан зөвшөөрнө</hamtry-chip><button class="text-button reset-filters" type="button">Цэвэрлэх</button><button class="filter-submit" type="submit">Шүүх</button></form>
              <div class="results-meta"><p class="result-count" role="status" aria-live="polite"></p><span>Жишээ цэгүүд + энэ хөтөчийн зарууд</span></div>
              <div class="browse-layout"><hamtry-apartment-map class="browse-map" hidden></hamtry-apartment-map><div class="listing-results"><div class="listing-grid"></div>
              <div class="empty-state" hidden><span aria-hidden="true">⌂</span><h3></h3><p></p><hamtry-button class="empty-action">Шүүлтүүр цэвэрлэх</hamtry-button></div></div></div>
            </section>
        <section class="provider-section page-width"><div><h2>Өрөөгөө танилцуул.</h2><p>Газрын зурагт цэг тавиад, утасныхаа зургуудыг өрөө бүрээр нэмээрэй.</p></div><hamtry-button data-action="publish" size="lg">Өрөө нэмэх ↗</hamtry-button></section>
      </main>
      <footer class="page-width"><a class="wordmark" href="#home">hamtry.</a><div><a href="/components.html">Компонентууд</a><a href="/editor.html">Дизайн систем</a></div><small>Хичээлийн туршилтын хувилбар · Бодит захиалга, төлбөр, хэрэглэгчийн бүртгэлгүй.</small></footer>
      <div class="toast" role="status" aria-live="polite" hidden></div>
      <hamtry-dialog class="detail-dialog" heading="Зарын дэлгэрэнгүй"><div class="detail-content"></div></hamtry-dialog>
      <hamtry-dialog class="profile-dialog" heading="Миний орон зай"><p>Та өнөөдөр юу хийхийг хүсэж байна?</p><div class="role-choices"><button type="button" data-role="seeker"><span>⌕</span><strong>Өрөө, хамтрагч хайх</strong><small>Сонголтоо хайж, хадгалах</small></button><button type="button" data-role="provider"><span>⌂</span><strong>Өрөө санал болгох</strong><small>Өрөөний мэдээллээ бэлдэх</small></button></div><p class="demo-note">Энэ бол жишээ горим. Сонголт зөвхөн энэ хөтөч дээр хадгалагдана; нэвтэрсэн бүртгэл үүсэхгүй.</p></hamtry-dialog>
      <hamtry-dialog class="publish-dialog" heading="Өрөөгөө санал болгох"><p class="demo-note">Зар ба зургууд зөвхөн энэ хөтөчид хадгалагдана. Бусад хэрэглэгчид хараахан харагдахгүй.</p><form class="publish-form"><hamtry-input name="title" label="Зарын гарчиг" required maxlength="100" placeholder="Жишээ: Гэрэлтэй хувийн өрөө"></hamtry-input><hamtry-select name="district" label="Дүүрэг" required>${districts.map(name => `<option>${name}</option>`).join('')}</hamtry-select><hamtry-input name="price" type="number" label="Сарын түрээс (₮)" required min="1" max="100000000" step="1" placeholder="750000"></hamtry-input><fieldset class="location-fields"><legend>Байрны байршил</legend><p>Газрын зураг дээр дарж цэгээ сонгоно уу. Эсвэл координатаа оруулж болно.</p><hamtry-apartment-map pick-location></hamtry-apartment-map><div class="coordinates"><hamtry-input name="latitude" type="number" label="Өргөрөг" required min="-85" max="85" step="any" placeholder="47.918"></hamtry-input><hamtry-input name="longitude" type="number" label="Уртраг" required min="-180" max="180" step="any" placeholder="106.917"></hamtry-input></div></fieldset><hamtry-room-editor></hamtry-room-editor><hamtry-textarea name="description" label="Өрөө ба хамтын амьдралын нөхцөл" required maxlength="1500" placeholder="Өрөө, хамтын хэсэг, нүүх хугацаа, хэрэглээний зардлын талаар…"></hamtry-textarea><hamtry-button type="submit">Урьдчилан харах ↗</hamtry-button></form><div class="publish-preview" hidden><div class="preview-copy"></div><div class="dialog-actions"><hamtry-button variant="secondary" class="edit-draft">Засах</hamtry-button><hamtry-button class="confirm-publish">Энэ хөтөчид хадгалах</hamtry-button></div></div></hamtry-dialog>`
  }
  setup() {
    const { state } = this
    let toastTimer, draft, draftRecords = [], saving = false, active = true, lastIds = null, detailId
    const detail = required('.detail-dialog', this), profile = required('.profile-dialog', this), publish = required('.publish-dialog', this)
    const toast = message => {
      clearTimeout(toastTimer)
      const node = required('.toast', this); node.textContent = message; node.hidden = false
      toastTimer = setTimeout(() => { node.hidden = true }, 3500)
    }
    onCleanup(() => { active = false; clearTimeout(toastTimer); detail.close(); profile.close(); publish.close() })
    const save = id => {
      const persisted = state.toggleSaved(id)
      toast(persisted ? state.saved.get().includes(id) ? 'Сонголт хадгалагдлаа ♥' : 'Хадгалсан сонголтоос хаслаа' : 'Энэ удаа хөтөч дээр хадгалж чадсангүй. Сонголт түр хадгалагдсан.')
    }
    this.saveListing = save
    onCleanup(() => { this.saveListing = undefined })
    listen(required('.skip-link', this), 'click', event => {
      event.preventDefault()
      const heading = $('.experience-intro h2', this).find(node => node.getClientRects().length) || required('#results-title', this)
      heading.tabIndex = -1; heading.focus(); heading.scrollIntoView()
    })
    const showPublish = () => {
      if (saving) return
      required('.publish-form', this).hidden = false; required('.publish-preview', this).hidden = true
      publish.showModal()
    }
    for (const node of $('[data-action]', this)) listen(node, 'click', () => node.dataset.action === 'profile' ? profile.showModal() : showPublish())
    // Танилцуулгын чийдэн зөвхөн өөрийн хэсгийн гэрлийг солино.
    listen(this, 'click', event => {
      const lamp = event.target.closest('[data-intro-lamp]')
      if (!lamp) return
      const dark = lamp.closest('.experience-intro').toggleAttribute('data-lights-off')
      lamp.setAttribute('aria-pressed', String(dark))
      required('.lamp-label', lamp).textContent = dark ? 'Гэрэл асаах' : 'Гэрэл унтраах'
    })
    const menu = required('.menu-toggle', this)
    const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); this.classList.remove('menu-open') }
    listen(menu, 'click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); this.classList.toggle('menu-open', open) })
    listen(this, 'keydown', event => { if (event.key === 'Escape' && this.classList.contains('menu-open')) { closeMenu(); menu.focus() } })
    listen(required('#main-nav', this), 'click', closeMenu)
    listen(window, 'hashchange', () => {
      const route = readRoute(location.hash)
      const previous = state.route.get()
      state.route.set(route)
      if (route.page !== 'detail' && previous.page !== 'detail') {
        window.scrollTo({ top: 0, behavior: 'instant' })
        // Page солиход keyboard хэрэглэгч шинэ гарчигт очно; modal хаахад native focus return үлдэнэ.
        queueMicrotask(() => {
          if (!this.isConnected) return
          const heading = required(route.page === 'home' ? '#hero-title' : '#results-title', this)
          heading.tabIndex = -1; heading.focus({ preventScroll: true })
        })
      }
    })
    for (const button of $('[data-kind]', this)) listen(button, 'click', () => {
      state.kind.set(button.dataset.kind)
      if (button.hasAttribute('data-direct-rooms')) { state.filters.set({ ...initialFilters }); location.hash = 'rooms' }
      else if (!button.closest('.search-kind')) location.hash = button.dataset.kind
    })
    // Hero form-ийн submit-ийг parent дээр сонсоно: native form ба preview-үүд ижил урсгалтай.
    listen(this, 'submit', event => {
      if (!event.target.matches('.hero-search')) return
      event.preventDefault()
      const data = new FormData(event.target)
      state.filters.set({ ...initialFilters, district: data.get('district'), maxPrice: Number(data.get('maxPrice')) })
      location.hash = state.kind.get() === 'rooms' ? 'map' : 'roommates'
    })
    const filters = required('.filter-bar', this)
    const applyFilters = () => {
      const data = new FormData(filters)
      state.filters.set({ district: data.get('district'), maxPrice: Number(data.get('maxPrice')), query: String(data.get('query') || ''), pets: required('.pet-filter', this).selected })
    }
    listen(filters, 'submit', event => { event.preventDefault(); applyFilters() })
    listen(filters, 'change', applyFilters)
    // input нь shadow хилээр composed байдлаар гарна; DOM дахин үүсгэхгүй тул focus үлдэнэ.
    listen(required('[name="query"]', filters), 'input', applyFilters)
    listen(required('.pet-filter', this), 'hamtry-toggle', applyFilters)
    listen(required('.reset-filters', this), 'click', () => state.filters.set({ ...initialFilters }))
    listen(required('.empty-action', this), 'click', () => {
      if (state.route.get().page === 'dashboard') showPublish()
      else if (state.route.get().page === 'saved') location.hash = 'rooms'
      else state.filters.set({ ...initialFilters })
    })
    for (const button of $('[data-role]', this)) listen(button, 'click', () => {
      state.role.set(button.dataset.role); const persisted = state.persist(); profile.close()
      if (button.dataset.role === 'provider') location.hash = 'dashboard'
      toast(persisted ? 'Сонголт шинэчлэгдлээ' : 'Хөтөч дээр хадгалж чадсангүй')
    })
    listen(detail, 'hamtry-dialog-close', () => {
      if (state.route.get().page === 'detail') location.hash = this.previousPage
    })
    const roomEditor = required('hamtry-room-editor', this)
    const picker = required('[pick-location]', this)
    const publishForm = required('.publish-form', this)
    const latitude = required('[name="latitude"]', publishForm), longitude = required('[name="longitude"]', publishForm)
    listen(picker, 'hamtry-location-pick', event => {
      const [lng, lat] = event.detail.location
      latitude.value = lat.toFixed(6); longitude.value = lng.toFixed(6)
    })
    const syncPoint = () => {
      const point = [Number(longitude.value), Number(latitude.value)]
      picker.location = latitude.value && longitude.value && validLocation(point) ? point : null
    }
    listen(latitude, 'change', syncPoint); listen(longitude, 'change', syncPoint)
    listen(required('.browse-map', this), 'hamtry-map-select', event => { location.hash = `listing/${event.detail.id}` })
    listen(publishForm, 'submit', event => {
      event.preventDefault()
      if (saving || !roomEditor.validate()) return
      const data = new FormData(event.target)
      const point = [Number(data.get('longitude')), Number(data.get('latitude'))]
      if (!data.get('longitude') || !data.get('latitude') || !validLocation(point)) { toast('Газрын зураг дээр байршлаа сонгоно уу.'); return }
      draft = { id: `local-${crypto.randomUUID()}`, title: String(data.get('title')).trim(), district: String(data.get('district')), price: Number(data.get('price')), description: String(data.get('description')).trim(), location: point, cover: roomEditor.cover, rooms: roomEditor.value }
      if (!draft.title || !draft.description) { toast('Гарчиг болон тайлбараа бөглөнө үү.'); return }
      draftRecords = roomEditor.records
      this.renderDetail(required('.preview-copy', this), this.toListing(draft), false, draftRecords)
      event.target.hidden = true; required('.publish-preview', this).hidden = false
      required('hamtry-photo-tour', required('.preview-copy', this)).focus()
    })
    listen(required('.edit-draft', this), 'click', () => { showPublish(); required('[name="title"]', this).focus() })
    listen(required('.confirm-publish', this), 'click', async () => {
      if (!draft || saving) return
      if (state.published.get().length >= 20) { toast('Туршилтын 20 зарын хязгаарт хүрсэн байна.'); return }
      const record = draft, photos = draftRecords, previous = state.published.get(), previousRole = state.role.get()
      const confirm = required('.confirm-publish', this), edit = required('.edit-draft', this)
      saving = true; confirm.disabled = true; edit.disabled = true; confirm.textContent = 'Хадгалж байна…'
      try {
        // Эхлээд зураг, дараа нь metadata. Хадгалалт бүтэлгүйтвэл зар нэмэгдсэн гэж харуулахгүй.
        await savePhotos(photos)
        if (!active) { await deletePhotos(photos.map(photo => photo.id)); return }
        state.published.set([record, ...previous]); state.role.set('provider')
        if (!state.persist()) {
          state.published.set(previous); state.role.set(previousRole)
          await deletePhotos(photos.map(photo => photo.id))
          throw new Error('Хөтөчийн хадгалалт дүүрсэн байна. Зар хадгалагдсангүй.')
        }
        draft = undefined; draftRecords = []
        publish.close(); publishForm.reset(); roomEditor.reset(); picker.location = null
        state.filters.set({ ...initialFilters })
        const map = required('.browse-map', this); map.selectedId = record.id
        location.hash = 'map'
        queueMicrotask(() => map.controller?.fit([...listings, record].filter(item => validLocation(item.location))))
        toast('Зар ба өрөөний зургууд энэ хөтөчид хадгалагдлаа')
      } catch (error) { if (active) toast(error.message || 'Зураг хадгалж чадсангүй. Дахин оролдоно уу.') }
      finally { saving = false; confirm.disabled = false; edit.disabled = false; confirm.textContent = 'Энэ хөтөчид хадгалах' }
    })
    listen(required('.detail-content', this), 'click', event => { if (event.target.closest('.detail-save')) save(detailId) })
    useEffect(() => {
      const route = state.route.get()
      const page = route.page === 'detail' ? this.previousPage : route.page
      const kind = page === 'map' ? 'rooms' : page === 'rooms' || page === 'roommates' ? page : state.kind.get()
      const home = page === 'home', savedPage = page === 'saved', dashboard = page === 'dashboard'
      const heading = required('#results-title', this), tag = home ? 'H2' : 'H1'
      if (heading.tagName !== tag) {
        const next = document.createElement(tag); next.id = 'results-title'
        next.textContent = heading.textContent; next.tabIndex = -1; heading.replaceWith(next)
      }
      if (route.page !== 'detail') this.previousPage = route.page
      this.dataset.page = page
      required('.home-hero', this).hidden = !home
      required('.provider-section', this).hidden = !home
      const introductions = $('.experience-intro', this)
      for (const introduction of introductions) introduction.hidden = !home
      required('#results', this).hidden = home && introductions.length > 0
      filters.hidden = home || dashboard
      required('.browse-types', this).hidden = home || savedPage || dashboard || page === 'map'
      required('.browse-map', this).hidden = page !== 'map'
      required('.all-listings', this).hidden = !home
      required('.new-listing', this).hidden = !dashboard && page !== 'map'
      for (const node of $('[data-nav]', this)) {
        if (node.dataset.nav === page) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current')
      }
      text(this, '#results-title', page === 'map' ? 'Хаана амьдрах вэ?' : dashboard ? 'Миний өрөөнүүд.' : savedPage ? 'Таны хадгалсан сонголтууд.' : kind === 'roommates' ? 'Нэг хэмнэлтэй хүнээ олоорой.' : home ? 'Тухтай булангаа олоорой.' : 'Өөрийн өрөөг олоорой.')
      for (const node of $('[data-kind]', this)) node.setAttribute('aria-pressed', String(node.dataset.kind === kind))
      for (const form of $('[data-roommate-search]', this)) form.hidden = kind !== 'roommates'
      for (const button of $('[data-reveal-roommates]', this)) button.setAttribute('aria-expanded', String(kind === 'roommates'))
      const filter = state.filters.get(), saved = state.saved.get()
      // Control-ийн .value setter доторх getter-үүд page effect-ийн dependency болох ёсгүй.
      untrack(() => { for (const node of $('[name]', filters)) node.value = filter[node.getAttribute('name')] })
      required('.pet-filter', this).selected = filter.pets
      const all = [...state.published.get().map(item => this.toListing(item)), ...listings]
      const candidates = dashboard ? all.filter(item => item.id.startsWith('local-')) : findListings(all, home ? initialFilters : filter, savedPage ? null : kind, savedPage ? saved : null)
      const items = home ? candidates.slice(0, 3) : candidates
      required('.browse-map', this).listings = items.filter(item => validLocation(item.location))
      if (route.page === 'detail') required('.browse-map', this).selectedId = route.id
      text(this, '.result-count', `${items.length} ${savedPage ? 'хадгалсан сонголт' : dashboard ? 'туршилтын зар' : 'сонголт'}`)
      text(this, '.saved-count', saved.length)
      required('.dashboard-link', this).hidden = state.role.get() !== 'provider'
      for (const button of $('[data-role]', this)) button.setAttribute('aria-pressed', String(button.dataset.role === state.role.get()))
      const nodes = items.map(item => {
        if (!this.cards.has(item.id)) this.cards.set(item.id, this.makeCard(item))
        const card = this.cards.get(item.id); card.saved = saved.includes(item.id); return card
      })
      const ids = items.map(item => item.id).join(',')
      // Save хийхэд grid дахин зурахгүй: keyboard focus, component state хадгалагдана.
      if (ids !== lastIds) { required('.listing-grid', this).replaceChildren(...nodes); lastIds = ids }
      const empty = required('.empty-state', this); empty.hidden = Boolean(items.length)
      text(empty, 'h3', savedPage ? 'Таалагдсан сонголтоо энд хадгалаарай.' : dashboard ? 'Таны анхны зар энд харагдана.' : 'Тохирох сонголт олдсонгүй.')
      text(empty, 'p', savedPage ? 'Өрөө эсвэл хамтрагчийн картын зүрхэн дээр дараарай.' : dashboard ? 'Өрөөний мэдээллээ бэлдэж, урьдчилан хараад хадгалаарай.' : 'Төсөв, байршлаа өөрчилж эсвэл шүүлтүүрээ цэвэрлээд үзээрэй.')
      text(empty, '.empty-action', savedPage ? 'Өрөөнүүд үзэх' : dashboard ? 'Анхны өрөөгөө нэмэх' : 'Шүүлтүүр цэвэрлэх')
      if (route.page === 'detail') {
        const item = all.find(item => item.id === route.id)
        if (!item) {
          location.replace('#rooms'); toast('Энэ зар олдсонгүй. Өөр сонголт үзээрэй.'); return
        }
        if (detailId !== item.id || !detail.open) {
          detailId = item.id; detail.setAttribute('heading', item.title)
          this.renderDetail(required('.detail-content', this), item, true); detail.showModal()
        }
        text(detail, '.detail-save', saved.includes(item.id) ? 'Хадгалснаас хасах ♥' : 'Сонголтоо хадгалах ♡')
      } else detail.close()
    })
  }
  toListing(item) {
    return { ...item, kind: 'rooms', image: item.cover || roomImage, imageAlt: item.cover ? 'Таны байрны эхний өрөөний зураг' : 'Туршилтын зарын жишээ интерьер', area: 'Таны туршилтын зар', size: 'Өрөө', available: 'Тохиролцоно', traits: ['Энэ хөтөчийн зар'], pets: false }
  }
  makeCard(item) {
    const card = document.createElement(item.kind === 'rooms' ? 'hamtry-property-card' : 'hamtry-roommate-card')
    card.dataset.id = item.id
    const attributes = { heading: item.title, image: item.image, 'image-alt': item.imageAlt, location: `${item.district} · ${item.area}`, price: `${money(item.price)} / сар`, description: `${item.size} · Нүүх: ${item.available}` }
    for (const [key, value] of Object.entries(attributes)) card.setAttribute(key, value)
    const extras = document.createElement('div'); extras.className = 'card-extras'
    const tags = document.createElement('div'); tags.className = 'card-tags'
    for (const trait of item.traits) { const tag = document.createElement('span'); tag.textContent = trait; tags.append(tag) }
    const link = document.createElement('a'); link.href = `#listing/${item.id}`; link.className = 'card-detail'; link.textContent = 'Дэлгэрэнгүй үзэх ↗'; link.setAttribute('aria-label', `${item.title} — Дэлгэрэнгүй үзэх`)
    extras.append(tags, link); card.append(extras)
    // Listener нь card-той хамт эзэмшигдэнэ; page reconnect үед давхар нэмэхгүй.
    card.addEventListener('hamtry-save', () => this.saveListing?.(item.id))
    return card
  }
  renderDetail(root, item, actions, previewRecords = []) {
    // Зар/хэрэглэгчийн текстийг зөвхөн textContent-оор оруулна; innerHTML нь static skeleton.
    root.innerHTML = '<div class="detail-media"></div><div class="detail-summary"><span class="detail-label"></span><strong></strong></div><h3></h3><p class="detail-location"></p><p class="detail-description"></p><dl><div><dt>Нүүх хугацаа</dt><dd class="detail-date"></dd></div><div><dt>Нөхцөл</dt><dd class="detail-traits"></dd></div></dl><p class="demo-note">Жишээ зар. Бодит холбоо барих, захиалах үйлчилгээ хараахан холбогдоогүй.</p>' + (actions ? '<hamtry-button class="detail-save">Сонголтоо хадгалах ♡</hamtry-button>' : '')
    const media = required('.detail-media', root)
    if (item.kind === 'rooms') {
      const tour = document.createElement('hamtry-photo-tour')
      // Preview нь санах ой дахь thumbnail; хадгалсан tour нь IndexedDB Blob-оо уншина.
      tour.rooms = item.rooms?.length ? item.rooms.map(room => ({ ...room, photos: room.photos.map(photo => {
        const preview = previewRecords.find(record => record.id === photo.id)
        return preview ? { ...photo, src: preview.cover } : photo
      }) })) : item.id.startsWith('local-') ? [] : [{ id: 'example-room', name: 'Жишээ өрөө', photos: [{ src: item.image, caption: 'Жишээ интерьер' }] }]
      media.append(tour)
    } else { const image = document.createElement('img'); image.className = 'detail-image'; image.src = item.image; image.alt = item.imageAlt; media.append(image) }
    text(root, '.detail-label', item.kind === 'rooms' ? 'САРЫН ТҮРЭЭС' : 'САРЫН ТӨСӨВ'); text(root, 'strong', money(item.price))
    text(root, 'h3', item.title); text(root, '.detail-location', `${item.district} · ${item.area}`)
    text(root, '.detail-description', item.description); text(root, '.detail-date', item.available); text(root, '.detail-traits', item.traits.join(' · '))
  }
}
