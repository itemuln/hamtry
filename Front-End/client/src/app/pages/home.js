import { Scope, $, createMotion, listen, onCleanup, required, untrack, useEffect, flushEffects } from '@hamtry/library'
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
  smokeFree: '<path d="M3 14h13v4H3ZM19 14v4M22 14v4M17 9c0-2-3-2-3-4M3 3l18 18"/>',
  pets: '<ellipse cx="12" cy="16" rx="5" ry="4"/><ellipse cx="5" cy="9" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="10" rx="2" ry="3"/>',
  furnished: '<path d="M6 11V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5M4 10a2 2 0 0 1 2 2v3h12v-3a2 2 0 0 1 4 0v7H2v-7a2 2 0 0 1 2-2ZM5 19v2M19 19v2"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
  clean: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4"/>',
  work: '<rect x="5" y="4" width="14" height="12" rx="2"/><path d="M5 16 2 20h20l-3-4M10 8h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  message: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3V11a9 9 0 0 1 18 0Z"/>',
  money: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01"/>',
  bell: '<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4ZM10 20h4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
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
        <nav id="main-nav" class="main-nav" aria-label="Үндсэн цэс"><span class="nav-indicator" aria-hidden="true" hidden></span><a href="#map" data-nav="map"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/></svg><span>3D ертөнц</span></a><a href="#rooms" data-nav="home">${searchIcon('rooms')}<span>Нүүр хуудас</span></a><a href="#saved" data-nav="saved"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4Z"/></svg><span>Хадгалсан</span> <span class="saved-count">0</span></a></nav>
        <div class="header-actions"><button type="button" class="host-button add-listing-button" aria-haspopup="dialog" aria-controls="listing-type-menu" aria-expanded="false">${searchIcon('plus')}Зар нэмэх</button><button type="button" class="menu-button" aria-label="Цэс" aria-haspopup="dialog" aria-controls="header-menu" aria-expanded="false">${searchIcon('menu')}</button><button type="button" class="profile-button" data-action="profile" aria-label="Миний орон зай"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6 19a6 6 0 0 1 12 0"/></svg></button></div>
      </header>
      <div class="search-dock">
      <form class="header-search" aria-label="Өрөө эсвэл хамтрагч хайх"><div class="search-surface" aria-hidden="true"></div>
        <button type="button" class="search-segment" popovertarget="search-kind" aria-expanded="false"><span class="step-heading">${searchIcon('roommates')}Юу хайх вэ?</span><span class="search-value" data-search-summary="kind">Өрөө</span></button>
        <button type="button" class="search-segment" popovertarget="search-district" aria-expanded="false"><span class="step-heading">${searchIcon('location')}Хаана</span><span class="search-value" data-search-summary="district">Бүх дүүрэг</span></button>
        <button type="button" class="search-segment search-query" popovertarget="search-keywords" aria-expanded="false"><span class="step-heading">${searchIcon('conditions')}Нөхцөл <small>заавал биш</small></span><span class="search-value" data-search-summary="query">Нөхцөл сонгох</span><span class="search-compact-summary" aria-hidden="true">Нөхцөл</span></button>
        <button type="button" class="search-segment" popovertarget="search-budget" aria-expanded="false"><span class="step-heading">${searchIcon('budget')}Төсөв</span><span class="search-value" data-search-summary="maxPrice">Төсөв сонгох</span></button>
        <div id="search-kind" class="search-panel" popover="manual" role="dialog" aria-labelledby="kind-panel-title">
          <h2 id="kind-panel-title">Юу хайж байна?</h2><p class="search-panel-hint">Хайх зүйлээ сонгоод эхэлье.</p>
          <div class="search-kind-choices"><button type="button" data-search-kind="roommates" aria-pressed="false">${searchIcon('roommates')}<strong>Өрөөний хамтрагч</strong><span>Нэг хэмнэлтэй хүнээ олох</span>${searchIcon('next')}</button><button type="button" data-search-kind="rooms" aria-pressed="true">${searchIcon('rooms')}<strong>Өрөө</strong><span>Амьдрах орон зайгаа олох</span>${searchIcon('next')}</button></div>
        </div>
        <div id="search-district" class="search-panel" popover="manual" role="dialog" aria-labelledby="district-panel-title">
          <div class="location-panel-heading"><h2 id="district-panel-title">Дүүргээ сонгох</h2><section class="browse-choice" aria-label="Өрөөнүүдийг харах хэлбэр"><nav class="browse-mode" aria-label="Жагсаалт эсвэл газрын зураг"><a href="#list" data-browse-view="list"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/></svg>Өрөөнүүд</a><a href="#map" data-browse-view="map" aria-label="Газрын зураг" title="Газрын зураг"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg><span class="map-label">Газрын зураг</span></a></nav></section></div><fieldset class="search-options"><legend>Хаана амьдрах вэ?</legend>${[['all', 'Бүх дүүрэг'], ...districts.map(name => [name, name])].map(([value, label]) => `<label><input type="radio" name="district" value="${value}" ${value === 'all' ? 'checked' : ''}>${searchIcon('location')}<span>${label}</span></label>`).join('')}</fieldset>
          <div class="search-panel-actions"><button type="button" data-clear-search="district">Цэвэрлэх</button><button type="button" data-search-next="search-keywords">Үргэлжлүүлэх</button></div>
        </div>
        <div id="search-budget" class="search-panel" popover="manual" role="dialog" aria-labelledby="budget-panel-title">
          <h2 id="budget-panel-title">Сарын төсөв</h2><fieldset class="search-options"><legend>Түрээсийн дээд хэмжээ</legend>${[[0, 'Хязгааргүй'], [700000, '700,000 ₮ хүртэл'], [1000000, '1,000,000 ₮ хүртэл'], [1500000, '1,500,000 ₮ хүртэл']].map(([value, label]) => `<label><input type="radio" name="maxPrice" value="${value}" ${value === 0 ? 'checked' : ''}>${searchIcon('budget')}<span>${label}</span></label>`).join('')}</fieldset>
          <div class="search-panel-actions"><button type="button" data-clear-search="maxPrice">Цэвэрлэх</button><button class="finish-search" type="submit">Хайх</button></div>
        </div>
        <div id="search-keywords" class="search-panel" popover="manual" role="dialog" aria-labelledby="keywords-panel-title">
          <h2 id="keywords-panel-title">Танд юу чухал вэ?</h2>
          <fieldset class="search-options condition-options" aria-label="Хүссэн нөхцөлүүд">${[['Тамхи татдаггүй', 'smokeFree'], ['Амьтан зөвшөөрнө', 'pets'], ['Тавилгатай', 'furnished'], ['Wi-Fi', 'wifi'], ['Цэвэрч', 'clean'], ['Гэрээс ажилладаг', 'work']].map(([condition, icon]) => `<label><input type="checkbox" name="conditions" value="${condition}">${searchIcon(icon)}<span>${condition}</span></label>`).join('')}</fieldset>
          <div class="search-panel-actions"><button type="button" class="reset-filters">Цэвэрлэх</button><button type="button" data-search-next="search-budget">Үргэлжлүүлэх</button></div>
        </div>
        <button type="submit" class="search-submit" aria-label="4 өрөө харах"><span class="search-submit-surface" aria-hidden="true"></span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span class="search-submit-label">4 өрөө харах</span></button>
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
      <hamtry-dialog class="profile-dialog" heading="Миний орон зай"><p>Та өнөөдөр юу хийхийг хүсэж байна?</p><div class="role-choices"><button type="button" data-role="seeker"><span>⌕</span><strong>Өрөө, хамтрагч хайх</strong><small>Сонголтоо хайж, хадгалах</small></button><button type="button" data-role="provider"><span>⌂</span><strong>Өрөө санал болгох</strong><small>Өрөөний мэдээллээ бэлдэх</small></button></div><p class="demo-note">Энэ бол жишээ горим. Сонголт зөвхөн энэ хөтөч дээр хадгалагдана; нэвтэрсэн бүртгэл үүсэхгүй.</p></hamtry-dialog>
      <div id="header-menu" class="header-menu" popover="auto" role="dialog" aria-label="Цэс"><button type="button" class="appearance-toggle" role="switch" aria-checked="false">${searchIcon('moon')}<span>Харанхуй горим</span><span class="appearance-switch" aria-hidden="true"></span></button><div class="future-options" aria-label="Тун удахгүй"><button type="button" disabled>${searchIcon('bell')}<span>Мэдэгдэл</span><small>Тун удахгүй</small></button><button type="button" disabled>${searchIcon('shield')}<span>Аюулгүй амьдрах</span><small>Тун удахгүй</small></button><button type="button" disabled>${searchIcon('help')}<span>Тусламж</span><small>Тун удахгүй</small></button></div></div>
      <div id="listing-type-menu" class="listing-type-menu" popover="auto" role="dialog" aria-label="Зар нэмэх"><button type="button" data-post-kind="room">${searchIcon('rooms')}<span><strong>Өрөөгөө санал болгох</strong><small>Өрөөний зар нэмэх</small></span>${searchIcon('next')}</button><button type="button" disabled>${searchIcon('roommates')}<span><strong>Өөрийгөө танилцуулах</strong><small>Тун удахгүй</small></span></button></div>
      <hamtry-dialog class="publish-dialog" heading="Өрөөгөө санал болгох"><p class="demo-note">Зар ба зургууд зөвхөн энэ хөтөчид хадгалагдана. Бусад хэрэглэгчид хараахан харагдахгүй.</p><form class="publish-form"><hamtry-input name="title" label="Зарын гарчиг" required maxlength="100" placeholder="Жишээ: Гэрэлтэй хувийн өрөө"></hamtry-input><hamtry-select name="district" label="Дүүрэг" required>${districts.map(name => `<option>${name}</option>`).join('')}</hamtry-select><hamtry-input name="price" type="number" label="Сарын түрээс (₮)" required min="1" max="100000000" step="1" placeholder="750000"></hamtry-input><fieldset class="location-fields"><legend>Байрны байршил</legend><p>Газрын зураг дээр дарж цэгээ сонгоно уу. Эсвэл координатаа оруулж болно.</p><hamtry-apartment-map pick-location></hamtry-apartment-map><div class="coordinates"><hamtry-input name="latitude" type="number" label="Өргөрөг" required min="-85" max="85" step="any" placeholder="47.918"></hamtry-input><hamtry-input name="longitude" type="number" label="Уртраг" required min="-180" max="180" step="any" placeholder="106.917"></hamtry-input></div></fieldset><hamtry-room-editor></hamtry-room-editor><hamtry-textarea name="description" label="Өрөө ба хамтын амьдралын нөхцөл" required maxlength="1500" placeholder="Өрөө, хамтын хэсэг, нүүх хугацаа, хэрэглээний зардлын талаар…"></hamtry-textarea><hamtry-button type="submit">Урьдчилан харах ↗</hamtry-button></form><div class="publish-preview" hidden><div class="preview-copy"></div><div class="dialog-actions"><hamtry-button variant="secondary" class="edit-draft">Засах</hamtry-button><hamtry-button class="confirm-publish">Энэ хөтөчид хадгалах</hamtry-button></div></div></hamtry-dialog>`
  }
  setup() {
    const { state } = this
    const entry = state.route.get()
    if (entry.page === 'detail' && listings.find(item => item.id === entry.id)?.kind === 'roommates') this.previousPage = 'roommates'
    const motion = createMotion()
    let toastTimer, draft, draftRecords = [], saving = false, active = true, lastIds = null, lastSearchLabel, detailId, expandedCard
    const profile = required('.profile-dialog', this), publish = required('.publish-dialog', this), listingType = required('#listing-type-menu', this)
    const toast = message => {
      clearTimeout(toastTimer)
      const node = required('.toast', this); node.textContent = message; node.hidden = false
      toastTimer = setTimeout(() => { node.hidden = true }, 3500)
    }
    onCleanup(() => { active = false; clearTimeout(toastTimer); profile.close(); publish.close(); listingType.hidePopover() })
    const save = id => {
      const persisted = state.toggleSaved(id)
      toast(persisted ? state.saved.get().includes(id) ? 'Сонголт хадгалагдлаа ♥' : 'Хадгалсан сонголтоос хаслаа' : 'Энэ удаа хөтөч дээр хадгалж чадсангүй. Сонголт түр хадгалагдсан.')
    }
    const mainNav = required('#main-nav', this), navIndicator = required('.nav-indicator', this)
    const updateNavIndicator = () => {
      const selected = mainNav.querySelector('[aria-current="page"]')
      if (!selected) { navIndicator.hidden = true; motion.stop(navIndicator); return }
      const before = navIndicator.hidden ? null : navIndicator.getBoundingClientRect()
      const nav = mainNav.getBoundingClientRect(), target = selected.getBoundingClientRect()
      navIndicator.hidden = false
      navIndicator.style.left = `${target.left - nav.left + mainNav.scrollLeft}px`
      navIndicator.style.top = `${target.top - nav.top}px`
      navIndicator.style.width = `${target.width}px`
      navIndicator.style.height = `${target.height}px`
      if (!before || !target.width || !target.height) return
      // Өмнөх харагдаж буй байрлалаас шинэ tab руу зөвхөн indicator-ийг хөдөлгөнө.
      motion.play(navIndicator, { transform: [`translate(${before.left - target.left}px,${before.top - target.top}px) scale(${before.width / target.width},${before.height / target.height})`, 'none'] }, { duration: 300, ease: 'cubic-bezier(.25,.1,.25,1)' })
    }
    listen(window, 'resize', updateNavIndicator)
    this.saveListing = save
    onCleanup(() => { this.saveListing = undefined })
    listen(required('.skip-link', this), 'click', event => {
      event.preventDefault()
      const heading = required(state.route.get().page === 'dashboard' ? '#dashboard-top' : '#results', this)
      heading.tabIndex = -1; heading.focus(); heading.scrollIntoView()
    })
    const showPublish = () => {
      if (saving) return
      closeSearchPanels()
      required('.publish-form', this).hidden = false; required('.publish-preview', this).hidden = true
      publish.showModal()
    }
    setupDashboard(this, { showPublish, toast, listen })
    const addListing = required('.add-listing-button', this)
    const positionHeaderMenu = (menu, button) => {
      const anchor = button.getBoundingClientRect()
      menu.style.left = `${Math.max(12, Math.min(anchor.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 12))}px`
      menu.style.top = `${anchor.bottom + 10}px`
      menu.style.maxHeight = `${Math.max(120, window.innerHeight - anchor.bottom - 26)}px`
    }
    const closeListingMenu = onComplete => {
      if (!listingType.matches(':popover-open')) { onComplete?.(); return }
      motion.play(listingType, { opacity: [getComputedStyle(listingType).opacity, 0], transform: ['none', 'translateY(-5px)'] }, { duration: 180, onComplete: () => { listingType.hidePopover(); onComplete?.() } })
    }
    listen(addListing, 'click', () => {
      if (listingType.matches(':popover-open')) { closeListingMenu(); return }
      closeSearchPanels()
      listingType.showPopover()
      positionHeaderMenu(listingType, addListing)
      motion.play(listingType, { opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }, { duration: 360, ease: 'cubic-bezier(.25,.1,.25,1)' })
    })
    listen(listingType, 'toggle', () => {
      const open = listingType.matches(':popover-open')
      addListing.setAttribute('aria-expanded', String(open))
      if (!open) motion.stop(listingType)
    })
    listen(window, 'resize', () => { if (listingType.matches(':popover-open')) positionHeaderMenu(listingType, addListing) })
    listen(window, 'scroll', () => { if (listingType.matches(':popover-open')) listingType.hidePopover() }, { passive: true })
    const menuButton = required('.menu-button', this), headerMenu = required('#header-menu', this)
    const appearanceToggle = required('.appearance-toggle', this)
    const applyAppearance = mode => {
      this.dataset.appearance = mode
      document.documentElement.dataset.appearance = mode
      appearanceToggle.setAttribute('aria-checked', String(mode === 'dark'))
    }
    applyAppearance(document.documentElement.dataset.appearance === 'dark' ? 'dark' : 'light')
    listen(appearanceToggle, 'click', () => {
      const mode = this.dataset.appearance === 'dark' ? 'light' : 'dark'
      applyAppearance(mode)
      try { localStorage.setItem('hamtry:appearance', mode) } catch { toast('Өнгө солигдлоо. Энэ хөтөчид хадгалж чадсангүй.') }
    })
    listen(menuButton, 'click', () => {
      if (headerMenu.matches(':popover-open')) { headerMenu.hidePopover(); return }
      closeSearchPanels()
      headerMenu.showPopover()
      positionHeaderMenu(headerMenu, menuButton)
      motion.play(headerMenu, { opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 280, ease: 'cubic-bezier(.25,.1,.25,1)' })
    })
    listen(headerMenu, 'toggle', () => {
      const open = headerMenu.matches(':popover-open')
      menuButton.setAttribute('aria-expanded', String(open))
      if (!open) motion.stop(headerMenu)
    })
    listen(window, 'resize', () => { if (headerMenu.matches(':popover-open')) positionHeaderMenu(headerMenu, menuButton) })
    listen(window, 'scroll', () => { if (headerMenu.matches(':popover-open')) headerMenu.hidePopover() }, { passive: true })
    onCleanup(() => headerMenu.hidePopover())
    for (const node of $('[data-action]', this)) listen(node, 'click', () => node.dataset.action === 'profile' ? profile.showModal() : showPublish())
    listen(required('[data-post-kind="room"]', this), 'click', () => closeListingMenu(() => { if (active) showPublish() }))
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
      update()
      if (route.page !== 'detail' && previous.page !== 'detail' && !this.querySelector('.search-panel:popover-open')) {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    })
    const applyFilters = form => {
      const data = new FormData(form)
      const roommates = this.dataset.searchKind === 'roommates'
      state.filters.set({ ...state.filters.get(), district: roommates ? 'all' : String(data.get('district')), query: '', maxPrice: roommates ? 0 : Number(data.get('maxPrice')), conditions: data.getAll('conditions') })
    }
    listen(this, 'submit', event => {
      if (!event.target.matches('.header-search')) return
      event.preventDefault(); applyFilters(event.target)
      closeSearchPanels()
      if (!['rooms', 'roommates', 'map', 'list'].includes(state.route.get().page)) location.hash = state.kind.get()
      required('#results', this).focus({ preventScroll: true })
    })
    listen(this, 'change', event => {
      const form = event.target.closest('.header-search')
      if (form) applyFilters(form)
    })
    const searchBar = required('.header-search', this)
    const searchPanels = $('.search-panel', this)
    let panelRevision = 0
    const closeSearchPanels = () => {
      panelRevision++
      for (const panel of searchPanels) { motion.stop(panel); panel.hidePopover() }
    }
    const openSearchStep = (id, beforeReveal) => {
      const revision = ++panelRevision
      const current = searchPanels.find(panel => panel.matches(':popover-open'))
      const reveal = () => {
        if (revision !== panelRevision || !id) return
        beforeReveal?.()
        const trigger = required(`.search-segment[popovertarget="${id}"]`, this)
        const panel = required(`#${id}`, this)
        trigger.focus({ preventScroll: true })
        panel.showPopover()
        positionSearchPanel(panel)
        // Нээлтийн эхний frame-ийг toggle event хүлээлгүй тохируулж анивчихыг зогсооно.
        motion.play(panel, { opacity: [0, 1], transform: ['translateY(-12px) scale(.985)', 'none'] }, { duration: 620, ease: navbarEase })
        panel.querySelector('[data-search-kind], input')?.focus({ preventScroll: true })
      }
      if (!current) { reveal(); return }
      const visual = getComputedStyle(current)
      const opacity = visual.opacity, transform = visual.transform
      motion.play(current, { opacity: [opacity, 0], transform: [transform, 'translateY(6px) scale(.99)'] }, {
        duration: 220, ease: 'cubic-bezier(.4,0,1,1)',
        onComplete: () => {
          if (revision !== panelRevision) return
          current.hidePopover()
          reveal()
        },
      })
    }
    for (const trigger of $('.search-segment[popovertarget]', searchBar)) listen(trigger, 'click', event => {
      event.preventDefault()
      const id = trigger.getAttribute('popovertarget')
      openSearchStep(required(`#${id}`, this).matches(':popover-open') ? null : id)
    })
    listen(document, 'pointerdown', event => {
      if (!searchPanels.some(panel => panel.matches(':popover-open'))) return
      if (event.target.closest('[data-action="publish"]')) closeSearchPanels()
      else if (!event.target.closest('.search-panel, .search-segment[popovertarget]')) openSearchStep(null)
    })
    listen(document, 'keydown', event => {
      const current = searchPanels.find(panel => panel.matches(':popover-open'))
      if (event.key !== 'Escape' || !current || document.querySelector('dialog[open]')) return
      event.preventDefault()
      openSearchStep(null)
      required(`.search-segment[popovertarget="${current.id}"]`, this).focus({ preventScroll: true })
    })
    for (const button of $('[data-search-kind]', this)) listen(button, 'click', () => {
      const kind = button.dataset.searchKind
      // Хуучин panel хаагдсаны дараа route, төрөл, layout-ийг нэг дор шинэчилнэ.
      openSearchStep(kind === 'roommates' ? 'search-keywords' : 'search-district', () => {
        state.kind.set(kind)
        if (kind === 'roommates') state.filters.set({ ...state.filters.get(), district: 'all', maxPrice: 0 })
        state.route.set(readRoute(`#${kind}`))
        location.hash = kind
        flushEffects()
      })
    })
    for (const input of $('[name="district"]', searchBar)) listen(input, 'click', () => {
      applyFilters(searchBar)
      openSearchStep('search-keywords')
    })
    for (const button of $('[data-search-next]', this)) listen(button, 'click', () => {
      if (button.dataset.searchNext === 'search-budget' && this.dataset.searchKind === 'roommates') searchBar.requestSubmit()
      else openSearchStep(button.dataset.searchNext)
    })
    const searchDock = required('.search-dock', this)
    const captureSearchLayout = () => {
      if (motion.reduced) return []
      const targets = $('.search-surface, .search-submit-surface, .search-segment:not([hidden]) .step-heading svg, .search-submit > svg', searchBar)
      const frames = targets.map(target => ({ target, before: target.getBoundingClientRect() })).filter(frame => frame.before.width && frame.before.height)
      for (const { target } of frames) motion.stop(target)
      return frames
    }
    const navbarEase = 'cubic-bezier(.25,.1,.25,1)'
    const animateSearchLayout = frames => {
      const measured = frames.map(frame => ({ ...frame, after: frame.target.getBoundingClientRect() }))
      for (const { target, before, after } of measured) {
        if (!target.isConnected || !after.width || !after.height) continue
        const surface = target.matches('.search-surface, .search-submit-surface')
        const dx = surface ? before.left - after.left : before.left + before.width / 2 - after.left - after.width / 2
        const dy = surface ? before.top - after.top : before.top + before.height / 2 - after.top - after.height / 2
        const sx = surface ? before.width / after.width : 1, sy = surface ? before.height / after.height : 1
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(sx - 1) + Math.abs(sy - 1) < .1) continue
        motion.play(target, { transform: [`translate(${dx}px,${dy}px) scale(${sx},${sy})`, 'none'] }, { duration: 480, ease: navbarEase })
      }
    }
    const positionSearchPanel = panel => {
      const trigger = required(`.search-segment[popovertarget="${panel.id}"]`, this)
      const bar = searchBar.getBoundingClientRect(), anchor = trigger.getBoundingClientRect()
      const top = Math.min(bar.bottom + 12, window.innerHeight - 180)
      panel.style.top = `${Math.max(16, top)}px`
      panel.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - panel.offsetWidth - 16))}px`
      panel.style.maxHeight = `${window.innerHeight - Math.max(16, top) - 16}px`
    }
    for (const panel of searchPanels) listen(panel, 'toggle', () => {
      const trigger = required(`.search-segment[popovertarget="${panel.id}"]`, this)
      const open = panel.matches(':popover-open')
      trigger.setAttribute('aria-expanded', String(open))
      if (!open) motion.stop(panel)
    })
    const updateSearchDock = () => {
      const compact = searchDock.getBoundingClientRect().top <= 0 && window.scrollY > 0
      if (compact !== searchDock.classList.contains('is-compact')) {
        const frames = captureSearchLayout()
        searchDock.classList.toggle('is-compact', compact)
        animateSearchLayout(frames)
        if (!compact) for (const value of $('.search-segment:not([hidden]) .search-value', searchBar)) motion.play(value, { opacity: [0, 1] }, { duration: 240, delay: 90, ease: navbarEase })
      }
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
    listen(this, 'click', event => {
      if (event.target.closest('.detail-save')) save(detailId)
      if (event.target.closest('.detail-collapse') && expandedCard) {
        const id = detailId
        motion.play(expandedCard, { opacity: [getComputedStyle(expandedCard).opacity, 0] }, { duration: 160, onComplete: () => {
          if (state.route.get().page === 'detail' && state.route.get().id === id) location.hash = this.previousPage
        } })
      }
      if (event.target.closest('.detail-map')) {
        const map = required('.browse-map', this)
        location.hash = 'map'
        state.route.set(readRoute('#map')); flushEffects()
        map.focusListing?.(detailId)
      }
    })
    const placeExpandedCard = card => {
      const grid = required('.listing-grid', this)
      const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length
      const index = Number(card.dataset.resultIndex || 0)
      // Сонгосон card-ийг анхны мөрийн эхэнд тавина; дараалсан сонголт мөр доошлуулж хуримтлуулахгүй.
      card.style.order = String(Math.floor(index / columns) * columns * 2 - 1)
    }
    listen(window, 'resize', () => { if (expandedCard) placeExpandedCard(expandedCard) })
    const setExpandedCard = (card, item) => {
      if (expandedCard === card) { if (card) placeExpandedCard(card); return }
      const anchor = card || expandedCard, anchorBefore = anchor?.getBoundingClientRect()
      if (expandedCard) {
        expandedCard.querySelector('hamtry-move-in-picker')?.close()
        expandedCard.classList.remove('is-expanded')
        expandedCard.style.order = String(Number(expandedCard.dataset.resultIndex || 0) * 2)
        const content = expandedCard.querySelector('.detail-content')
        if (content) content.hidden = true
        required('.card-title', expandedCard).setAttribute('aria-expanded', 'false')
      }
      expandedCard = card
      if (card) {
        let content = card.querySelector('.detail-content')
        if (!content) {
          content = document.createElement('section'); content.className = 'detail-content'
          content.id = `detail-${item.id}`; content.setAttribute('aria-label', item.title)
          card.append(content)
          this.renderDetail(content, item, true)
        }
        content.hidden = false
        card.classList.add('is-expanded')
        placeExpandedCard(card)
        const link = required('.card-title', card)
        link.setAttribute('aria-expanded', 'true'); link.setAttribute('aria-controls', content.id)
      }
      // Grid дахин байрлахад сонгосон card-ийн viewport өндөр хэвээр үлдэнэ.
      if (anchorBefore && anchor?.isConnected && anchorBefore.bottom > 0 && anchorBefore.top < innerHeight) {
        const shift = anchor.getBoundingClientRect().top - anchorBefore.top
        if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' })
      }
      if (anchor?.isConnected) motion.play(anchor, { opacity: [0, 1] }, { duration: 300, ease: 'cubic-bezier(.25,.1,.25,1)' })
      if (card) required('.detail-collapse', card).focus({ preventScroll: true })
      else if (anchor?.isConnected) required('.card-title', anchor).focus({ preventScroll: true })
    }
    useEffect(() => {
      const route = state.route.get()
      const page = route.page === 'detail' ? this.previousPage : route.page
      const kind = page === 'map' || page === 'list' ? 'rooms' : page === 'rooms' || page === 'roommates' ? page : state.kind.get()
      const savedPage = page === 'saved', dashboard = page === 'dashboard'
      const searchFrames = this.dataset.searchKind && this.dataset.searchKind !== kind ? captureSearchLayout() : []
      this.dataset.searchKind = kind
      for (const id of ['search-district', 'search-budget']) {
        required(`.search-segment[popovertarget="${id}"]`, this).hidden = kind === 'roommates'
        if (kind === 'roommates') required(`#${id}`, this).hidePopover()
      }
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
      updateNavIndicator()
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
      const searchFilter = kind === 'roommates' ? { ...filter, district: 'all', maxPrice: 0 } : filter
      const items = dashboard ? all.filter(item => item.id.startsWith('local-')) : findListings(all, searchFilter, savedPage ? null : kind, savedPage ? saved : null)
      const matches = savedPage || dashboard ? findListings(all, searchFilter, kind) : items
      const searchLabel = `${matches.length} ${kind === 'roommates' ? 'хамтрагч' : 'өрөө'} харах`
      text(this, '.search-submit-label', searchLabel)
      if (lastSearchLabel && lastSearchLabel !== searchLabel && !searchDock.classList.contains('is-compact')) motion.play(required('.search-submit-label', this), { opacity: [.45, 1], transform: ['translateY(3px)', 'none'] }, { duration: 220, ease: navbarEase })
      lastSearchLabel = searchLabel
      required('.search-submit', this).setAttribute('aria-label', searchLabel)
      text(this, '.finish-search', searchLabel)
      text(this, '[data-search-next="search-budget"]', kind === 'roommates' ? searchLabel : 'Үргэлжлүүлэх')
      const located = items.filter(item => validLocation(item.location))
      required('.browse-map', this).listings = located
      required('.listing-grid', this).hidden = roomMap && Boolean(located.length) && route.page !== 'detail'
      required('.map-location-note', this).hidden = !roomMap || kind !== 'roommates' || Boolean(located.length) || !items.length
      if (route.page === 'detail') required('.browse-map', this).selectedId = route.id
      text(this, '.result-count', `${items.length} ${savedPage ? 'хадгалсан сонголт' : dashboard ? 'туршилтын зар' : 'сонголт'}`)
      for (const count of $('.saved-count', this)) { count.textContent = saved.length; count.dataset.empty = String(saved.length === 0) }
      for (const button of $('[data-role]', this)) button.setAttribute('aria-pressed', String(button.dataset.role === state.role.get()))
      const nodes = items.map((item, index) => {
        if (!this.cards.has(item.id)) this.cards.set(item.id, this.makeCard(item))
        const card = this.cards.get(item.id)
        card.dataset.resultIndex = String(index)
        if (card !== expandedCard) card.style.order = String(index * 2)
        card.saved = saved.includes(item.id); return card
      })
      required('.listing-results', this).hidden = roomMap && Boolean(located.length) && route.page !== 'detail'
      const ids = items.map(item => item.id).join(',')
      // Save хийхэд grid дахин зурахгүй: keyboard focus, component state хадгалагдана.
      if (ids !== lastIds) {
        const grid = required('.listing-grid', this)
        const oldIds = new Set((lastIds || '').split(','))
        const previous = new Map(!roomMap && !motion.reduced ? [...grid.children].slice(0, 8).map(node => [node, node.getBoundingClientRect()]) : [])
        for (const node of grid.children) motion.stop(node)
        grid.replaceChildren(...nodes); lastIds = ids
        if (!roomMap) {
          const visible = nodes.slice(0, 8).map(node => ({ node, bounds: node.getBoundingClientRect() })).filter(({ bounds }) => bounds.top < innerHeight && bounds.bottom > 0)
          visible.forEach(({ node, bounds }, index) => {
            const before = previous.get(node)
            if (before && oldIds.has(node.dataset.id)) {
              const dx = before.left - bounds.left, dy = before.top - bounds.top
              if (Math.abs(dx) + Math.abs(dy) > 1) motion.play(node, { transform: [`translate(${dx}px,${dy}px)`, 'none'] }, { duration: 260 })
            } else motion.play(node, { opacity: [.65, 1], transform: ['translateY(10px)', 'none'] }, { duration: 240, delay: Math.min(index * 25, 100) })
          })
        }
      }
      const empty = required('.empty-state', this); empty.hidden = Boolean(items.length)
      text(empty, 'h3', savedPage ? 'Таалагдсан сонголтоо энд хадгалаарай.' : dashboard ? 'Таны анхны зар энд харагдана.' : 'Тохирох сонголт олдсонгүй.')
      text(empty, 'p', savedPage ? 'Өрөө эсвэл хамтрагчийн картын зүрхэн дээр дараарай.' : dashboard ? 'Өрөөний мэдээллээ бэлдэж, урьдчилан хараад хадгалаарай.' : 'Төсөв, нөхцөлөө өөрчилж эсвэл шүүлтүүрээ цэвэрлээд үзээрэй.')
      text(empty, '.empty-action', savedPage ? 'Өрөөнүүд үзэх' : dashboard ? 'Анхны өрөөгөө нэмэх' : 'Шүүлтүүр цэвэрлэх')
      if (route.page === 'detail') {
        const item = all.find(item => item.id === route.id)
        if (!item) {
          location.replace('#rooms'); toast('Энэ зар олдсонгүй. Өөр сонголт үзээрэй.'); return
        }
        detailId = item.id
        if (!this.cards.has(item.id)) this.cards.set(item.id, this.makeCard(item))
        const card = this.cards.get(item.id), grid = required('.listing-grid', this)
        if (!grid.contains(card)) grid.append(card)
        setExpandedCard(card, item)
        if (roomMap) {
          const pane = required('.listing-results', this)
          pane.scrollTop += card.getBoundingClientRect().top - pane.getBoundingClientRect().top
        }
        text(card, '.detail-save', saved.includes(item.id) ? 'Хадгалсан ♥' : 'Хадгалах ♡')
      } else {
        setExpandedCard(null)
        const grid = required('.listing-grid', this)
        for (const card of grid.children) if (!nodes.includes(card)) card.remove()
      }
      animateSearchLayout(searchFrames)
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
    const link = document.createElement('a'); link.href = `#listing/${item.id}`; link.className = 'card-title'; link.slot = 'heading'; link.setAttribute('aria-expanded', 'false'); link.textContent = item.title; link.setAttribute('aria-label', `${item.title} — Дэлгэрэнгүй үзэх`)
    extras.append(tags); card.append(link, extras)
    // Listener нь card-той хамт эзэмшигдэнэ; page reconnect үед давхар нэмэхгүй.
    card.addEventListener('hamtry-save', () => this.saveListing?.(item.id))
    card.addEventListener('click', event => {
      if (card.classList.contains('is-expanded') || event.composedPath().some(node => node instanceof Element && node.matches('button, a, input, select, textarea'))) return
      if (window.getSelection()?.toString()) return
      location.hash = `listing/${item.id}`
    })
    return card
  }
  renderDetail(root, item, actions, previewRecords = []) {
    // Зар/хэрэглэгчийн текстийг зөвхөн textContent-оор оруулна; innerHTML нь static skeleton.
    root.innerHTML = (actions ? '<button type="button" class="detail-collapse" aria-label="Хураах" title="Хураах">' + searchIcon('close') + '</button>' : '') + '<div class="detail-layout"><div class="detail-media"></div><div class="detail-info"><h3></h3><p class="detail-location"></p><div class="detail-owner"><span class="owner-avatar" aria-hidden="true"></span><div><strong class="owner-name"></strong><small class="owner-description"></small></div><span class="contact-concept" role="img" aria-label="Мессеж бичих — Тун удахгүй" aria-disabled="true" title="Мессеж бичих — Тун удахгүй">' + searchIcon('message') + '</span></div><div class="detail-summary">' + searchIcon('money') + '<strong class="detail-price"></strong><span class="price-period">/сар</span></div><p class="detail-description"></p><div class="detail-facts"><div><span class="detail-size-label"></span><strong class="detail-size"></strong></div><hamtry-move-in-picker></hamtry-move-in-picker></div><div class="detail-traits" aria-label="Нөхцөл"></div>' + (actions ? '<div class="detail-actions"><hamtry-button class="detail-save">Хадгалах ♡</hamtry-button>' + (validLocation(item.location) ? '<button type="button" class="detail-map">' + searchIcon('map') + 'Map</button>' : '') + '</div>' : '') + '</div></div>'
    const media = required('.detail-media', root)
    if (item.kind === 'rooms') {
      const tour = document.createElement('hamtry-photo-tour')
      tour.setAttribute('hide-single-room-label', '')
      // Preview нь санах ой дахь thumbnail; хадгалсан tour нь IndexedDB Blob-оо уншина.
      tour.rooms = item.rooms?.length ? item.rooms.map(room => ({ ...room, photos: room.photos.map(photo => {
        const preview = previewRecords.find(record => record.id === photo.id)
        return preview ? { ...photo, src: preview.cover } : photo
      }) })) : item.id.startsWith('local-') ? [] : [{ id: 'example-room', name: 'Өрөө', photos: [{ src: item.image, caption: 'Жишээ интерьер' }] }]
      media.append(tour)
    } else { const image = document.createElement('img'); image.className = 'detail-image'; image.src = item.image; image.alt = item.imageAlt; media.append(image) }
    required('.detail-summary', root).setAttribute('aria-label', item.kind === 'rooms' ? 'Сарын түрээс' : 'Сарын төсөв')
    text(root, '.detail-price', money(item.price))
    text(root, 'h3', item.title); text(root, '.detail-location', `${item.district} · ${item.area}`)
    text(root, '.detail-description', item.description)
    const picker = required('hamtry-move-in-picker', root)
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(item.available)) picker.setAttribute('min', item.available.replaceAll('.', '-'))
    text(root, '.detail-size-label', item.kind === 'rooms' ? 'Талбай' : 'Мэргэжил')
    text(root, '.detail-size', item.size)
    const owner = item.kind === 'roommates' ? item.title.split(',')[0] : item.owner || (item.id.startsWith('local-') ? 'Та' : 'Жишээ эзэн')
    text(root, '.owner-name', owner)
    text(root, '.owner-avatar', owner.slice(0, 1))
    text(root, '.owner-description', item.kind === 'roommates' ? item.size : '')
    required('.owner-description', root).hidden = item.kind !== 'roommates'
    const traits = required('.detail-traits', root)
    const icons = { 'Тамхи татдаггүй': 'smokeFree', 'Амьтан зөвшөөрнө': 'pets', 'Амьтанд дуртай': 'pets', 'Тавилгатай': 'furnished', 'Wi-Fi': 'wifi', 'Цэвэрч': 'clean', 'Гэрээс ажилладаг': 'work', 'Ажлын ширээ': 'work' }
    for (const trait of item.traits) {
      const chip = document.createElement('span')
      chip.innerHTML = searchIcon(icons[trait] || 'conditions')
      chip.append(document.createTextNode(trait)); traits.append(chip)
    }
  }
}
