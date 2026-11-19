import { onCleanup, useEffect } from '@hamtry/library'
import { request } from '../../state/api.js'

const calendarIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>'
const chatIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8m-8 3h5"/></svg>'
const formatTime = new Intl.DateTimeFormat('mn-MN', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' })
const meetingPrefix = 'Уулзалтын санал'

export function chatMarkup() {
  return `<section class="provider-chat page-width" aria-labelledby="chat-title" hidden>
    <div class="chat-heading"><h1 id="chat-title">Чат</h1><button class="chat-refresh chat-secondary" type="button">Шинэчлэх</button></div>
    <div class="chat-shell">
      <aside class="chat-conversations" aria-label="Хадгалсан зар ба чат">
        <h2>Хадгалсан</h2><div class="chat-saved-list"></div>
        <h2>Харилцан яриа</h2><div class="chat-conversation-list"></div>
      </aside>
      <section class="chat-thread" aria-label="Харилцан яриа">
        <header class="chat-thread-header" hidden>
          <a class="chat-place-cover" data-chat-cover aria-label="Зарыг харах">
            <img alt="" hidden><span aria-hidden="true"></span>
          </a>
          <div class="chat-place-copy"><h2><a data-chat-listing></a></h2><p data-chat-name></p></div>
          <button class="chat-meeting chat-secondary" type="button">${calendarIcon}<span>Уулзалт санал болгох</span></button>
        </header>
        <div class="chat-thread-messages" role="log" aria-live="polite" hidden></div>
        <div class="chat-empty" role="status"><span aria-hidden="true">${chatIcon}</span><p></p><button class="chat-login chat-secondary" type="button" hidden>Нэвтрэх</button></div>
        <form class="chat-compose" hidden>
          <input aria-label="Мессеж бичих" id="chat-message-input" name="message" maxlength="1000" autocomplete="off" placeholder="Мессеж бичих…" required>
          <button class="chat-primary" type="submit">Илгээх</button>
        </form>
      </section>
    </div>
    <dialog class="chat-meeting-dialog" aria-labelledby="chat-meeting-title">
      <form class="chat-meeting-form">
        <header><h2 id="chat-meeting-title">Уулзалт санал болгох</h2><p>Санал болгосон цагийг чатад илгээнэ.</p></header>
        <div class="chat-meeting-fields">
          <label>Огноо<input name="date" type="date" required></label>
          <label>Орон нутгийн цаг<input name="time" type="time" required></label>
        </div>
        <label>Нэмэлт тайлбар<input name="note" maxlength="240" placeholder="Уулзах газар, жишээ нь"></label>
        <p class="chat-meeting-error" role="alert"></p>
        <footer><button type="button" class="chat-secondary chat-meeting-cancel">Болих</button><button class="chat-primary" type="submit">Санал илгээх</button></footer>
      </form>
    </dialog>
  </section>`
}

export function setupChat(root, listen) {
  const page = root.querySelector('.provider-chat')
  const find = selector => page.querySelector(selector)
  const savedRows = find('.chat-saved-list'), rows = find('.chat-conversation-list')
  const list = find('.chat-thread-messages'), form = find('.chat-compose'), input = find('#chat-message-input')
  const empty = find('.chat-empty'), login = find('.chat-login'), header = find('.chat-thread-header')
  const meeting = find('.chat-meeting-dialog'), meetingForm = find('.chat-meeting-form')
  let chats = [], selected, pendingListing, userId, ready = false, revision = 0, busy = false
  onCleanup(() => { revision++; meeting.close() })

  const status = (message, needsLogin = false) => {
    empty.hidden = !message
    empty.querySelector('p').textContent = message
    login.hidden = !needsLogin
  }
  const resetThread = () => {
    header.hidden = true; form.hidden = true; list.hidden = true
    list.replaceChildren()
  }
  const addMessage = message => {
    const row = document.createElement('div')
    row.className = `chat ${message.sender_id === userId ? 'chat-end' : 'chat-start'}`
    const bubble = document.createElement('div'); bubble.className = 'chat-bubble'
    if (message.body.startsWith(meetingPrefix + '\n')) {
      const title = document.createElement('strong'); title.textContent = meetingPrefix
      const details = document.createElement('span'); details.textContent = message.body.slice(meetingPrefix.length + 1)
      const icon = document.createElement('span')
      icon.className = 'chat-proposal-icon'; icon.innerHTML = calendarIcon
      const copy = document.createElement('div'); copy.append(title, details)
      bubble.classList.add('chat-proposal'); bubble.append(icon, copy)
    } else bubble.textContent = message.body
    const time = document.createElement('time'); time.className = 'chat-footer'
    time.textContent = formatTime.format(message.created_at)
    row.append(bubble, time); list.append(row)
  }
  const savedPlaces = () => {
    const ids = new Set(root.state.saved.get())
    return [...new Map([...(root.state.catalog.get() || []), ...root.state.remoteSaved.get()]
      .filter(item => ids.has(item.id)).map(item => [item.id, item])).values()]
  }
  const renderRows = (places = savedPlaces()) => {
    const paired = new Set()
    savedRows.replaceChildren(); rows.replaceChildren()
    const appendRow = (target, place, thread) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-conversation'
      if (thread) button.dataset.chatId = thread.id
      else button.dataset.listingId = place.id
      if (thread && selected === thread.id) button.setAttribute('aria-current', 'true')
      const cover = document.createElement(place?.image ? 'img' : 'span')
      cover.className = 'chat-avatar'
      if (place?.image) { cover.src = place.image; cover.alt = ''; cover.loading = 'lazy' }
      else { cover.textContent = (thread?.other_name || place.title).slice(0, 1); cover.setAttribute('aria-hidden', 'true') }
      const copy = document.createElement('span'); copy.className = 'chat-conversation-copy'
      const title = document.createElement('strong'); title.textContent = place?.title || thread.listing_title
      const detail = document.createElement('small')
      detail.textContent = thread ? `${thread.other_name} · ${thread.last_message || 'Чат нээх'}` : 'Чат эхлүүлэх'
      copy.append(title, detail); button.append(cover, copy); target.append(button)
    }
    for (const place of places) {
      const attached = chats.filter(item => item.listing_id === place.id)
      if (!attached.length) appendRow(savedRows, place)
      for (const thread of attached) { paired.add(thread.id); appendRow(savedRows, place, thread) }
    }
    for (const thread of chats) if (!paired.has(thread.id)) appendRow(rows, null, thread)
    for (const [target, message] of [[savedRows, 'Хадгалсан зар алга.'], [rows, 'Өөр харилцан яриа алга.']]) {
      if (target.childElementCount) continue
      const hint = document.createElement('p'); hint.className = 'chat-list-empty'; hint.textContent = message
      target.append(hint)
    }
    root.querySelector('[data-chat-count-summary]').textContent = chats.length
  }
  useEffect(() => {
    const places = savedPlaces()
    if (!page.hidden) renderRows(places)
  })

  const show = async id => {
    const thread = chats.find(item => item.id === id)
    if (!thread) return
    if (selected !== id) { input.value = ''; meeting.close() }
    selected = id
    const current = ++revision
    renderRows(); resetThread(); status('Мессежүүдийг ачаалж байна…')
    const cover = find('[data-chat-cover]'), photo = cover.querySelector('img'), fallback = cover.querySelector('span')
    const listing = find('[data-chat-listing]')
    const listingPath = encodeURIComponent(thread.listing_id)
    listing.textContent = thread.listing_title
    cover.href = listing.href = `#listing/${listingPath}`
    fallback.textContent = thread.other_name.slice(0, 1)
    find('[data-chat-name]').textContent = thread.other_name
    const setPhoto = place => {
      if (current !== revision) return
      photo.hidden = !place?.image
      fallback.hidden = Boolean(place?.image)
      if (place?.image) photo.src = place.image
      else photo.removeAttribute('src')
    }
    const place = [...root.state.remoteSaved.get(), ...(root.state.catalog.get() || [])]
      .find(item => item.id === thread.listing_id)
    setPhoto(place)
    if (!place) void request(`/api/v1/listings/${listingPath}`).then(result => setPhoto(result.data)).catch(() => {})
    try {
      const result = await request(`/api/v1/chats/${encodeURIComponent(id)}/messages`)
      if (current !== revision) return
      result.data.forEach(addMessage)
      header.hidden = false; form.hidden = false; list.hidden = false
      status(result.data.length ? '' : 'Эхний мессежээ бичээрэй.')
      list.scrollTop = list.scrollHeight
    } catch (error) { if (current === revision) status(error.message) }
  }
  const load = async (preferredId = selected) => {
    const current = ++revision
    if (!userId) { resetThread(); renderRows(); status(ready ? 'Чатлахын тулд нэвтэрнэ үү.' : 'Чатыг бэлдэж байна…', ready); return }
    resetThread(); status('Харилцан яриаг ачаалж байна…')
    try {
      const result = await request('/api/v1/chats')
      if (current !== revision) return
      chats = result.data; renderRows()
      const next = chats.find(thread => thread.id === preferredId) || chats[0]
      if (next) await show(next.id)
      else status('Хадгалсан зараасаа сонгоод чат эхлүүлээрэй.')
    } catch (error) { if (current === revision) status(error.message, error.status === 401) }
  }
  const start = async listingId => {
    if (!userId) { pendingListing = listingId; root.querySelector('.profile-dialog').showModal(); return }
    pendingListing = null
    const current = ++revision
    resetThread(); status('Чатыг нээж байна…')
    try {
      const result = await request('/api/v1/chats', { method: 'POST', body: { listingId } })
      if (current === revision) await load(result.data.id)
    } catch (error) { if (current === revision) status(error.message) }
  }
  for (const container of [savedRows, rows]) listen(container, 'click', event => {
    const button = event.target.closest('button')
    if (button?.dataset.chatId) void show(button.dataset.chatId)
    else if (button?.dataset.listingId) void start(button.dataset.listingId)
  })
  listen(find('.chat-refresh'), 'click', () => { if (!busy) void load() })
  listen(login, 'click', () => root.querySelector('.profile-dialog').showModal())
  const send = async (body, onSuccess, onError) => {
    if (!body || !selected || busy) return
    const threadId = selected, owner = userId
    busy = true
    const controls = [form.querySelector('button'), meetingForm.querySelector('button[type="submit"]')]
    controls.forEach(button => { button.disabled = true })
    try {
      const { data } = await request(`/api/v1/chats/${encodeURIComponent(threadId)}/messages`, { method: 'POST', body: { body } })
      if (userId !== owner || page.hidden) return
      const thread = chats.find(item => item.id === threadId)
      if (thread) { thread.last_message = body; thread.last_at = data.created_at }
      if (selected === threadId) { onSuccess(); await show(threadId) }
      else renderRows()
    } catch (error) { if (userId === owner && !page.hidden && selected === threadId) onError(error.message) }
    finally { busy = false; controls.forEach(button => { button.disabled = false }) }
  }
  listen(form, 'submit', event => {
    event.preventDefault()
    void send(input.value.trim(), () => { input.value = '' }, message => status(message))
  })
  listen(find('.chat-meeting'), 'click', () => {
    meetingForm.reset(); find('.chat-meeting-error').textContent = ''
    const today = new Date()
    meetingForm.elements.date.min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    meeting.showModal()
  })
  listen(find('.chat-meeting-cancel'), 'click', () => meeting.close())
  listen(meetingForm, 'submit', event => {
    event.preventDefault()
    const fields = new FormData(meetingForm)
    const date = new Date(`${fields.get('date')}T${fields.get('time')}`)
    const feedback = find('.chat-meeting-error')
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      feedback.textContent = 'Ирээдүйн огноо, цаг сонгоно уу.'; return
    }
    const note = fields.get('note').trim()
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const message = [meetingPrefix, `${formatTime.format(date)} · ${timeZone}`, note].filter(Boolean).join('\n')
    feedback.textContent = ''
    void send(message, () => meeting.close(), message => { feedback.textContent = message })
  })
  return {
    setVisible(visible, connected, nextUser) {
      const changed = visible === page.hidden || userId !== nextUser || ready !== connected
      page.hidden = !visible
      if (!changed) return
      revision++
      if (userId !== nextUser) { chats = []; selected = null; input.value = ''; meeting.close() }
      userId = nextUser; ready = connected
      if (!visible) { meeting.close(); return }
      renderRows()
      if (pendingListing && userId) void start(pendingListing)
      else void load()
    },
    openListing(id) {
      if (!id) return
      pendingListing = id
      if (!page.hidden) void start(id)
    },
  }
}
