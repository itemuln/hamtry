import { onCleanup } from '@hamtry/library'
import infoIcon from '../assets/dashboard/nav-info.svg'
import { overdueMeetingMessage } from '../state/model.js'
import { pendingRequests } from '../state/dashboard-requests.js'

export const people = [
  { id: 'nomin', profileId: 'person-1', name: 'Н. Номин', initial: 'Н', shirt: '--brand-primary', hair: 0 },
  { id: 'temuulen', profileId: 'person-2', name: 'Т. Тэмүүлэн', initial: 'Т', shirt: '--status-info', hair: 1 },
  { id: 'anu', profileId: 'person-3', name: 'А. Ану', initial: 'А', shirt: '--brand-accent-lime', hair: 2 },
]
const now = new Date()
const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(12, 0, 0, 0)
// Demo schedule is relative to opening the page; real appointments need server timestamps.
export const meetings = [
  { person: 'nomin', listingId: 'sample-narnii', start: new Date(now.getTime() + 30 * 60000), listing: 'Нарны хороолол · 2 өрөө' },
  { person: 'temuulen', listingId: 'sample-khan-uul', start: tomorrow, listing: 'Хажуу өрөө · Хан-Уул' },
]
const messages = [
  { id: 'nomin-address', person: 'nomin', text: 'Уулзах байрны орц, давхрыг хэлж өгнө үү?', sentAt: now.getTime() - 8 * 86400000 },
  { id: 'temuulen-time', person: 'temuulen', text: 'Маргааш 12 цагт үзэх боломжтой юу?', sentAt: now.getTime() - 2 * 3600000 },
  { id: 'nomin-arrival', person: 'nomin', text: 'Би товлосон цагтаа очно.', sentAt: now.getTime() - 3600000 },
]
const read = new Set()
export const characterMarkup = (id, profile = false) => `<span class="dashboard-character" data-person="${id}"${profile ? ` data-person-profile="${id}"` : ''} aria-hidden="true">${people.find(person => person.id === id).initial}</span>`
const clock = date => date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false })

