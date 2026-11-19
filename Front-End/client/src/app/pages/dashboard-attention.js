import { onCleanup } from '@hamtry/library'
import { pendingRequests } from '../state/dashboard-requests.js'

export const people = []
export const meetings = []
export const characterMarkup = id => `<span class="dashboard-character" data-person="${id}" aria-hidden="true">${people.find(person => person.id === id).initial}</span>`
const clock = date => date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false })

export function viewingsMarkup() {
  return `<section class="dashboard-panel dashboard-viewings" id="dashboard-viewings" aria-labelledby="dashboard-viewings-title"><div class="dashboard-panel-heading"><h2 id="dashboard-viewings-title" tabindex="-1">Удахгүй болох уулзалт</h2><button type="button" data-meeting-open aria-label="Уулзалт товлох">＋ Товлох</button></div>${meetings.map((meeting, index) => `<article class="dashboard-viewing" data-meeting="${index}">${characterMarkup(meeting.person)}<div class="dashboard-viewing-copy"><span class="dashboard-meeting-status"></span><strong>${people.find(person => person.id === meeting.person).name}</strong><time datetime="${meeting.start.toISOString()}">${meeting.start.toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' })} · ${clock(meeting.start)} – ${clock(new Date(meeting.start.getTime() + (meeting.duration || 30) * 60000))}</time><small>${meeting.listing}</small></div></article>`).join('')}<p>Одоогоор уулзалт товлоогүй байна.</p></section>`
}

export function setupAttention(dashboard) {
  const refresh = () => {
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
    const count = pendingRequests().length + urgent
    dashboard.querySelector('[data-notification-count]').textContent = count
    dashboard.querySelector('[data-notifications]').setAttribute('aria-label', `Анхаарах ${count} зүйл: мэдэгдэл харах`)
  }
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
