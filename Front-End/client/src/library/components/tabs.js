import {
  HamtryElement,
  $,
  emit,
  listen,
  onCleanup,
  required,
  signal,
  useEffect,
} from '../core/index.js'
import { style } from './styles.js'
export class HamtryTabs extends HamtryElement {
  // Сонгосон tab нь HTML attribute болон JS property-оор удирдагдана.
  static observedAttributes = ['selected']
  selection = signal(0)
  get selected() {
    return this.selection.get()
  }
  set selected(value) {
    this.selection.set(value)
  }
  render() {
    style(this.root)
    this.root.innerHTML =
      '<div class="ht-tabs" role="tablist" aria-label="Сонголтууд"></div><div id="panels"></div>'
  }
  setup() {
    const list = required('#panels', this.root)
    const tablist = required('[role="tablist"]', this.root)
    const build = () => {
      // Хуудасны хүүхэд section бүрийг named slot-оор өөр panel-д холбоно.
      tablist.replaceChildren()
      list.replaceChildren()
      Array.from(this.children).forEach((child, index) => {
        const name = `panel-${index}`
        child.setAttribute('slot', name)
        const button = document.createElement('button')
        button.type = 'button'
        button.id = `tab-${index}`
        button.dataset.index = String(index)
        button.setAttribute('role', 'tab')
        button.setAttribute('aria-controls', name)
        button.textContent =
          child.getAttribute('label') || `Сонголт ${index + 1}`
        const panel = document.createElement('div')
        panel.id = name
        panel.className = 'ht-tab-panel'
        panel.setAttribute('role', 'tabpanel')
        panel.setAttribute('aria-labelledby', button.id)
        panel.tabIndex = 0
        const slot = document.createElement('slot')
        slot.name = name
        panel.append(slot)
        tablist.append(button)
        list.append(panel)
      })
      this.attributesChanged.set((value) => value + 1)
    }
    build()
    const observer = new MutationObserver(build)
    observer.observe(this, { childList: true })
    onCleanup(() => observer.disconnect())
    let lastAttribute
    useEffect(() => {
      this.attributesChanged.get()
      const attribute = this.getAttribute('selected')
      if (attribute !== lastAttribute) {
        lastAttribute = attribute
        this.selection.set(Number(attribute) || 0)
      }
      const buttons = $('button', tablist)
      const selected = Math.max(
        0,
        Math.min(Math.trunc(this.selected) || 0, buttons.length - 1),
      )
      this.selection.set(selected)
      buttons.forEach((button, index) => {
        button.setAttribute('aria-selected', String(index === selected))
        // Tab товч зөвхөн сонгосон удирдлагад зогсоно; бусдад сум ашиглана.
        button.tabIndex = index === selected ? 0 : -1
      })
      $('[role="tabpanel"]', list).forEach((panel, index) => {
        panel.hidden = index !== selected
      })
    })
    const choose = (index) => {
      this.selected = index
      $('button', tablist)[index]?.focus()
      emit(this, 'hamtry-tab-change', { selected: index })
    }
    listen(tablist, 'click', (event) => {
      const button = event.target.closest('button')
      if (button) choose(Number(button.dataset.index))
    })
    listen(tablist, 'keydown', (event) => {
      const key = event.key
      const count = tablist.children.length
      if (!count || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key))
        return
      event.preventDefault()
      choose(
        key === 'Home'
          ? 0
          : key === 'End'
            ? count - 1
            : (this.selected + (key === 'ArrowRight' ? 1 : -1) + count) % count,
      )
    })
  }
}
