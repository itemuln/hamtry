import { Scope, $, listen, onCleanup, required, untrack, useEffect, flushEffects } from '@hamtry/library'
import { districts, listings, roomImage } from '../data/listings.js'
import { findListings, initialFilters, money, readRoute, validLocation } from '../state/model.js'
import { createAppState } from '../state/store.js'
import { savePhotos, deletePhotos } from '../state/media-store.js'
import { dashboardMarkup, setupDashboard, updateDashboard } from './dashboard.js'

const searchIcons = {
  rooms: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  roommates: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
  location: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  conditions: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  budget: '<path d="M3 7V5a2 2 0 0 1 2-2h13v4M3 7h18v14H5a2 2 0 0 1-2-2Z"/><path d="M16 12h5v5h-5Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  next: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
}
const searchIcon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${searchIcons[name]}</svg>`
const text = (root, selector, value) => { required(selector, root).textContent = value }

// Page нь light DOM: layout/SEO нь хуудасных, дахин ашиглах controls нь Shadow DOM-той.
export class HamtryHome extends HTMLElement {
  state = createAppState()
  cards = new Map()
  previousPage = 'rooms'
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
        <a class="wordmark" href="#rooms" aria-label="Hamtry нүүр"><span class="brand-mark" aria-hidden="true">h.</span>hamtry<span class="brand-period">.</span></a>
        <nav id="main-nav" class="main-nav" aria-label="Үндсэн цэс"><a href="#map" data-nav="map"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/></svg><span>3D ертөнц</span></a><a href="#rooms" data-nav="home">${searchIcon('rooms')}Нүүр хуудас</a><a href="#saved" data-nav="saved"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>Хадгалсан <span class="saved-count">0</span></a><a href="#dashboard" data-nav="dashboard" class="dashboard-link" hidden>Миний зарууд</a></nav>
        <div class="header-actions"><button type="button" class="host-button" data-action="publish">Өрөө санал болгох</button><button type="button" class="profile-button" data-action="profile" aria-label="Миний орон зай"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6 19a6 6 0 0 1 12 0"/></svg></button></div>
      </header>
      <div class="search-dock">
      <form class="header-search" aria-label="Өрөө эсвэл хамтрагч хайх">
        <button type="button" class="search-segment" popovertarget="search-kind" aria-expanded="false"><span class="step-heading">${searchIcon('roommates')}Юу хайх вэ?</span><span class="search-value" data-search-summary="kind">Өрөө</span></button>
        <button type="button" class="search-segment" popovertarget="search-district" aria-expanded="false"><span class="step-heading">${searchIcon('location')}Хаана</span><span class="search-value" data-search-summary="district">Бүх дүүрэг</span></button>
        <button type="button" class="search-segment search-query" popovertarget="search-keywords" aria-expanded="false"><span class="step-heading">${searchIcon('conditions')}Нөхцөл <small>заавал биш</small></span><span class="search-value" data-search-summary="query">Нөхцөл сонгох</span><span class="search-compact-summary" aria-hidden="true">Нөхцөл</span></button>
        <button type="button" class="search-segment" popovertarget="search-budget" aria-expanded="false"><span class="step-heading">${searchIcon('budget')}Төсөв</span><span class="search-value" data-search-summary="maxPrice">Төсөв сонгох</span></button>
        <div id="search-kind" class="search-panel" popover role="dialog" aria-labelledby="kind-panel-title">
          <h2 id="kind-panel-title">Юу хайж байна?</h2><p class="search-panel-hint">Хайх зүйлээ сонгоод эхэлье.</p>
          <div class="search-kind-choices"><button type="button" data-search-kind="roommates" aria-pressed="false">${searchIcon('roommates')}<strong>Өрөөний хамтрагч</strong><span>Нэг хэмнэлтэй хүнээ олох</span>${searchIcon('next')}</button><button type="button" data-search-kind="rooms" aria-pressed="true">${searchIcon('rooms')}<strong>Өрөө</strong><span>Амьдрах орон зайгаа олох</span>${searchIcon('next')}</button></div>
        </div>
        <div id="search-district" class="search-panel" popover role="dialog" aria-labelledby="district-panel-title">
          <div class="location-panel-heading"><h2 id="district-panel-title">Дүүргээ сонгох</h2><section class="browse-choice" aria-label="Өрөөнүүдийг харах хэлбэр"><nav class="browse-mode" aria-label="Жагсаалт эсвэл газрын зураг"><a href="#list" data-browse-view="list"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/></svg>Өрөөнүүд</a><a href="#map" data-browse-view="map" aria-label="Газрын зураг" title="Газрын зураг"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg><span class="map-label">Газрын зураг</span></a></nav></section></div><div class="location-tools"><hamtry-button class="new-listing" data-action="publish">Өрөө нэмэх +</hamtry-button></div><fieldset class="search-options"><legend>Хаана амьдрах вэ?</legend>${[['all', 'Бүх дүүрэг'], ...districts.map(name => [name, name])].map(([value, label]) => `<label><input type="radio" name="district" value="${value}" ${value === 'all' ? 'checked' : ''}>${searchIcon('location')}<span>${label}</span></label>`).join('')}</fieldset>
          <div class="search-panel-actions"><button type="button" data-clear-search="district">Цэвэрлэх</button><button type="button" data-search-next="search-keywords">Үргэлжлүүлэх</button></div>
        </div>
        <div id="search-budget" class="search-panel" popover role="dialog" aria-labelledby="budget-panel-title">
          <h2 id="budget-panel-title">Сарын төсөв</h2><fieldset class="search-options"><legend>Түрээсийн дээд хэмжээ</legend>${[[0, 'Хязгааргүй'], [700000, '700,000 ₮ хүртэл'], [1000000, '1,000,000 ₮ хүртэл'], [1500000, '1,500,000 ₮ хүртэл']].map(([value, label]) => `<label><input type="radio" name="maxPrice" value="${value}" ${value === 0 ? 'checked' : ''}>${searchIcon('budget')}<span>${label}</span></label>`).join('')}</fieldset>
          <div class="search-panel-actions"><button type="button" data-clear-search="maxPrice">Цэвэрлэх</button><button class="finish-search" type="submit">Хайх</button></div>
        </div>
        <div id="search-keywords" class="search-panel" popover role="dialog" aria-labelledby="keywords-panel-title">
          <h2 id="keywords-panel-title">Танд юу чухал вэ?</h2><p class="search-panel-hint">Хүсвэл сонгоорой. Энэ алхмыг алгасаж болно.</p><label class="keyword-field">Хайх үг<input name="query" placeholder="Өрөө, байршил, нөхцөл" aria-label="Хайх үг" /></label>
          <fieldset class="search-options condition-options"><legend>Хүссэн нөхцөлүүд</legend>${['Тамхи татдаггүй', 'Амьтан зөвшөөрнө', 'Тавилгатай', 'Wi-Fi', 'Цэвэрч', 'Гэрээс ажилладаг'].map(condition => `<label><input type="checkbox" name="conditions" value="${condition}">${searchIcon('check')}<span>${condition}</span></label>`).join('')}</fieldset>
          <div class="search-panel-actions"><button type="button" data-search-skip>Алгасах</button><button type="button" class="reset-filters">Цэвэрлэх</button><button type="button" data-search-next="search-budget">Үргэлжлүүлэх</button></div>
        </div>
        <button type="submit" class="search-submit" aria-label="Хайх"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button>
      </form>
      </div>
      <main id="main-content">
      ${dashboardMarkup()}
          <section class="listing-section page-width" id="results" tabindex="-1" aria-label="Өрөөнүүд">
                        <div class="results-meta"><p class="result-count" role="status" aria-live="polite"></p><span>Жишээ цэгүүд + энэ хөтөчийн зарууд</span></div>
                        <div class="browse-layout"><hamtry-immersive-map class="browse-map" embedded></hamtry-immersive-map><div class="listing-results"><p class="map-location-note" hidden>Эдгээр хамтрагчийн байршил оруулаагүй байна.</p><div class="listing-grid"></div>
                        <div class="empty-state" hidden><span aria-hidden="true">⌂</span><h3></h3><p></p><hamtry-button class="empty-action">Шүүлтүүр цэвэрлэх</hamtry-button></div></div></div>
                      </section>
                </main>
      <footer class="page-width"><a class="wordmark" href="#rooms">hamtry.</a><div><a href="/components.html">Компонентууд</a><a href="/editor.html">Дизайн систем</a></div><small>Хичээлийн туршилтын хувилбар · Бодит захиалга, төлбөр, хэрэглэгчийн бүртгэлгүй.</small></footer>
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
      const heading = required(state.route.get().page === 'dashboard' ? '#dashboard-top' : '#results', this)
      heading.tabIndex = -1; heading.focus(); heading.scrollIntoView()
    })
    const showPublish = () => {
      if (saving) return
      for (const panel of $('.search-panel', this)) panel.hidePopover()
      required('.publish-form', this).hidden = false; required('.publish-preview', this).hidden = true
      publish.showModal()
    }
    setupDashboard(this, { showPublish, toast, listen })
    for (const node of $('[data-action]', this)) listen(node, 'click', () => node.dataset.action === 'profile' ? profile.showModal() : showPublish())
    listen(this, 'click', event => {
      if (!event.target.closest('.site-header nav a')) return
      for (const options of $('.room-options', this)) options.open = false
    })
    listen(window, 'hashchange', () => {
      const route = readRoute(location.hash)
      const previous = state.route.get()
      const update = () => {
        if (!active) return
        state.route.set(route); flushEffects()
        if (route.page !== 'detail' && previous.page !== 'detail' && !this.querySelector('.search-panel:popover-open')) {
          const heading = required(route.page === 'dashboard' ? '#dashboard-top' : '#results', this)
          heading.tabIndex = -1; heading.focus({ preventScroll:true })
        }
      }
      if (!this.querySelector('.search-panel:popover-open') && route.page !== previous.page && route.page !== 'detail' && previous.page !== 'detail' && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.startViewTransition(update)
      } else update()
      if (route.page !== 'detail' && previous.page !== 'detail' && !this.querySelector('.search-panel:popover-open')) {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    })
    const applyFilters = form => {
      const data = new FormData(form)
      state.filters.set({ ...state.filters.get(), district: String(data.get('district')), query: String(data.get('query')), maxPrice: Number(data.get('maxPrice')), conditions: data.getAll('conditions') })
    }
    listen(this, 'submit', event => {
      if (!event.target.matches('.header-search')) return
      event.preventDefault(); applyFilters(event.target)
      for (const panel of $('.search-panel', this)) panel.hidePopover()
      if (!['rooms', 'roommates', 'map', 'list'].includes(state.route.get().page)) location.hash = state.kind.get()
      required('#results', this).focus({ preventScroll: true })
    })
    listen(this, 'change', event => {
      const form = event.target.closest('.header-search')
      if (form) applyFilters(form)
    })
    const searchBar = required('.header-search', this)
    const searchPanels = $('.search-panel', this)
    const closeSearchPanels = () => { for (const panel of searchPanels) panel.hidePopover() }
    const openSearchStep = id => {
      closeSearchPanels()
      const trigger = required(`.search-segment[popovertarget="${id}"]`, this)
      trigger.focus({ preventScroll: true })
      const panel = required(`#${id}`, this)
      panel.showPopover()
    }
    for (const button of $('[data-search-kind]', this)) listen(button, 'click', () => {
      state.kind.set(button.dataset.searchKind)
      location.hash = button.dataset.searchKind
      openSearchStep('search-district')
    })
    for (const input of $('[name="district"]', searchBar)) listen(input, 'click', () => {
      applyFilters(searchBar)
      openSearchStep('search-keywords')
    })
    for (const button of $('[data-search-next]', this)) listen(button, 'click', () => openSearchStep(button.dataset.searchNext))
    listen(required('[data-search-skip]', this), 'click', () => {
      state.filters.set({ ...state.filters.get(), conditions: [], query: '' })
      openSearchStep('search-budget')
    })
    const searchDock = required('.search-dock', this)
    const positionSearchPanel = panel => {
      const trigger = required(`.search-segment[popovertarget="${panel.id}"]`, this)
      const bar = searchBar.getBoundingClientRect(), anchor = trigger.getBoundingClientRect()
      const top = Math.min(bar.bottom + 12, window.innerHeight - 180)
      panel.style.top = `${Math.max(16, top)}px`
      panel.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - panel.offsetWidth - 16))}px`
      panel.style.maxHeight = `${window.innerHeight - Math.max(16, top) - 16}px`
    }
    for (const panel of searchPanels) listen(panel, 'toggle', event => {
      const trigger = required(`.search-segment[popovertarget="${panel.id}"]`, this)
      trigger.setAttribute('aria-expanded', String(event.newState === 'open'))
      if (event.newState !== 'open') return
      positionSearchPanel(panel)
      const control = panel.querySelector('[data-search-kind], input')
      control?.focus({ preventScroll: true })
    })
    const updateSearchDock = () => {
      const compact = searchDock.getBoundingClientRect().top <= 0 && window.scrollY > 0
      searchDock.classList.toggle('is-compact', compact)
      for (const panel of searchPanels) if (panel.matches(':popover-open')) positionSearchPanel(panel)
    }
    listen(window, 'scroll', updateSearchDock, { passive: true })
    listen(window, 'resize', () => { closeSearchPanels(); updateSearchDock() })
    listen(searchBar, 'transitionend', () => {
      for (const panel of searchPanels) if (panel.matches(':popover-open')) positionSearchPanel(panel)
    })
    updateSearchDock()
    onCleanup(closeSearchPanels)
    for (const button of $('[data-clear-search]', this)) listen(button, 'click', () => {
      const key = button.dataset.clearSearch
      state.filters.set({ ...state.filters.get(), [key]: initialFilters[key] })
    })
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
        queueMicrotask(() => map.fit?.([...listings, record].filter(item => validLocation(item.location))))
        toast('Зар ба өрөөний зургууд энэ хөтөчид хадгалагдлаа')
      } catch (error) { if (active) toast(error.message || 'Зураг хадгалж чадсангүй. Дахин оролдоно уу.') }
      finally { saving = false; confirm.disabled = false; edit.disabled = false; confirm.textContent = 'Энэ хөтөчид хадгалах' }
    })
    listen(required('.detail-content', this), 'click', event => { if (event.target.closest('.detail-save')) save(detailId) })
    useEffect(() => {
      const route = state.route.get()
      const page = route.page === 'detail' ? this.previousPage : route.page
      const kind = page === 'map' || page === 'list' ? 'rooms' : page === 'rooms' || page === 'roommates' ? page : state.kind.get()
      const savedPage = page === 'saved', dashboard = page === 'dashboard'
      required('.provider-dashboard', this).hidden = !dashboard
      updateDashboard(this, state.published.get())
      if (route.page !== 'detail') this.previousPage = route.page
      this.dataset.page = page
      required('#results', this).hidden = dashboard
      required('.search-dock', this).hidden = dashboard
      if (dashboard) closeSearchPanels()
      const roomMap = page === 'map'
      this.dataset.view = roomMap ? 'map' : 'list'
      required('.browse-map', this).hidden = !roomMap
      for (const view of $('[data-browse-view]', this)) {
        if ((view.dataset.browseView === 'map' && roomMap) || view.dataset.browseView === page) view.setAttribute('aria-current', 'page'); else view.removeAttribute('aria-current')
      }
      for (const node of $('[data-nav]', this)) {
        if (node.dataset.nav === page || (node.dataset.nav === 'home' && ['rooms', 'roommates', 'list'].includes(page))) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current')
      }
      required('#results', this).setAttribute('aria-label', savedPage ? 'Хадгалсан сонголтууд' : kind === 'roommates' ? 'Хамтрагчид' : 'Өрөөнүүд')
      const filter = state.filters.get(), saved = state.saved.get()
      // Control-ийн .value setter доторх getter-үүд page effect-ийн dependency болох ёсгүй.
      untrack(() => { for (const node of $('.header-search [name]', this)) {
        if (node.type === 'checkbox') node.checked = filter.conditions.includes(node.value)
        else if (node.type === 'radio') node.checked = node.value === String(filter[node.name])
        else node.value = filter[node.getAttribute('name')]
      } })
      text(this, '[data-search-summary="kind"]', kind === 'roommates' ? 'Хамтрагч' : 'Өрөө')
      for (const button of $('[data-search-kind]', this)) button.setAttribute('aria-pressed', String(button.dataset.searchKind === kind))
      required('.browse-choice', this).hidden = kind === 'roommates'
      text(this, '[data-search-summary="district"]', filter.district === 'all' ? 'Бүх дүүрэг' : filter.district)
      text(this, '[data-search-summary="maxPrice"]', filter.maxPrice ? money(filter.maxPrice) : 'Хязгааргүй')
      const conditionSummary = [filter.query, filter.conditions.length ? `${filter.conditions.length} нөхцөл` : ''].filter(Boolean).join(' · ')
      text(this, '[data-search-summary="query"]', conditionSummary || 'Сонголтоор')
      text(this, '.search-compact-summary', conditionSummary || 'Нөхцөл')
      for (const trigger of $('.search-segment', this)) {
        const label = required('.step-heading', trigger).textContent.trim()
        const summary = required('.search-value', trigger).textContent
        trigger.setAttribute('aria-label', `${label}: ${summary}`)
        trigger.title = `${label}: ${summary}`
      }
      required('[popovertarget="search-kind"] .step-heading svg', this).innerHTML = searchIcons[kind === 'roommates' ? 'roommates' : 'rooms']
      const all = [...state.published.get().map(item => this.toListing(item)), ...listings]
      const items = dashboard ? all.filter(item => item.id.startsWith('local-')) : findListings(all, filter, savedPage ? null : kind, savedPage ? saved : null)
      const located = items.filter(item => validLocation(item.location))
      required('.browse-map', this).listings = located
      required('.listing-grid', this).hidden = roomMap && Boolean(located.length)
      required('.map-location-note', this).hidden = !roomMap || kind !== 'roommates' || Boolean(located.length) || !items.length
      if (route.page === 'detail') required('.browse-map', this).selectedId = route.id
      text(this, '.result-count', `${items.length} ${savedPage ? 'хадгалсан сонголт' : dashboard ? 'туршилтын зар' : 'сонголт'}`)
      for (const count of $('.saved-count', this)) count.textContent = saved.length
      for (const link of $('.dashboard-link', this)) link.hidden = state.role.get() !== 'provider'
      for (const button of $('[data-role]', this)) button.setAttribute('aria-pressed', String(button.dataset.role === state.role.get()))
      const nodes = items.map(item => {
        if (!this.cards.has(item.id)) this.cards.set(item.id, this.makeCard(item))
        const card = this.cards.get(item.id); card.saved = saved.includes(item.id); return card
      })
      required('.listing-results', this).hidden = roomMap && Boolean(located.length)
      const ids = items.map(item => item.id).join(',')
      // Save хийхэд grid дахин зурахгүй: keyboard focus, component state хадгалагдана.
      if (ids !== lastIds) { required('.listing-grid', this).replaceChildren(...nodes); lastIds = ids }
      const empty = required('.empty-state', this); empty.hidden = Boolean(items.length)
      text(empty, 'h3', savedPage ? 'Таалагдсан сонголтоо энд хадгалаарай.' : dashboard ? 'Таны анхны зар энд харагдана.' : 'Тохирох сонголт олдсонгүй.')
      text(empty, 'p', savedPage ? 'Өрөө эсвэл хамтрагчийн картын зүрхэн дээр дараарай.' : dashboard ? 'Өрөөний мэдээллээ бэлдэж, урьдчилан хараад хадгалаарай.' : 'Төсөв, нөхцөлөө өөрчилж эсвэл шүүлтүүрээ цэвэрлээд үзээрэй.')
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