export function viewingsMarkup() {
  return `<section class="dashboard-panel dashboard-viewings" id="dashboard-viewings" aria-labelledby="dashboard-viewings-title"><div class="dashboard-panel-heading"><h2 id="dashboard-viewings-title" tabindex="-1">Удахгүй болох уулзалт</h2><button type="button" data-meeting-open aria-label="Уулзалт товлох">＋ Товлох</button></div>${meetings.map((meeting, index) => `<article class="dashboard-viewing" data-meeting="${index}">${characterMarkup(meeting.person)}<div class="dashboard-viewing-copy"><span class="dashboard-meeting-status"></span><strong>${people.find(person => person.id === meeting.person).name}</strong><time datetime="${meeting.start.toISOString()}">${meeting.start.toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' })} · ${clock(meeting.start)} – ${clock(new Date(meeting.start.getTime() + (meeting.duration || 30) * 60000))}</time><small>${meeting.listing}</small></div></article>`).join('')}<p>Нэг хүнийг бүх хэсэгт ижил дүрээр танина.</p></section>`
}

export function messagesMarkup() {
  return `<section class="dashboard-panel dashboard-messages" id="dashboard-messages" aria-labelledby="dashboard-messages-title"><div class="dashboard-panel-heading"><h2 id="dashboard-messages-title" tabindex="-1">Мессежүүд <span class="dashboard-count" data-unread-count>3</span></h2><button type="button" data-read-all>Бүгдийг уншсан</button></div><div class="dashboard-message-list" role="region" aria-label="Мессежийн жагсаалт" tabindex="0">${messages.map(message => `<article class="dashboard-message" data-message="${message.id}">${characterMarkup(message.person, true)}<div class="dashboard-message-bubble"><strong>${people.find(person => person.id === message.person).name}</strong><p>${message.text}</p><small data-message-status>Уншаагүй</small><span class="dashboard-reply-warning" data-reply-warning hidden><button class="dashboard-warning-icon" type="button" aria-label="Хариу өгөх хугацааны анхааруулга" aria-describedby="warning-${message.id}"><img src="${infoIcon}" alt=""></button><span class="ht-alert ht-tone--warning dashboard-warning-text" id="warning-${message.id}" role="tooltip" popover="manual">Уулзалт товлосон энэ хүний мессежид та 7 хоногоос дээш хугацаанд хариу өгөөгүй байна.</span></span></div><button type="button" data-read-message="${message.id}" aria-label="${people.find(person => person.id === message.person).name}: ${message.text} — уншсан болгох">Уншсан</button></article>`).join('')}</div><p class="dashboard-messages-status" role="status"></p></section>`
}

export function setupAttention(dashboard, listen) {
  let openCard
  const closeCard = () => { if (openCard?.matches(':popover-open')) openCard.hidePopover(); openCard = null }
  for (const icon of dashboard.querySelectorAll('.dashboard-warning-icon')) {
    const card = dashboard.querySelector(`#${icon.getAttribute('aria-describedby')}`)
    const showCard = () => {
      if (icon.closest('[data-reply-warning]').hidden) return
      if (openCard === card) return
      closeCard()
      card.showPopover()
      openCard = card
      const anchor = icon.getBoundingClientRect()
      card.style.left = `${Math.max(12, Math.min(anchor.right + 10, innerWidth - card.offsetWidth - 12))}px`
      card.style.top = `${Math.max(12, Math.min(anchor.top + (anchor.height - card.offsetHeight) / 2, innerHeight - card.offsetHeight - 12))}px`
    }
    listen(icon, 'mouseenter', showCard)
    listen(icon, 'mouseleave', () => { if (!icon.matches(':focus')) closeCard() })
    listen(icon, 'focus', showCard)
    listen(icon, 'blur', closeCard)
    listen(icon, 'click', () => { if (!card.matches(':popover-open')) showCard() })
  }
  listen(dashboard.querySelector('.dashboard-message-list'), 'scroll', closeCard, { passive: true })
  listen(window, 'scroll', closeCard, { passive: true })
  listen(window, 'resize', closeCard)
  onCleanup(closeCard)
  const refresh = () => {
    const unread = messages.filter(message => !read.has(message.id)).length
    const senders = new Set(messages.filter(message => !read.has(message.id)).map(message => message.person)).size
    dashboard.querySelector('[data-unread-summary]').textContent = unread ? `${senders} хүнээс шинэ мессеж` : 'Бүх мессежийг уншсан'
    dashboard.querySelectorAll('[data-unread-count]').forEach(node => { node.textContent = unread })
    dashboard.querySelector('[data-read-all]').disabled = unread === 0
    for (const message of messages) {
      const row = dashboard.querySelector(`[data-message="${message.id}"]`)
      const isRead = read.has(message.id)
      row.classList.toggle('is-unread', !isRead)
      row.querySelector('[data-message-status]').textContent = isRead ? 'Уншсан' : 'Уншаагүй'
      row.querySelector('[data-reply-warning]').hidden = !overdueMeetingMessage(message, meetings)
      row.querySelector('[data-read-message]').disabled = isRead
    }
    let urgent = 0
    for (const [index, meeting] of meetings.entries()) {
      const minutes = Math.ceil((meeting.start.getTime() - Date.now()) / 60000)
      const duration = meeting.duration || 30
      const soon = minutes <= 60 && minutes > -duration
      if (soon) urgent++
      const row = dashboard.querySelector(`[data-meeting="${index}"]`)
      row.classList.toggle('is-soon', soon)
      const label = minutes <= -duration ? 'Дууссан' : minutes <= 0 ? 'Уулзалтын цаг болсон' : minutes <= 60 ? `${minutes} минутын дараа` : 'Товлогдсон'
      row.querySelector('.dashboard-meeting-status').textContent = label
    }
    const count = unread + pendingRequests().length + urgent
    dashboard.querySelector('[data-notification-count]').textContent = count
    dashboard.querySelector('[data-notifications]').setAttribute('aria-label', `Анхаарах ${count} зүйл: мэдэгдэл харах`)
  }
  const markRead = ids => {
    ids.forEach(id => read.add(id)); refresh()
    dashboard.querySelector('.dashboard-messages-status').textContent = 'Мессежийг уншсан гэж тэмдэглэлээ.'
  }
  dashboard.querySelectorAll('[data-read-message]').forEach(button => listen(button, 'click', () => markRead([button.dataset.readMessage])))
  listen(dashboard.querySelector('[data-read-all]'), 'click', () => markRead(messages.map(message => message.id)))
  refresh()
  const timer = setInterval(refresh, 60000)
  let active = true
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    observer.disconnect()
    void import('../components/dashboard-characters.js').then(({ renderCharacters }) => {
      if (active) renderCharacters(dashboard, people)
    }).catch(() => { /* Initials remain available when WebGL or the module is unavailable. */ })
  })
  observer.observe(dashboard)
  onCleanup(() => { active = false; clearInterval(timer); observer.disconnect() })
  return refresh
}
