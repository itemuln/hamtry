import brandHome from '../assets/dashboard/brand-home.svg'
import searchIcon from '../assets/dashboard/search.svg'
import bellIcon from '../assets/dashboard/bell.svg'
import plusIcon from '../assets/dashboard/plus.svg'
import { messagesMarkup, viewingsMarkup, setupAttention, characterMarkup, meetings, people } from './dashboard-attention.js'
import { verificationMarkup, setupVerification } from './selfie-verification.js'
import { calendarGrid } from '../state/model.js'
import { rentalRequests, requestedListing } from '../state/dashboard-requests.js'
import { meetingSheetMarkup, setupMeetingSheet } from './meeting-sheet.js'
import { requestDetailsMarkup, setupRequestDetails, updateRequestRows } from './request-details.js'
import { documentsMarkup, setupDocuments } from './contract-documents.js'

const icon = (src, alt = '') => `<img src="${src}" alt="${alt}">`


export function dashboardMarkup() {
  return `<section class="provider-dashboard" id="dashboard-top" aria-label="Миний зарууд" tabindex="-1" hidden>
    <header class="dashboard-mobile-header"><a href="#rooms">hamtry</a></header>
    <div class="dashboard-layout">
      <div class="dashboard-workspace">
        <header class="dashboard-utility"><a class="dashboard-brand" href="#rooms">${icon(brandHome)}<span>hamtry</span></a><hamtry-navbar class="provider-navbar" label="Түрээслүүлэгчийн үндсэн цэс"></hamtry-navbar><button class="dashboard-icon-button" type="button" data-notifications data-dashboard-scroll="dashboard-messages" aria-label="Мэдэгдэл">${icon(bellIcon)}<span class="dashboard-count" data-notification-count>0</span></button><button class="dashboard-profile" type="button" data-dashboard-profile>Миний орон зай</button></header>
        <div class="dashboard-home-panel" data-provider-section="home"><div class="dashboard-heading"><label class="dashboard-search">${icon(searchIcon)}<span class="sr-only">Зар, хүсэлт хайх</span><input type="search" placeholder="Зар, хүсэлт, хүн хайх…"></label><hamtry-button class="dashboard-add" data-dashboard-publish>${icon(plusIcon)}Шинэ зар нэмэх</hamtry-button></div>
        <div class="dashboard-metrics" aria-label="Товч мэдээлэл"><article><strong>Идэвхтэй зар</strong><b data-listing-count>0</b><small data-listing-summary></small></article><article class="dashboard-metric-new-requests"><strong>Шинэ хүсэлт</strong><b data-request-count>0</b><small data-request-summary>Хүсэлт алга</small></article><article class="dashboard-views-metric"><strong>Зарын үзэлт</strong><b>—</b><small>Үзэлтийн мэдээлэл хараахан байхгүй.</small></article><article class="dashboard-metric-unread-messages"><strong>Уншаагүй мессеж</strong><b data-unread-count>0</b><small data-unread-summary>Мессеж алга</small></article></div>
        <div class="dashboard-columns"><div class="dashboard-main-column">
          <section class="dashboard-panel dashboard-listings" id="dashboard-listings" aria-labelledby="dashboard-listings-title"><div class="dashboard-panel-heading"><h2 id="dashboard-listings-title">Миний зарууд</h2><button type="button" data-listings-all>Бүгдийг харах</button></div><div class="dashboard-filters" role="group" aria-label="Зарын төлөв"><hamtry-chip selected data-filter="all">Бүгд <span data-all-count>0</span></hamtry-chip><hamtry-chip data-filter="active">Идэвхтэй <span data-active-count>0</span></hamtry-chip><hamtry-chip data-filter="draft">Ноорог <span data-draft-count>0</span></hamtry-chip></div><p class="dashboard-map-hint">Газрын зураг дээрх тэмдэг дээр дарж зарыг харна.</p><hamtry-immersive-map class="dashboard-property-map" embedded aria-label="Миний заруудын газрын зураг"></hamtry-immersive-map><p class="dashboard-empty" hidden>Илэрц олдсонгүй.</p></section>

          <section class="dashboard-panel dashboard-inquiries" id="dashboard-inquiries" aria-labelledby="dashboard-inquiries-title"><div class="dashboard-panel-heading"><h2 id="dashboard-inquiries-title" tabindex="-1">Хариу хүлээсэн хүсэлтүүд <span class="dashboard-count" data-request-count>0</span></h2><button type="button" data-requests-all>Бүгдийг харах</button></div><div class="dashboard-inquiry-list">${rentalRequests.map(request => { const person = people.find(person => person.id === request.person); return `<div class="dashboard-inquiry" data-request-id="${request.id}">${characterMarkup(person.id)}<span class="dashboard-inquiry-name"><strong>${person.name}</strong><small>${requestedListing(person.id, []).title}</small><small data-inquiry-state>Хариу хүлээж байна</small></span><time>${request.received}</time><hamtry-button variant="outline" data-request-open="${request.id}">Хариу өгөх</hamtry-button></div>` }).join('')}</div><p class="dashboard-request-empty" role="status" hidden></p></section>
        </div><div class="dashboard-side-column">
          <section class="dashboard-panel dashboard-calendar" aria-label="Уулзалтын хуанли"><div class="dashboard-calendar-head"><h2></h2><div><button type="button" data-month="-1" aria-label="Өмнөх сар">‹</button><button type="button" data-month="1" aria-label="Дараах сар">›</button></div></div><div class="dashboard-weekdays"><span>Да</span><span>Мя</span><span>Лх</span><span>Пү</span><span>Ба</span><span>Бя</span><span>Ня</span></div><div class="dashboard-days"></div><hamtry-button class="dashboard-schedule" data-meeting-open>＋ &nbsp; Уулзалт товлох</hamtry-button></section>
          ${viewingsMarkup()}
          ${verificationMarkup()}
        </div></div>
        </div>
        ${documentsMarkup()}
        <section class="provider-chat" data-provider-section="chat" aria-label="Чат" hidden><h1 tabindex="-1">Чат</h1>${messagesMarkup()}</section>
        <p class="dashboard-demo-note">Хүсэлт, мессеж, уулзалтын үйлчилгээ тун удахгүй.</p>
      </div>
    </div>
    <footer class="dashboard-footer"><strong>hamtry</strong><nav aria-label="Нэмэлт холбоос"><button type="button" data-demo="Тухай">Тухай</button> · <button type="button" data-demo="Тусламж">Тусламж</button> · <button type="button" data-demo="Аюулгүй байдал">Аюулгүй байдал</button> · <button type="button" data-demo="Нууцлал">Нууцлал</button> · <button type="button" data-demo="Үйлчилгээний нөхцөл">Үйлчилгээний нөхцөл</button></nav><small>© 2026 hamtry.</small></footer>

    ${meetingSheetMarkup()}
    ${requestDetailsMarkup()}
  </section>`
}

