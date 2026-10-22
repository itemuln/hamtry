import brandHome from '../assets/dashboard/brand-home.svg'
import homeIcon from '../assets/dashboard/nav-home.svg'
import listingIcon from '../assets/dashboard/nav-listing.svg'
import userIcon from '../assets/dashboard/nav-user.svg'
import messageIcon from '../assets/dashboard/nav-message.svg'
import calendarIcon from '../assets/dashboard/nav-calendar.svg'
import shieldIcon from '../assets/dashboard/nav-shield.svg'
import infoIcon from '../assets/dashboard/nav-info.svg'
import searchIcon from '../assets/dashboard/search.svg'
import bellIcon from '../assets/dashboard/bell.svg'
import plusIcon from '../assets/dashboard/plus.svg'
import menuIcon from '../assets/dashboard/menu.svg'
import { onCleanup } from '@hamtry/library'
import { messagesMarkup, viewingsMarkup, setupAttention, characterMarkup, meetings } from './dashboard-attention.js'
import { verificationMarkup, setupVerification } from './selfie-verification.js'
import { calendarGrid } from '../state/model.js'

const icon = (src, alt = '') => `<img src="${src}" alt="${alt}">`
const sampleListings = [
  { id: 'sample-narnii', title: 'Нарны хороолол · 2 өрөө', detail: 'Баянгол · 52 м² · Тавилгатай', district: 'Баянгол', area: 'Нарны хороолол', size: '52 м²', price: 1500000, location: [106.884, 47.914] },
  { id: 'sample-khan-uul', title: 'Хажуу өрөө · Хан-Уул', detail: 'Хан-Уул · 18 м² · 1 хүн', district: 'Хан-Уул', area: '120 мянгат', size: '18 м²', price: 650000, location: [106.903, 47.898] },
]

