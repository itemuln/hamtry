import { Scope, $, listen, onCleanup, required, untrack, useEffect } from '@hamtry/library'
import { districts, listings, roomImage } from '../data/listings.js'
import { findListings, initialFilters, money, readRoute } from '../state/model.js'
import { createAppState } from '../state/store.js'

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
      <a class="skip-link" href="#results">Зарууд руу очих</a>
      <header class="site-header">
        <a class="wordmark" href="#home" aria-label="Hamtry нүүр"><span class="brand-mark" aria-hidden="true">h.</span>hamtry<span class="brand-period">.</span></a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Цэс нээх">☰</button>
        <nav id="main-nav" aria-label="Үндсэн цэс"><a href="#rooms" data-nav="rooms">Өрөөнүүд</a><a href="#roommates" data-nav="roommates">Хамтрагчид</a><a href="#saved" data-nav="saved">Хадгалсан <span class="saved-count">0</span></a><a href="#dashboard" data-nav="dashboard" class="dashboard-link" hidden>Миний зарууд</a></nav>
        <button type="button" class="profile-button" data-action="profile"><span aria-hidden="true">◎</span> Миний орон зай</button>
      </header>
      <main>
        <section class="home-hero" aria-labelledby="hero-title">
          <div class="hero-inner"><div class="hero-copy"><p class="eyebrow"><span class="tiny-star" aria-hidden="true">✳</span> ХАМТДАА АМЬДРАХАД ИЛҮҮ АМАР</p>
            <h1 id="hero-title">Нэг орон зай.<br><span>Шинэ эхлэл.</span></h1>
            <p class="hero-description">Өөрт тохирох өрөө, өөрийн хэмнэлтэй хамтрагчаа ол. Хамтын амьдрал эндээс эхэлнэ.</p>
            <a class="hero-link" href="#roommates">Хамтрагчтай танилцах <span aria-hidden="true">↗</span></a>
            <div class="hero-caption"><span class="orbit-symbol" aria-hidden="true">↗</span><p>Өөрийн булан.<br>Хамтын дурсамж.</p></div>
          </div><hamtry-hero-scene></hamtry-hero-scene></div>
          <div class="search-wrap"><div class="search-kind" role="group" aria-label="Хайх төрөл"><button type="button" data-kind="rooms">Өрөө хайх</button><button type="button" data-kind="roommates">Хамтрагч хайх</button></div>
            <form class="hero-search"><hamtry-select name="district" label="Байршил">${districtOptions}</hamtry-select><hamtry-select name="maxPrice" label="Сарын төсөв">${budgets}</hamtry-select><hamtry-button type="submit" size="lg">Хайж эхлэх <span aria-hidden="true">↗</span></hamtry-button></form>
          </div>
        </section>
        <section class="listing-section page-width" id="results" aria-labelledby="results-title">
          <div class="section-heading"><div><p class="eyebrow result-kicker">ТАНЫ ДАРААГИЙН ОРОН ЗАЙ</p><h2 id="results-title">Тухтай булангаа олоорой<span class="heading-dot">.</span></h2></div><a class="all-listings" href="#rooms">Бүх өрөөг үзэх <span aria-hidden="true">↗</span></a><hamtry-button class="new-listing" data-action="publish" hidden>Өрөө нэмэх +</hamtry-button></div>
          <div class="browse-types" role="group" aria-label="Зарын төрөл"><button type="button" data-kind="rooms">Өрөөнүүд</button><button type="button" data-kind="roommates">Хамтрагчид</button></div>
          <form class="filter-bar" aria-label="Зарын шүүлтүүр"><hamtry-input name="query" label="Түлхүүр үг" placeholder="Байршил, хэв маяг…"></hamtry-input><hamtry-select name="district" label="Дүүрэг">${districtOptions}</hamtry-select><hamtry-select name="maxPrice" label="Төсөв">${budgets}</hamtry-select><hamtry-chip class="pet-filter">Амьтан зөвшөөрнө</hamtry-chip><button class="text-button reset-filters" type="button">Цэвэрлэх</button><button class="filter-submit" type="submit">Шүүх</button></form>
          <div class="results-meta"><p class="result-count" role="status" aria-live="polite"></p><span>Хичээлийн жишээ зарууд</span></div>
          <div class="listing-grid"></div>
          <div class="empty-state" hidden><span aria-hidden="true">⌂</span><h3></h3><p></p><hamtry-button class="empty-action">Шүүлтүүр цэвэрлэх</hamtry-button></div>
        </section>
        <section class="how-section page-width" aria-labelledby="how-title"><div class="section-heading"><div><p class="eyebrow">ӨӨРИЙН ХЭМНЭЛЭЭР</p><h2 id="how-title">Хамтрахад гурван алхам<span class="heading-dot">.</span></h2></div><span class="how-symbol" aria-hidden="true">✳</span></div>
          <div class="steps"><article><span class="step-number">01 / ХАЙХ</span><h3>Өөрийн орон зайг ол.</h3><p>Байршил, сарын төсөв, амьдралын хэв маягаар сонголтоо нарийсга.</p></article><article><span class="step-number">02 / ТАНИЛЦАХ</span><h3>Тохирох хүнээ мэдэр.</h3><p>Профайл, нүүх хугацаа, хамтын амьдралын нөхцөлийг тайван харьцуул.</p></article><article><span class="step-number">03 / СОНГОХ</span><h3>Шинэ эхлэлээ төлөвлө.</h3><p>Таалагдсан сонголтоо хадгалаад, төсөв болон өдөр тутмын дүрмээ ярилц.</p></article></div>
        </section>
        <section class="provider-section page-width"><div><p class="eyebrow">ХУВААЛЦАХ ОРОН ЗАЙ БАЙНА УУ?</p><h2>Сул өрөө.<br>Шинэ танил.</h2><p>Өрөөнийхөө мэдээллийг бэлдээд,<br>хамт амьдрах хүнээ хайж эхлээрэй.</p><hamtry-button data-action="publish" size="lg">Өрөөгөө санал болгох ↗</hamtry-button></div><div class="provider-art" aria-hidden="true"><div class="door"><span>hello<br>roomie.</span><i></i></div><span class="door-star">✳</span></div></section>
      </main>
      <footer class="page-width"><a class="wordmark" href="#home">hamtry.</a><p>Өөрийн орон зай. Хамтын амьдрал.</p><div><a href="/components.html">Компонентууд</a><a href="/editor.html">Дизайн систем</a></div><small>Хичээлийн туршилтын хувилбар · Бодит захиалга, төлбөр, хэрэглэгчийн бүртгэлгүй.</small></footer>
      <div class="toast" role="status" aria-live="polite" hidden></div>
      <hamtry-dialog class="detail-dialog" heading="Зарын дэлгэрэнгүй"><div class="detail-content"></div></hamtry-dialog>
      <hamtry-dialog class="profile-dialog" heading="Миний орон зай"><p>Та өнөөдөр юу хийхийг хүсэж байна?</p><div class="role-choices"><button type="button" data-role="seeker"><span>⌕</span><strong>Өрөө, хамтрагч хайх</strong><small>Сонголтоо хайж, хадгалах</small></button><button type="button" data-role="provider"><span>⌂</span><strong>Өрөө санал болгох</strong><small>Өрөөний мэдээллээ бэлдэх</small></button></div><p class="demo-note">Энэ бол жишээ горим. Сонголт зөвхөн энэ хөтөч дээр хадгалагдана; нэвтэрсэн бүртгэл үүсэхгүй.</p></hamtry-dialog>
      <hamtry-dialog class="publish-dialog" heading="Өрөөгөө санал болгох"><p class="demo-note">Туршилтын зар зөвхөн энэ хөтөч дээр харагдана. Жишээ зураг ашиглана.</p><form class="publish-form"><hamtry-input name="title" label="Зарын гарчиг" required maxlength="100" placeholder="Жишээ: Гэрэлтэй хувийн өрөө"></hamtry-input><hamtry-select name="district" label="Дүүрэг" required>${districts.map(name => `<option>${name}</option>`).join('')}</hamtry-select><hamtry-input name="price" type="number" label="Сарын түрээс (₮)" required min="1" max="100000000" step="1" placeholder="750000"></hamtry-input><hamtry-textarea name="description" label="Өрөө ба хамтын амьдралын нөхцөл" required maxlength="1500" placeholder="Өрөө, хамтын хэсэг, нүүх хугацаа, хэрэглээний зардлын талаар…"></hamtry-textarea><hamtry-button type="submit">Урьдчилан харах ↗</hamtry-button></form><div class="publish-preview" hidden><div class="preview-copy"></div><div class="dialog-actions"><hamtry-button variant="secondary" class="edit-draft">Засах</hamtry-button><hamtry-button class="confirm-publish">Энэ хөтөчид хадгалах</hamtry-button></div></div></hamtry-dialog>`
  }
  setup() {
    const { state } = this
    let toastTimer, draft, lastIds = null, detailId
    const detail = required('.detail-dialog', this), profile = required('.profile-dialog', this), publish = required('.publish-dialog', this)
    const toast = message => {
      clearTimeout(toastTimer)
      const node = required('.toast', this); node.textContent = message; node.hidden = false
      toastTimer = setTimeout(() => { node.hidden = true }, 3500)
    }
    onCleanup(() => { clearTimeout(toastTimer); detail.close(); profile.close(); publish.close() })
    const save = id => {
      const persisted = state.toggleSaved(id)
      toast(persisted ? state.saved.get().includes(id) ? 'Сонголт хадгалагдлаа ♥' : 'Хадгалсан сонголтоос хаслаа' : 'Энэ удаа хөтөч дээр хадгалж чадсангүй. Сонголт түр хадгалагдсан.')
    }
    this.saveListing = save
    onCleanup(() => { this.saveListing = undefined })
    listen(required('.skip-link', this), 'click', event => {
      event.preventDefault()
      const heading = required('#results-title', this)
      heading.tabIndex = -1; heading.focus(); heading.scrollIntoView()
    })
    const showPublish = () => {
      required('.publish-form', this).hidden = false; required('.publish-preview', this).hidden = true
      publish.showModal()
    }
    for (const node of $('[data-action]', this)) listen(node, 'click', () => node.dataset.action === 'profile' ? profile.showModal() : showPublish())
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
      if (!button.closest('.search-kind')) location.hash = button.dataset.kind
    })
    listen(required('.hero-search', this), 'submit', event => {
      event.preventDefault()
      const data = new FormData(event.target)
      state.filters.set({ ...initialFilters, district: data.get('district'), maxPrice: Number(data.get('maxPrice')) })
      location.hash = state.kind.get()
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
    listen(required('.publish-form', this), 'submit', event => {
      event.preventDefault()
      const data = new FormData(event.target)
      draft = { id: `local-${crypto.randomUUID()}`, title: String(data.get('title')).trim(), district: String(data.get('district')), price: Number(data.get('price')), description: String(data.get('description')).trim() }
      if (!draft.title || !draft.description) { toast('Гарчиг болон тайлбараа бөглөнө үү.'); return }
      this.renderDetail(required('.preview-copy', this), this.toListing(draft), false)
      event.target.hidden = true; required('.publish-preview', this).hidden = false
      required('.edit-draft', this).focus()
    })
    listen(required('.edit-draft', this), 'click', () => { showPublish(); required('[name="title"]', this).focus() })
    listen(required('.confirm-publish', this), 'click', () => {
      if (!draft) return
      if (state.published.get().length >= 20) { toast('Туршилтын 20 зарын хязгаарт хүрсэн байна.'); return }
      state.published.set(items => [draft, ...items]); state.role.set('provider')
      const persisted = state.persist(); draft = undefined
      publish.close(); required('.publish-form', this).reset(); location.hash = 'dashboard'
      toast(persisted ? 'Жишээ зар энэ хөтөч дээр хадгалагдлаа' : 'Зар энэ удаагийн үзүүлэнд нэмэгдлээ. Хөтөч дээр хадгалж чадсангүй.')
    })
    listen(required('.detail-content', this), 'click', event => { if (event.target.closest('.detail-save')) save(detailId) })
    useEffect(() => {
      const route = state.route.get(), kind = route.page === 'rooms' || route.page === 'roommates' ? route.page : state.kind.get()
      const page = route.page === 'detail' ? this.previousPage : route.page
      const home = page === 'home', savedPage = page === 'saved', dashboard = page === 'dashboard'
      required('#results-title', this).setAttribute('aria-level', home ? '2' : '1')
      if (route.page !== 'detail') this.previousPage = route.page
      this.dataset.page = page
      required('.home-hero', this).hidden = !home
      required('.how-section', this).hidden = !home; required('.provider-section', this).hidden = !home
      filters.hidden = home || dashboard
      required('.browse-types', this).hidden = savedPage || dashboard
      required('.all-listings', this).hidden = !home
      required('.new-listing', this).hidden = !dashboard
      for (const node of $('[data-nav]', this)) {
        if (node.dataset.nav === page) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current')
      }
      text(this, '#results-title', dashboard ? 'Миний өрөөнүүд.' : savedPage ? 'Таны хадгалсан сонголтууд.' : kind === 'roommates' ? 'Нэг хэмнэлтэй хүнээ олоорой.' : home ? 'Тухтай булангаа олоорой.' : 'Өөрийн өрөөг олоорой.')
      text(this, '.result-kicker', dashboard ? 'ӨРӨӨ САНАЛ БОЛГОХ' : savedPage ? 'ДАХИН ХАРАХАД ОЙРХОН' : 'ТАНЫ ДАРААГИЙН ОРОН ЗАЙ')
      for (const node of $('[data-kind]', this)) node.setAttribute('aria-pressed', String(node.dataset.kind === kind))
      const filter = state.filters.get(), saved = state.saved.get()
      // Control-ийн .value setter доторх getter-үүд page effect-ийн dependency болох ёсгүй.
      untrack(() => { for (const node of $('[name]', filters)) node.value = filter[node.getAttribute('name')] })
      required('.pet-filter', this).selected = filter.pets
      const all = [...listings, ...state.published.get().map(item => this.toListing(item))]
      const candidates = dashboard ? all.filter(item => item.id.startsWith('local-')) : findListings(all, home ? initialFilters : filter, savedPage ? null : kind, savedPage ? saved : null)
      const items = home ? candidates.slice(0, 3) : candidates
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
    return { ...item, kind: 'rooms', image: roomImage, imageAlt: 'Туршилтын зарын жишээ интерьер', area: 'Таны туршилтын зар', size: 'Өрөө', available: 'Тохиролцоно', traits: ['Энэ хөтөчийн зар'], pets: false }
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
  renderDetail(root, item, actions) {
    // Зар/хэрэглэгчийн текстийг зөвхөн textContent-оор оруулна; innerHTML нь static skeleton.
    root.innerHTML = '<img class="detail-image"><div class="detail-summary"><span class="detail-label"></span><strong></strong></div><h3></h3><p class="detail-location"></p><p class="detail-description"></p><dl><div><dt>Нүүх хугацаа</dt><dd class="detail-date"></dd></div><div><dt>Нөхцөл</dt><dd class="detail-traits"></dd></div></dl><p class="demo-note">Жишээ зар. Бодит холбоо барих, захиалах үйлчилгээ хараахан холбогдоогүй.</p>' + (actions ? '<hamtry-button class="detail-save">Сонголтоо хадгалах ♡</hamtry-button>' : '')
    const image = required('img', root); image.src = item.image; image.alt = item.imageAlt
    text(root, '.detail-label', item.kind === 'rooms' ? 'САРЫН ТҮРЭЭС' : 'САРЫН ТӨСӨВ'); text(root, 'strong', money(item.price))
    text(root, 'h3', item.title); text(root, '.detail-location', `${item.district} · ${item.area}`)
    text(root, '.detail-description', item.description); text(root, '.detail-date', item.available); text(root, '.detail-traits', item.traits.join(' · '))
  }
}