function renderCalendar(root, month) {
  const year = month.getFullYear(), index = month.getMonth()
  root.querySelector('.dashboard-calendar-head h2').textContent = `${year} оны ${index + 1} сар`
  const days = root.querySelector('.dashboard-days')
  days.replaceChildren()
  for (const day of calendarGrid(year, index)) {
    const cell = document.createElement('span')
    if (day === null) { days.append(cell); continue }
    cell.textContent = day
    if (meetings.some(meeting => meeting.start.getFullYear() === year && meeting.start.getMonth() === index && meeting.start.getDate() === day)) cell.className = 'has-viewing'
    days.append(cell)
  }
}

export function setupDashboard(root, { showPublish, toast, listen }) {
  const dashboard = root.querySelector('.provider-dashboard')
  const navbar = dashboard.querySelector('.provider-navbar')
  navbar.items = [
    { id: 'home', label: 'Нүүр хуудас', icon: 'home', href: '#dashboard' },
    { id: 'documents', label: 'Баримт бичиг', icon: 'document', href: '#dashboard/documents' },
    { id: 'chat', label: 'Чат', icon: 'chat', href: '#dashboard/chat' },
  ]
  setupDocuments(dashboard, listen)
  let month = new Date()
  let filter = 'all'
  const refreshAttention = setupAttention(dashboard, listen)
  setupRequestDetails(root, { listen, onDecision: refreshAttention })
  setupMeetingSheet(dashboard, {
    listen,
    getListings: () => root.state.published.get(),
    onScheduled: meeting => {
      const row = dashboard.querySelector('.dashboard-viewing').cloneNode(true)
      row.dataset.meeting = meetings.length - 1
      const character = dashboard.querySelector(`.meeting-contact [data-person="${meeting.person}"]`).cloneNode(true)
      row.querySelector('.dashboard-character').replaceWith(character)
      row.querySelector('strong').textContent = people.find(person => person.id === meeting.person).name
      const time = row.querySelector('time')
      const clock = date => date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false })
      time.dateTime = meeting.start.toISOString()
      time.textContent = `${meeting.start.toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' })} · ${clock(meeting.start)} – ${clock(new Date(meeting.start.getTime() + meeting.duration * 60000))}`
      row.querySelector('small').textContent = meeting.listing
      if (meeting.note) {
        const note = document.createElement('small'); note.className = 'dashboard-meeting-note'; note.textContent = meeting.note
        row.querySelector('.dashboard-viewing-copy').append(note)
      }
      const viewings = dashboard.querySelector('.dashboard-viewings')
      viewings.insertBefore(row, viewings.querySelector(':scope > p'))
      month = new Date(meeting.start.getFullYear(), meeting.start.getMonth(), 1)
      renderCalendar(dashboard, month)
      refreshAttention()
      toast('Уулзалт товлогдлоо. Хуанлид нэмэгдлээ.')
    },
  })
  setupVerification(root, listen)
  renderCalendar(dashboard, month)
  for (const button of dashboard.querySelectorAll('[data-month]')) listen(button, 'click', () => {
    month = new Date(month.getFullYear(), month.getMonth() + Number(button.dataset.month), 1)
    renderCalendar(dashboard, month)
  })
  for (const button of dashboard.querySelectorAll('[data-dashboard-publish]')) listen(button, 'click', showPublish)
  for (const button of dashboard.querySelectorAll('[data-dashboard-profile]')) listen(button, 'click', () => root.querySelector('.profile-dialog').showModal())
  for (const button of dashboard.querySelectorAll('[data-dashboard-scroll]')) listen(button, 'click', () => {
    if (button.dataset.dashboardScroll === 'dashboard-messages') { location.hash = 'dashboard/chat'; return }
    const target = dashboard.querySelector(`#${button.dataset.dashboardScroll}`)
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    target.querySelector('h2')?.focus({ preventScroll: true })
  })
  for (const button of dashboard.querySelectorAll('[data-demo]')) listen(button, 'click', () => toast(`${button.dataset.demo}: демо мэдээлэл; бодит үйлчилгээ холбогдоогүй.`))
  for (const chip of dashboard.querySelectorAll('[data-filter]')) listen(chip, 'hamtry-toggle', () => {
    filter = chip.dataset.filter
    for (const item of dashboard.querySelectorAll('[data-filter]')) item.selected = item === chip
    updateDashboard(root, root.state.published.get(), filter)
  })
  listen(dashboard.querySelector('[data-listings-all]'), 'click', () => {
    filter = 'all'
    for (const item of dashboard.querySelectorAll('[data-filter]')) item.selected = item.dataset.filter === 'all'
    updateDashboard(root, root.state.published.get(), filter)
  })
  listen(dashboard.querySelector('.dashboard-search input'), 'input', () => updateDashboard(root, root.state.published.get(), filter))
}