export function dashboardMarkup() {
  const nav = [
    ['Дашбоард', homeIcon, 'dashboard-top'],
    ['Миний зарууд', listingIcon, 'dashboard-listings'],
    ['Хүсэлтүүд', userIcon, 'dashboard-inquiries'],
    ['Мессеж', messageIcon, 'dashboard-messages'],
    ['Уулзалтын тов', calendarIcon, 'dashboard-viewings'],
    ['Гэрээнүүд', shieldIcon, ''],
    ['Тусламж', infoIcon, ''],
    ['Тохиргоо', shieldIcon, ''],
  ]
  return `<section class="provider-dashboard" id="dashboard-top" aria-labelledby="dashboard-title" hidden>
    <header class="dashboard-mobile-header"><a href="#home">hamtry</a><button type="button" data-dashboard-menu aria-label="Цэс нээх" aria-expanded="false" aria-controls="dashboard-mobile-menu">${icon(menuIcon)}</button></header><nav id="dashboard-mobile-menu" class="dashboard-mobile-menu" aria-label="Нэмэлт цэс" hidden><button type="button" data-dashboard-scroll="dashboard-listings">Миний зарууд</button><button type="button" data-dashboard-scroll="dashboard-inquiries">Хүсэлтүүд</button><button type="button" data-dashboard-scroll="dashboard-viewings">Уулзалтын тов</button><button type="button" data-demo="Гэрээнүүд">Гэрээнүүд</button><button type="button" data-dashboard-profile>Миний бүртгэл</button></nav>
    <div class="dashboard-layout">
      <aside class="dashboard-sidebar" aria-label="Түрээслүүлэгчийн цэс">
        <a class="dashboard-brand" href="#home">${icon(brandHome)}<span>hamtry</span></a>
        <div class="dashboard-account"><span class="dashboard-avatar">БЭ</span><span><strong>Б. Энхжин</strong><small>Миний бүртгэл ›</small></span></div>
        <nav class="dashboard-side-nav" aria-label="Дашбоардын цэс">${nav.map(([label, src, section], index) => section ? `<button type="button" data-dashboard-scroll="${section}" ${index === 0 ? 'aria-current="page"' : ''}>${icon(src)}<span>${label}</span></button>` : `<button type="button" data-demo="${label}">${icon(src)}<span>${label}</span></button>`).join('')}</nav>
      </aside>
      <div class="dashboard-workspace">
        <header class="dashboard-utility"><label class="dashboard-search">${icon(searchIcon)}<span class="sr-only">Зар, хүсэлт хайх</span><input type="search" placeholder="Зар, хүсэлт, хүн хайх…"></label><button class="dashboard-icon-button" type="button" data-notifications data-dashboard-scroll="dashboard-messages" aria-label="Мэдэгдэл">${icon(bellIcon)}<span class="dashboard-count" data-notification-count>7</span></button><span class="dashboard-role">Түрээслүүлэгч</span></header>
        <div class="dashboard-heading"><div><h1 id="dashboard-title">Тавтай морил, Энхжин.</h1><p>3 хүсэлт хариу хүлээж байна. Уулзалт, мессежүүдээ шалгаарай.</p></div><hamtry-button class="dashboard-add" data-dashboard-publish>${icon(plusIcon)}Шинэ зар нэмэх</hamtry-button></div>
        <div class="dashboard-metrics" aria-label="Товч мэдээлэл"><article><strong>Идэвхтэй зар</strong><b data-listing-count>04</b><small>2 байр · 2 хажуу өрөө</small></article><article class="dashboard-metric-new-requests"><strong>Шинэ хүсэлт</strong><b>03</b><small>3 хүсэлт хариу хүлээж байна</small></article><article class="dashboard-views-metric"><strong>Зарын үзэлт</strong><b>248</b><small>Энэ 7 хоног · +18%</small><div class="dashboard-views-chart" data-views-chart role="img" aria-label="Сүүлийн 4 долоо хоногийн зарын үзэлт: 164, 190, 210, 248. Жишээ мэдээлэл."></div></article><article class="dashboard-metric-unread-messages"><strong>Уншаагүй мессеж</strong><b data-unread-count>3</b><small data-unread-summary>2 хүнээс шинэ мессеж</small></article></div>
        <div class="dashboard-columns"><div class="dashboard-main-column">
          <section class="dashboard-panel dashboard-listings" id="dashboard-listings" aria-labelledby="dashboard-listings-title"><div class="dashboard-panel-heading"><h2 id="dashboard-listings-title">Миний зарууд</h2><button type="button" data-listings-all>Бүгдийг харах</button></div><div class="dashboard-filters" role="group" aria-label="Зарын төлөв"><hamtry-chip selected data-filter="all">Бүгд <span data-all-count>2</span></hamtry-chip><hamtry-chip data-filter="active">Идэвхтэй <span data-active-count>2</span></hamtry-chip><hamtry-chip data-filter="draft">Ноорог 0</hamtry-chip></div><p class="dashboard-map-hint">Байшингийн тэмдэг дээр аваачиж зарыг харна.</p><hamtry-apartment-map class="dashboard-property-map" compact show-listing-details aria-label="Миний заруудын газрын зураг"></hamtry-apartment-map><p class="dashboard-empty" hidden>Илэрц олдсонгүй.</p></section>
          ${messagesMarkup()}
          <section class="dashboard-panel dashboard-inquiries" id="dashboard-inquiries" aria-labelledby="dashboard-inquiries-title"><div class="dashboard-panel-heading"><h2 id="dashboard-inquiries-title" tabindex="-1">Хариу хүлээсэн хүсэлтүүд <span class="dashboard-count">3</span></h2><button type="button" data-demo="Хүсэлтүүд">Бүгдийг харах</button></div><div class="dashboard-inquiry-list">${[
            ['Н', 'Н. Номин', 'Нарны хороолол · 2 өрөө', '10 мин өмнө'],
            ['Т', 'Т. Тэмүүлэн', 'Хажуу өрөө · Хан-Уул', '35 мин өмнө'],
            ['А', 'А. Ану', 'Нарны хороолол · 2 өрөө', '1 цагийн өмнө'],
          ].map(([initial, name, listing, time]) => `<div class="dashboard-inquiry">${characterMarkup({ 'Н': 'nomin', 'Т': 'temuulen', 'А': 'anu' }[initial])}<span class="dashboard-inquiry-name"><strong>${name}</strong><small>${listing}</small></span><time>${time}</time><hamtry-button variant="outline" data-demo="${name}">Хариу өгөх</hamtry-button></div>`).join('')}</div></section>
        </div><div class="dashboard-side-column">
          <section class="dashboard-panel dashboard-calendar" aria-label="Уулзалтын хуанли"><div class="dashboard-calendar-head"><h2></h2><div><button type="button" data-month="-1" aria-label="Өмнөх сар">‹</button><button type="button" data-month="1" aria-label="Дараах сар">›</button></div></div><div class="dashboard-weekdays"><span>Да</span><span>Мя</span><span>Лх</span><span>Пү</span><span>Ба</span><span>Бя</span><span>Ня</span></div><div class="dashboard-days"></div><hamtry-button class="dashboard-schedule" data-demo="Уулзалт товлох">＋ &nbsp; Уулзалт товлох</hamtry-button></section>
          ${viewingsMarkup()}
          ${verificationMarkup()}
        </div></div>
        <p class="dashboard-demo-note">Жишээ мэдээлэл: хүсэлт, үзэлт, уулзалтын тов бодит үйлчилгээтэй холбогдоогүй.</p>
      </div>
    </div>
    <footer class="dashboard-footer"><strong>hamtry</strong><nav aria-label="Нэмэлт холбоос"><button type="button" data-demo="Тухай">Тухай</button> · <button type="button" data-demo="Тусламж">Тусламж</button> · <button type="button" data-demo="Аюулгүй байдал">Аюулгүй байдал</button> · <button type="button" data-demo="Нууцлал">Нууцлал</button> · <button type="button" data-demo="Үйлчилгээний нөхцөл">Үйлчилгээний нөхцөл</button></nav><small>© 2026 Roomies · Загварын жишээ. Хүмүүс, байр, тохиолдлын хувь болон баталгаажуулалтын төлөв нь демо мэдээлэл.</small></footer>
    <nav class="dashboard-mobile-nav" aria-label="Гар утасны цэс"><button type="button" data-dashboard-scroll="dashboard-top" aria-current="page">${icon(homeIcon)}Нүүр</button><button type="button" data-dashboard-scroll="dashboard-listings">${icon(listingIcon)}Зарууд</button><button type="button" data-dashboard-scroll="dashboard-inquiries">${icon(userIcon)}Хүсэлт</button><button type="button" data-dashboard-scroll="dashboard-messages">${icon(messageIcon)}Мессеж</button><button type="button" data-dashboard-profile>${icon(userIcon)}Би</button></nav>
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
  let active = true, unmountViewsChart
  onCleanup(() => { active = false; unmountViewsChart?.() })
  void import('./dashboard-views-chart.js').then(({ mountViewsChart }) => {
    if (active) unmountViewsChart = mountViewsChart(dashboard.querySelector('[data-views-chart]'))
  })
  let month = new Date()
  let filter = 'all'
  setupAttention(dashboard, listen)
  setupVerification(root, listen)
  renderCalendar(dashboard, month)
  for (const button of dashboard.querySelectorAll('[data-month]')) listen(button, 'click', () => {
    month = new Date(month.getFullYear(), month.getMonth() + Number(button.dataset.month), 1)
    renderCalendar(dashboard, month)
  })
  for (const button of dashboard.querySelectorAll('[data-dashboard-publish]')) listen(button, 'click', showPublish)
  for (const button of dashboard.querySelectorAll('[data-dashboard-profile]')) listen(button, 'click', () => root.querySelector('.profile-dialog').showModal())
  for (const button of dashboard.querySelectorAll('[data-dashboard-scroll]')) listen(button, 'click', () => {
    const target = dashboard.querySelector(`#${button.dataset.dashboardScroll}`)
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    target.querySelector('h2')?.focus({ preventScroll: true })
  })
  const menuButton = dashboard.querySelector('[data-dashboard-menu]')
  const menu = dashboard.querySelector('#dashboard-mobile-menu')
  listen(menuButton, 'click', () => { menu.hidden = !menu.hidden; menuButton.setAttribute('aria-expanded', String(!menu.hidden)) })
  listen(menu, 'click', () => { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false') })
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
  const entries = published.length ? published.map(item => ({ ...item, detail: item.district })) : sampleListings
  dashboard.querySelector('[data-listing-count]').textContent = String(entries.length).padStart(2, '0')
  dashboard.querySelector('[data-all-count]').textContent = entries.length
  dashboard.querySelector('[data-active-count]').textContent = entries.length
  const query = dashboard.querySelector('.dashboard-search input').value.trim().toLocaleLowerCase('mn')
  const visible = filter === 'draft' ? [] : entries.filter(item => `${item.title} ${item.detail}`.toLocaleLowerCase('mn').includes(query))
  for (const inquiry of dashboard.querySelectorAll('.dashboard-inquiry')) inquiry.hidden = !inquiry.textContent.toLocaleLowerCase('mn').includes(query)
  const map = dashboard.querySelector('.dashboard-property-map')
  map.listings = visible
  map.hidden = visible.length === 0
  dashboard.querySelector('.dashboard-map-hint').hidden = visible.length === 0
  dashboard.querySelector('.dashboard-empty').hidden = visible.length > 0
}
