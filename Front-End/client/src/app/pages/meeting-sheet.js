import { onCleanup } from '@hamtry/library'
import { people, characterMarkup, meetings } from './dashboard-attention.js'
import { meetingError } from '../state/meeting-model.js'
import { requestedListing } from '../state/dashboard-requests.js'
import './meeting-sheet.css'

export function meetingSheetMarkup() {
  return `<hamtry-dialog class="meeting-sheet" heading="Уулзалт товлох">
    <form class="meeting-form">
      <div class="meeting-details">
        <p class="meeting-eyebrow">ӨРӨӨ ҮЗЭХ УУЛЗАЛТ</p>
        <h3>Танилцах цагаа тохироорой.</h3>
        <p class="meeting-intro">Харилцагчаа сонгоод уулзах огноо, цагаа тохируулаарай.</p>
        <label class="meeting-field">Хүсэлт явуулсан өрөө<input name="listing" type="text" readonly placeholder="Эхлээд харилцагчаа сонгоно уу" aria-describedby="meeting-room-note"></label><small class="meeting-room-note" id="meeting-room-note">Харилцагчийн хүсэлттэй холбоотой өрөө автоматаар сонгогдоно.</small>
        <div class="meeting-date-time">
          <label class="meeting-field">Огноо<input name="date" type="date" required></label>
          <label class="meeting-field">Эхлэх цаг<input name="time" type="time" required></label>
        </div>
        <label class="meeting-field">Үргэлжлэх хугацаа<select name="duration"><option value="30">30 минут</option><option value="45">45 минут</option><option value="60">1 цаг</option></select></label>
        <label class="meeting-field">Нэмэлт тайлбар <span>(заавал биш)</span><textarea name="note" rows="3" maxlength="300" placeholder="Орц, давхар, уулзах цэг…"></textarea></label>
        <div class="meeting-summary"><span class="meeting-summary-icon" aria-hidden="true">◷</span><div><strong data-meeting-person>Харилцагчаа сонгоно уу</strong><span data-meeting-summary>Уулзалтын мэдээлэл</span></div></div>
        <p class="meeting-error" role="alert" hidden></p>
        <div class="meeting-actions"><button type="button" data-meeting-cancel>Болих</button><button type="submit" class="meeting-confirm">Уулзалт товлох <span aria-hidden="true">↗</span></button></div>
        <small class="meeting-local-note">Туршилтын уулзалт · Харилцагчид мэдэгдэл илгээхгүй.</small>
      </div>
      <fieldset class="meeting-contacts">
        <legend class="sr-only">Уулзах харилцагч</legend>
        <div class="meeting-contacts-heading"><h3>Харилцагчид</h3><span>${people.length}</span></div>
        <p>Уулзах хүнээ сонгоорой.</p>
        <label class="meeting-contact-search"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span class="sr-only">Харилцагч хайх</span><input type="search" data-contact-search placeholder="Нэрээр хайх…"></label>
        <div class="meeting-contact-list">${people.map(person => `<label class="meeting-contact" data-contact="${person.id}"><input type="radio" name="person" value="${person.id}">${characterMarkup(person.id)}<span class="meeting-contact-copy"><strong>${person.name}</strong><small data-contact-listing>Өрөө сонирхож буй</small></span><span class="meeting-contact-check" aria-hidden="true">✓</span></label>`).join('')}</div>
        <p class="meeting-no-contacts" hidden>Харилцагч олдсонгүй.</p>
        <small class="meeting-contacts-note">Дашбоард дээрх ижил character-аар харилцагчаа таниарай.</small>
      </fieldset>
    </form>
  </hamtry-dialog>`
}

const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const localTime = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export function setupMeetingSheet(dashboard, { listen, getListings, onScheduled }) {
  const sheet = dashboard.querySelector('.meeting-sheet')
  const form = sheet.querySelector('form')
  const field = name => form.elements.namedItem(name)
  const error = sheet.querySelector('.meeting-error')
  const clearError = () => { error.hidden = true; error.textContent = '' }
  const summarize = () => {
    const selected = people.find(person => person.id === field('person').value)
    field('listing').value = requestedListing(selected?.id, getListings())?.title || ''
    sheet.querySelector('[data-meeting-person]').textContent = selected?.name || 'Харилцагчаа сонгоно уу'
    const date = new Date(`${field('date').value}T${field('time').value}`)
    sheet.querySelector('[data-meeting-summary]').textContent = Number.isFinite(date.getTime())
      ? `${date.toLocaleDateString('mn-MN', { month: 'long', day: 'numeric' })} · ${localTime(date)} · ${field('duration').value} минут` : 'Огноо, цагаа сонгоно уу'
    clearError()
  }
  const searchContacts = () => {
    const query = sheet.querySelector('[data-contact-search]').value.trim().toLocaleLowerCase('mn')
    let count = 0
    for (const row of sheet.querySelectorAll('[data-contact]')) {
      row.hidden = !people.find(person => person.id === row.dataset.contact).name.toLocaleLowerCase('mn').includes(query)
      if (!row.hidden) count++
    }
    sheet.querySelector('.meeting-no-contacts').hidden = count > 0
  }
  for (const button of dashboard.querySelectorAll('[data-meeting-open]')) listen(button, 'click', () => {
    form.reset(); clearError(); searchContacts()
    for (const row of sheet.querySelectorAll('[data-contact]')) {
      const listing = requestedListing(row.dataset.contact, getListings())
      row.querySelector('input').disabled = !listing
      row.querySelector('[data-contact-listing]').textContent = listing?.title || 'Хүсэлттэй холбоотой зар идэвхгүй байна'
    }
    const suggested = new Date(Math.ceil((Date.now() + 3600000) / 1800000) * 1800000)
    field('date').min = localDate(new Date())
    field('date').value = localDate(suggested)
    field('time').value = localTime(suggested)
    summarize()
    sheet.showModal()
  })
  listen(sheet.querySelector('[data-meeting-cancel]'), 'click', () => sheet.close())
  listen(sheet.querySelector('[data-contact-search]'), 'input', searchContacts)
  listen(form, 'input', summarize)
  listen(form, 'submit', event => {
    event.preventDefault()
    if (!field('person').value) {
      sheet.querySelector('[data-contact-search]').value = ''; searchContacts()
      error.textContent = 'Баруун талын жагсаалтаас уулзах хүнээ сонгоно уу.'; error.hidden = false
      sheet.querySelector('input[name="person"]').focus()
      return
    }
    if (!form.reportValidity()) return
    const entry = requestedListing(field('person').value, getListings())
    const meeting = { person: field('person').value, start: new Date(`${field('date').value}T${field('time').value}`), duration: Number(field('duration').value), listingId: entry?.id, listing: entry?.title, note: field('note').value.trim() }
    const message = meetingError(meeting, meetings)
    if (message || !entry || !people.some(person => person.id === meeting.person)) {
      error.textContent = message || 'Зар болон харилцагчаа дахин сонгоно уу.'; error.hidden = false; return
    }
    meetings.push(meeting)
    onScheduled(meeting)
    sheet.close()
  })
  onCleanup(() => sheet.close())
}