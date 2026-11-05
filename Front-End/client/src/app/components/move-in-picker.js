import { HamtryElement, createMotion, emit, listen, onCleanup, required, useEffect } from '@hamtry/library'
import css from './move-in-picker.css?inline'

const sheet = new CSSStyleSheet(); sheet.replaceSync(css)
const icon = paths => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
const calendarIcon = icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18"/>')
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return dateKey(date) === value ? date : null
}

// Нүүх өдрийн сонголт нь зөвхөн client төлөв; захиалга эсвэл availability API дуудахгүй.
export class HamtryMoveInPicker extends HamtryElement {
  static observedAttributes = ['min', 'value']
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `<button class="date-trigger" type="button" aria-haspopup="dialog" aria-controls="calendar" aria-expanded="false">${calendarIcon}<span></span></button><div id="calendar" popover="auto" role="dialog" aria-label="Нүүх өдөр сонгох"><header><button type="button" class="previous" aria-label="Өмнөх сар">${icon('<path d="m15 6-6 6 6 6"/>')}</button><strong class="month" aria-live="polite"></strong><button type="button" class="next" aria-label="Дараагийн сар">${icon('<path d="m9 6 6 6-6 6"/>')}</button></header><div class="weekdays" aria-hidden="true"><span>Да</span><span>Мя</span><span>Лх</span><span>Пү</span><span>Ба</span><span>Бя</span><span>Ня</span></div><div class="days" role="group" aria-label="Нүүх өдөр"></div></div>`
  }
  close() { this.root.querySelector('#calendar')?.hidePopover() }
  setup() {
    const motion = createMotion()
    const trigger = required('.date-trigger', this.root), calendar = required('#calendar', this.root)
    const days = required('.days', this.root), previous = required('.previous', this.root)
    let minimum, selected, month
    const draw = () => {
      const year = month.getFullYear(), index = month.getMonth()
      required('.month', this.root).textContent = `${year} · ${index + 1}-р сар`
      previous.disabled = year === minimum.getFullYear() && index === minimum.getMonth()
      const nodes = []
      const offset = (new Date(year, index, 1).getDay() + 6) % 7
      for (let i = 0; i < offset; i++) { const blank = document.createElement('span'); blank.setAttribute('aria-hidden', 'true'); nodes.push(blank) }
      const count = new Date(year, index + 1, 0).getDate()
      for (let day = 1; day <= count; day++) {
        const date = new Date(year, index, day), key = dateKey(date)
        const button = document.createElement('button')
        button.type = 'button'; button.textContent = day; button.dataset.date = key
        button.disabled = date < minimum
        button.setAttribute('aria-label', `${year} оны ${index + 1}-р сарын ${day}`)
        button.setAttribute('aria-pressed', String(key === dateKey(selected)))
        button.tabIndex = key === dateKey(selected) ? 0 : -1
        if (key === dateKey(new Date())) button.setAttribute('aria-current', 'date')
        nodes.push(button)
      }
      if (!nodes.some(node => node.tabIndex === 0)) {
        const first = nodes.find(node => node.tagName === 'BUTTON' && !node.disabled)
        if (first) first.tabIndex = 0
      }
      days.replaceChildren(...nodes)
    }
    useEffect(() => {
      this.attributesChanged.get()
      minimum = parseDate(this.getAttribute('min')) || parseDate(dateKey(new Date()))
      const value = parseDate(this.getAttribute('value'))
      selected = value && value >= minimum ? value : minimum
      month = new Date(selected.getFullYear(), selected.getMonth(), 1)
      const label = dateKey(selected).replaceAll('-', '.')
      required('span', trigger).textContent = label
      trigger.setAttribute('aria-label', `Нүүх өдөр: ${label}`)
      trigger.title = `${dateKey(minimum).replaceAll('-', '.')}-ээс нүүх өдөр сонгох`
      draw()
    })
    listen(trigger, 'click', () => {
      if (calendar.matches(':popover-open')) { calendar.hidePopover(); return }
      month = new Date(selected.getFullYear(), selected.getMonth(), 1); draw()
      calendar.showPopover()
      const anchor = trigger.getBoundingClientRect()
      calendar.style.left = `${Math.max(12, Math.min(anchor.left, innerWidth - calendar.offsetWidth - 12))}px`
      calendar.style.top = `${Math.max(12, Math.min(anchor.bottom + 8, innerHeight - calendar.offsetHeight - 12))}px`
      motion.play(calendar, { opacity: [0, 1], transform: ['translateY(-5px)', 'none'] }, { duration: 240 })
      days.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true })
    })
    listen(calendar, 'toggle', () => {
      const open = calendar.matches(':popover-open')
      trigger.setAttribute('aria-expanded', String(open))
      if (!open) motion.stop(calendar)
    })
    listen(previous, 'click', () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); draw() })
    listen(required('.next', this.root), 'click', () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); draw() })
    listen(days, 'click', event => {
      const button = event.target.closest('[data-date]')
      if (!button || button.disabled) return
      this.setAttribute('value', button.dataset.date)
      calendar.hidePopover(); trigger.focus({ preventScroll: true })
      emit(this, 'hamtry-date-change', { value: button.dataset.date })
    })
    // Arrow keys нь disabled өдрүүдийг алгасан сар хооронд шилжинэ.
    listen(days, 'keydown', event => {
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
      const button = event.target.closest('[data-date]')
      if (!delta || !button) return
      event.preventDefault()
      const next = parseDate(button.dataset.date); next.setDate(next.getDate() + delta)
      if (next < minimum) return
      month = new Date(next.getFullYear(), next.getMonth(), 1); draw()
      for (const day of days.querySelectorAll('button')) day.tabIndex = -1
      const target = days.querySelector(`[data-date="${dateKey(next)}"]`)
      if (target) { target.tabIndex = 0; target.focus({ preventScroll: true }) }
    })
    listen(window, 'resize', () => calendar.hidePopover())
    listen(window, 'scroll', () => calendar.hidePopover(), { passive: true })
    onCleanup(() => calendar.hidePopover())
  }
}