export function updateDashboard(root, published, filter = root.querySelector('.dashboard-filters [selected]')?.dataset.filter || 'all') {
  const dashboard = root.querySelector('.provider-dashboard')
  const section = root.state.route.get().section || 'home'
  for (const panel of dashboard.querySelectorAll('[data-provider-section]')) panel.hidden = panel.dataset.providerSection !== section
  dashboard.querySelector('.provider-navbar').active = section
  const entries = published.map(item => ({ ...item, detail: item.district }))
  dashboard.querySelector('[data-listing-count]').textContent = String(entries.filter(item => item.status === 'published').length)
  dashboard.querySelector('[data-all-count]').textContent = entries.length
  dashboard.querySelector('[data-active-count]').textContent = entries.filter(item => item.status === 'published').length
  dashboard.querySelector('[data-draft-count]').textContent = entries.filter(item => item.status === 'draft').length
  dashboard.querySelector('[data-listing-summary]').textContent = `${entries.filter(item => item.kind === 'rooms').length} өрөө · ${entries.filter(item => item.kind === 'roommates').length} хамтрагч`
  const query = dashboard.querySelector('.dashboard-search input').value.trim().toLocaleLowerCase('mn')
  const visible = entries.filter(item => (filter === 'all' || item.status === (filter === 'active' ? 'published' : 'draft')) && `${item.title} ${item.detail}`.toLocaleLowerCase('mn').includes(query))
  updateRequestRows(dashboard)
  const map = dashboard.querySelector('.dashboard-property-map')
  map.listings = visible
  map.hidden = visible.length === 0
  dashboard.querySelector('.dashboard-map-hint').hidden = visible.length === 0
  dashboard.querySelector('.dashboard-empty').hidden = visible.length > 0
}
