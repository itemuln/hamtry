import '../styles/base.css'
import './home.css'
import './dashboard.css'
import { registerComponents, applyDefaultTheme } from '@hamtry/library'
import { HamtryHome } from './pages/home.js'
import { HamtryApartmentMap } from './components/apartment-map.js'
import { HamtryRoomEditor } from './components/room-editor.js'
import { HamtryMoveInPicker } from './components/move-in-picker.js'
import { HamtryPhotoTour } from './components/photo-tour.js'
import { HamtryImmersiveExplore } from './pages/immersive-explore.js'

// 3D хуудас нь ижил header, хайлтын урсгалтай map route-ийг нээнэ.
if (location.pathname === '/explore.html' && !location.hash) history.replaceState(null, '', '#map')

// App нь сангаа public entry-ээр импортлоно. React editor тусдаа entry-тэй.
try {
  const appearance = localStorage.getItem('hamtry:appearance') === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.appearance = appearance
} catch { /* Хадгалалт хаалттай үед анхны цайвар өнгөөр ажиллана. */ }
applyDefaultTheme()
registerComponents()
for (const [name, component] of [['hamtry-immersive-map', HamtryImmersiveExplore], ['hamtry-apartment-map', HamtryApartmentMap], ['hamtry-room-editor', HamtryRoomEditor], ['hamtry-photo-tour', HamtryPhotoTour], ['hamtry-move-in-picker', HamtryMoveInPicker]]) {
  if (!customElements.get(name)) customElements.define(name, component)
}
if (!customElements.get('hamtry-home')) customElements.define('hamtry-home', HamtryHome)
