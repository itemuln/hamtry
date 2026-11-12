import { onCleanup } from '@hamtry/library'
import { people, meetings } from './dashboard-attention.js'
import { rentalRequests, requestStatus, pendingRequests, decideRequest, meetingsForRequest } from '../state/dashboard-requests.js'
import './request-details.css'

const statusLabels = { pending: 'Хариу хүлээж байна', accepted: 'Зөвшөөрсөн', rejected: 'Татгалзсан' }

export function requestDetailsMarkup() {
  return `<hamtry-dialog class="request-dialog" heading="Хүсэлтийн дэлгэрэнгүй">
    <div class="request-detail-layout">
      <section class="request-profile-panel" aria-label="Харилцагчийн профайл"><p class="request-eyebrow">ХАРИЛЦАГЧИЙН ПРОФАЙЛ</p><div class="request-profile"></div></section>
      <section class="request-overview" aria-labelledby="request-overview-title"><div class="request-overview-heading"><h3 id="request-overview-title">Өрөөний хүсэлт</h3><span class="request-state" data-request-state></span></div>
        <div class="request-property"><span>Сонирхож буй өрөө</span><strong data-request-listing></strong><small data-request-received></small></div>
        <section class="request-meetings" aria-labelledby="request-meetings-title"><h3 id="request-meetings-title">Товлосон уулзалт</h3><ul data-request-meetings></ul><p data-no-request-meetings hidden>Одоогоор уулзалт товлоогүй байна.</p></section>
        <p class="request-feedback" role="status" aria-live="polite"></p>
        <div class="request-decision-actions"><hamtry-button type="button" size="sm" data-request-decision="accepted">✓ Зөвшөөрөх</hamtry-button><hamtry-button type="button" size="sm" variant="outline" data-request-decision="rejected">Татгалзах</hamtry-button></div>
        <hamtry-button type="button" size="sm" variant="ghost" class="request-close" data-request-close>Хаах</hamtry-button>
        <small class="request-local-note">Жишээ хүсэлт · Бодит хэрэглэгчид мэдэгдэл илгээхгүй.</small>
      </section>
    </div>
  </hamtry-dialog>`
}

export function updateRequestRows(dashboard) {
  const pending = pendingRequests().length
  for (const count of dashboard.querySelectorAll('[data-request-count]')) count.textContent = pending
  dashboard.querySelector('[data-request-summary]').textContent = pending ? `${pending} хүсэлт хариу хүлээж байна` : 'Бүх хүсэлтэд хариу өгсөн'
  const panel = dashboard.querySelector('.dashboard-inquiries')
  const all = panel.dataset.requestView === 'all'
  const query = dashboard.querySelector('.dashboard-search input').value.trim().toLocaleLowerCase('mn')
  let visible = 0
  for (const row of panel.querySelectorAll('[data-request-id]')) {
    const request = rentalRequests.find(item => item.id === row.dataset.requestId)
    const status = requestStatus(request)
    const state = row.querySelector('[data-inquiry-state]')
    state.textContent = statusLabels[status]; state.dataset.status = status
    row.querySelector('[data-request-open]').textContent = status === 'pending' ? 'Хариу өгөх' : 'Дэлгэрэнгүй'
    row.hidden = (!all && status !== 'pending') || !row.textContent.toLocaleLowerCase('mn').includes(query)
    if (!row.hidden) visible++
  }
  panel.querySelector('[data-requests-all]').textContent = all ? 'Хариу хүлээсэн' : 'Бүгдийг харах'
  const empty = panel.querySelector('.dashboard-request-empty')
  empty.hidden = visible > 0
  empty.textContent = query ? 'Хайлтад тохирох хүсэлт олдсонгүй.' : 'Хариу хүлээсэн хүсэлт алга.'
}

