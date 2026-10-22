import { onCleanup } from '@hamtry/library'

export const people = [
  { id: 'nomin', name: 'Н. Номин', initial: 'Н', shirt: '--brand-primary', hair: 0 },
  { id: 'temuulen', name: 'Т. Тэмүүлэн', initial: 'Т', shirt: '--status-info', hair: 1 },
  { id: 'anu', name: 'А. Ану', initial: 'А', shirt: '--brand-accent-lime', hair: 2 },
]
const now = new Date()
const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(12, 0, 0, 0)
// Demo schedule is relative to opening the page; real appointments need server timestamps.
export const meetings = [
  { person: 'nomin', start: new Date(now.getTime() + 30 * 60000), listing: 'Нарны хороолол · 2 өрөө' },
  { person: 'temuulen', start: tomorrow, listing: 'Хажуу өрөө · Хан-Уул' },
]
const messages = [
  { id: 'nomin-address', person: 'nomin', text: 'Уулзах байрны орц, давхрыг хэлж өгнө үү?' },
  { id: 'temuulen-time', person: 'temuulen', text: 'Маргааш 12 цагт үзэх боломжтой юу?' },
  { id: 'nomin-arrival', person: 'nomin', text: 'Би товлосон цагтаа очно.' },
]
const read = new Set()
export const characterMarkup = (id, profile = false) => `<span class="dashboard-character" data-person="${id}"${profile ? ` data-person-profile="${id}"` : ''} aria-hidden="true">${people.find(person => person.id === id).initial}</span>`
const clock = date => date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false })

export function viewingsMarkup() {
  return `<section class="dashboard-panel dashboard-viewings" id="dashboard-viewings" aria-labelledby="dashboard-viewings-title"><h2 id="dashboard-viewings-title" tabindex="-1">Удахгүй болох уулзалт</h2>${meetings.map((meeting, index) => `<article class="dashboard-viewing" data-meeting="${index}">${characterMarkup(meeting.person)}<div class="dashboard-viewing-copy"><span class="dashboard-meeting-status"></span><strong>${people.find(person => person.id === meeting.person).name}</strong><time datetime="${meeting.start.toISOString()}">${meeting.start.toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' })} · ${clock(meeting.start)} – ${clock(new Date(meeting.start.getTime() + 30 * 60000))}</time><small>${meeting.listing}</small></div></article>`).join('')}<p>Нэг хүнийг бүх хэсэгт ижил дүрээр танина.</p></section>`
}

export function messagesMarkup() {
  return `<section class="dashboard-panel dashboard-messages" id="dashboard-messages" aria-labelledby="dashboard-messages-title"><div class="dashboard-panel-heading"><h2 id="dashboard-messages-title" tabindex="-1">Мессежүүд <span class="dashboard-count" data-unread-count>3</span></h2><button type="button" data-read-all>Бүгдийг уншсан</button></div><div class="dashboard-message-list" role="region" aria-label="Мессежийн жагсаалт" tabindex="0">${messages.map(message => `<article class="dashboard-message" data-message="${message.id}">${characterMarkup(message.person, true)}<div class="dashboard-message-bubble"><strong>${people.find(person => person.id === message.person).name}</strong><p>${message.text}</p><small data-message-status>Уншаагүй</small></div><button type="button" data-read-message="${message.id}" aria-label="${people.find(person => person.id === message.person).name}: ${message.text} — уншсан болгох">Уншсан</button></article>`).join('')}</div><p class="dashboard-messages-status" role="status"></p></section>`
}

export function setupAttention(dashboard, listen) {
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
      row.querySelector('button').disabled = isRead
    }
    let urgent = 0
    for (const [index, meeting] of meetings.entries()) {
      const minutes = Math.ceil((meeting.start.getTime() - Date.now()) / 60000)
      const soon = minutes <= 60 && minutes > -30
      if (soon) urgent++
      const row = dashboard.querySelector(`[data-meeting="${index}"]`)
      row.classList.toggle('is-soon', soon)
      const label = minutes <= -30 ? 'Дууссан' : minutes <= 0 ? 'Уулзалтын цаг болсон' : minutes <= 60 ? `${minutes} минутын дараа` : 'Товлогдсон'
      row.querySelector('.dashboard-meeting-status').textContent = label
    }
    const count = unread + 3 + urgent
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
}
