import { HamtryChip } from './chip.js'
import { HamtryDialog } from './dialog.js'
import { HamtryButton, HamtryBadge, HamtryAlert } from './primitives.js'
import {
  HamtryInput,
  HamtryTextarea,
  HamtrySelect,
  HamtryCheckbox,
  HamtryRadio,
  HamtrySwitch,
} from './fields.js'
import { HamtryTabs } from './tabs.js'
import { HamtryRoommateCard, HamtryPropertyCard } from './cards.js'
export function registerComponents() {
  // Нэг tag-ийг browser дээр хоёр бүртгэж болохгүй тул өмнө бүртгэсэн эсэхийг шалгана.
  const elements = {
    'hamtry-chip': HamtryChip,
    'hamtry-dialog': HamtryDialog,
    'hamtry-button': HamtryButton,
    'hamtry-input': HamtryInput,
    'hamtry-textarea': HamtryTextarea,
    'hamtry-select': HamtrySelect,
    'hamtry-checkbox': HamtryCheckbox,
    'hamtry-radio': HamtryRadio,
    'hamtry-switch': HamtrySwitch,
    'hamtry-badge': HamtryBadge,
    'hamtry-alert': HamtryAlert,
    'hamtry-tabs': HamtryTabs,
    'hamtry-roommate-card': HamtryRoommateCard,
    'hamtry-property-card': HamtryPropertyCard,
  }
  for (const [name, element] of Object.entries(elements)) {
    if (!customElements.get(name)) customElements.define(name, element)
  }
}
export {
  HamtryChip,
  HamtryDialog,
  HamtryButton,
  HamtryBadge,
  HamtryAlert,
  HamtryInput,
  HamtryTextarea,
  HamtrySelect,
  HamtryCheckbox,
  HamtryRadio,
  HamtrySwitch,
  HamtryTabs,
  HamtryRoommateCard,
  HamtryPropertyCard,
}