export function setupRequestDetails(root, { listen, onDecision }) {
  const dashboard = root.querySelector('.provider-dashboard')
  const dialog = dashboard.querySelector('.request-dialog')
  let selected
  const text = (selector, value) => { dialog.querySelector(selector).textContent = value }
  const refreshDecision = () => {
    const status = requestStatus(selected)
    const state = dialog.querySelector('[data-request-state]')
    state.textContent = statusLabels[status]; state.dataset.status = status
    for (const button of dialog.querySelectorAll('[data-request-decision]')) button.hidden = status !== 'pending'
    text('.request-feedback', status === 'pending' ? '' : `Энэ хүсэлтэд ${status === 'accepted' ? 'зөвшөөрсөн' : 'татгалзсан'} хариу өгсөн.`)
  }
  for (const button of dashboard.querySelectorAll('[data-request-open]')) listen(button, 'click', () => {
    selected = rentalRequests.find(item => item.id === button.dataset.requestOpen)
    const person = people.find(item => item.id === selected.person)
    const profile = (root.state.catalog.get() || []).find(item => item.id === person?.profileId)
    if (!profile) return
    const profileRoot = dialog.querySelector('.request-profile')
    root.renderDetail(profileRoot, profile, false)
    const availability = document.createElement('div')
    const label = document.createElement('span'); label.textContent = 'Нүүх боломжтой'
    const value = document.createElement('strong'); value.textContent = profile.available
    availability.append(label, value)
    profileRoot.querySelector('hamtry-move-in-picker').replaceWith(availability)
    const character = dashboard.querySelector(`.meeting-contact [data-person="${person.id}"]`).cloneNode(true)
    profileRoot.querySelector('.detail-media').replaceChildren(character)
    text('[data-request-listing]', root.state.published.get().find(item => item.id === selected.listingId)?.title || 'Зар идэвхгүй байна')
    text('[data-request-received]', `Хүсэлт ирсэн: ${selected.received}`)
    const appointments = meetingsForRequest(selected, meetings)
    const list = dialog.querySelector('[data-request-meetings]')
    list.replaceChildren()
    for (const meeting of appointments) {
      const item = document.createElement('li')
      const date = document.createElement('strong')
      date.textContent = meeting.start.toLocaleDateString('mn-MN', { year: 'numeric', month: 'numeric', day: 'numeric' })
      const time = document.createElement('time'); time.dateTime = meeting.start.toISOString()
      const clock = date => date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false })
      const end = new Date(meeting.start.getTime() + (meeting.duration || 30) * 60000)
      time.textContent = `${clock(meeting.start)} – ${clock(end)}`
      const status = document.createElement('span')
      status.textContent = end.getTime() < Date.now() ? 'Дууссан' : meeting.start.getTime() < Date.now() ? 'Уулзалт эхэлсэн' : 'Товлогдсон'
      item.append(date, time, status)
      if (meeting.note) { const note = document.createElement('p'); note.textContent = meeting.note; item.append(note) }
      list.append(item)
    }
    dialog.querySelector('[data-no-request-meetings]').hidden = appointments.length > 0
    refreshDecision()
    dialog.showModal()
  })
  for (const button of dialog.querySelectorAll('[data-request-decision]')) listen(button, 'click', () => {
    if (!decideRequest(selected, button.dataset.requestDecision)) return
    refreshDecision(); updateRequestRows(dashboard); onDecision()
  })
  listen(dashboard.querySelector('[data-requests-all]'), 'click', () => {
    const panel = dashboard.querySelector('.dashboard-inquiries')
    panel.dataset.requestView = panel.dataset.requestView === 'all' ? 'pending' : 'all'
    updateRequestRows(dashboard)
  })
  listen(dialog.querySelector('[data-request-close]'), 'click', () => dialog.close())
  listen(dialog, 'hamtry-dialog-close', () => {
    if (selected && requestStatus(selected) !== 'pending') dashboard.querySelector('#dashboard-inquiries-title').focus({ preventScroll: true })
  })
  updateRequestRows(dashboard)
  onCleanup(() => dialog.close())
}