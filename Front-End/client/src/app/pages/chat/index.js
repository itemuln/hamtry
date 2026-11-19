import { onCleanup } from '@hamtry/library'
import { request } from '../../state/api.js'

export function chatMarkup() {
  return `<section class="provider-chat" data-provider-section="chat" aria-labelledby="chat-title" hidden>
    <div class="chat-heading"><div><h1 id="chat-title" tabindex="-1">Чат</h1><p>Зартай холбоотой харилцан ярианууд.</p></div><button class="chat-refresh" type="button">Шинэчлэх</button></div>
    <div class="chat-shell"><aside class="chat-conversations" aria-label="Харилцан ярианууд"><h2>Мессежүүд <span data-chat-count>0</span></h2><div class="chat-conversation-list"></div></aside>
      <section class="chat-thread" aria-label="Харилцан яриа"><header class="chat-thread-header" hidden><span class="chat-avatar" data-chat-avatar aria-hidden="true"></span><div><h2 data-chat-name></h2><p data-chat-listing></p></div></header><div class="chat-thread-messages" data-chat-messages role="log" aria-live="polite" aria-relevant="additions text" hidden></div><p class="chat-empty" role="status">Мессежүүдийг ачаалж байна…</p><button class="chat-login" type="button" hidden>Нэвтрэх</button><form class="chat-compose" hidden><label class="sr-only" for="chat-message-input">Мессеж бичих</label><input class="input" id="chat-message-input" name="message" type="text" maxlength="1000" autocomplete="off" placeholder="Мессеж бичих…" required><button class="btn" type="submit">Илгээх</button></form></section>
    </div></section>`
}

export function setupChat(root, listen) {
  const page = root.querySelector('.provider-chat')
  const rows = page.querySelector('.chat-conversation-list')
  const list = page.querySelector('[data-chat-messages]')
  const form = page.querySelector('.chat-compose')
  const input = page.querySelector('#chat-message-input')
  const empty = page.querySelector('.chat-empty')
  const login = page.querySelector('.chat-login')
  const header = page.querySelector('.chat-thread-header')
  let chats = [], selected, requestedId, revision = 0, sending = false, active = true
  onCleanup(() => { active = false; revision++ })

  const addMessage = message => {
    const row = document.createElement('div')
    row.className = `chat chat-${message.sender_id === root.state.user.get()?.id ? 'end' : 'start'}`
    const bubble = document.createElement('div'); bubble.className = 'chat-bubble'; bubble.textContent = message.body
    const footer = document.createElement('div'); footer.className = 'chat-footer'
    footer.textContent = new Date(message.created_at).toLocaleString('mn-MN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    row.append(bubble, footer)
    list.append(row)
  }
  const show = async id => {
    const item = chats.find(chat => chat.id === id)
    if (!item) return
    selected = id
    const current = ++revision
    rows.querySelectorAll('[data-chat-id]').forEach(button => button.toggleAttribute('aria-current', button.dataset.chatId === id))
    page.querySelector('[data-chat-name]').textContent = item.other_name
    page.querySelector('[data-chat-listing]').textContent = item.listing_title
    page.querySelector('[data-chat-avatar]').textContent = item.other_name.slice(0, 1)
    header.hidden = false; form.hidden = false; list.hidden = false; empty.hidden = true
    list.replaceChildren()
    try {
      const result = await request(`/api/v1/chats/${encodeURIComponent(id)}/messages`)
      if (!active || current !== revision) return
      list.replaceChildren(); result.data.forEach(addMessage)
      list.scrollTop = list.scrollHeight
    } catch (error) { if (active && current === revision) { form.hidden = true; list.hidden = true; empty.textContent = error.message; empty.hidden = false } }
  }
  const load = async () => {
    const current = ++revision
    rows.replaceChildren(); list.replaceChildren()
    header.hidden = true; form.hidden = true; list.hidden = true; login.hidden = true; empty.hidden = false
    empty.textContent = 'Мессежүүдийг ачаалж байна…'
    try {
      const result = await request('/api/v1/chats')
      if (!active || current !== revision) return
      chats = result.data
      page.querySelector('[data-chat-count]').textContent = chats.length
      root.querySelector('[data-chat-count-summary]').textContent = chats.length
      for (const item of chats) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'chat-conversation'; button.dataset.chatId = item.id
        const avatar = document.createElement('span'); avatar.className = 'chat-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = item.other_name.slice(0, 1)
        const copy = document.createElement('span'); copy.className = 'chat-conversation-copy'
        const name = document.createElement('strong'); name.textContent = item.other_name
        const title = document.createElement('small'); title.textContent = item.listing_title
        const preview = document.createElement('span'); preview.textContent = item.last_message || 'Шинэ харилцан яриа'
        copy.append(name, title, preview)
        const time = document.createElement('time'); time.textContent = item.last_at ? new Date(item.last_at).toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' }) : ''
        button.append(avatar, copy, time)
        rows.append(button)
      }
      empty.textContent = chats.length ? '' : 'Одоогоор чат алга. Зар дээрх мессежийн товчоор харилцан яриа эхлүүлнэ үү.'
      empty.hidden = chats.length > 0
      const next = requestedId || selected || chats[0]?.id
      requestedId = null
      if (chats.length) await show(chats.some(item => item.id === next) ? next : chats[0].id)
    } catch (error) {
      if (!active || current !== revision) return
      chats = []; selected = null
      page.querySelector('[data-chat-count]').textContent = '0'
      root.querySelector('[data-chat-count-summary]').textContent = '0'
      empty.textContent = error.status === 401 ? 'Чат харахын тулд нэвтэрнэ үү.' : error.message
      login.hidden = error.status !== 401
    }
  }
  listen(rows, 'click', event => { const button = event.target.closest('[data-chat-id]'); if (button) void show(button.dataset.chatId) })
  listen(page.querySelector('.chat-refresh'), 'click', () => { void load() })
  listen(login, 'click', () => root.querySelector('.profile-dialog').showModal())
  listen(form, 'submit', async event => {
    event.preventDefault()
    const body = input.value.trim(), chatId = selected, userId = root.state.user.get()?.id
    if (!body || !chatId || sending) return
    sending = true; form.querySelector('button').disabled = true
    try {
      const result = await request(`/api/v1/chats/${encodeURIComponent(chatId)}/messages`, { method: 'POST', body: { body } })
      if (!active || root.state.user.get()?.id !== userId) return
      const item = chats.find(chat => chat.id === chatId)
      if (item) { item.last_message = body; item.last_at = result.data.created_at }
      const button = [...rows.querySelectorAll('[data-chat-id]')].find(row => row.dataset.chatId === chatId)
      if (!button) { if (selected === chatId) input.value = ''; void load(); return }
      button.querySelector('.chat-conversation-copy > span').textContent = body
      button.querySelector('time').textContent = new Date(result.data.created_at).toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' })
      rows.prepend(button)
      if (selected === chatId) { addMessage(result.data); list.scrollTop = list.scrollHeight; input.value = ''; input.focus() }
    } catch (error) { empty.textContent = error.message; empty.hidden = false }
    finally { sending = false; form.querySelector('button').disabled = false }
  })
  page.loadChat = load
  page.openChat = id => { requestedId = id; if (!page.hidden) void load() }
}
