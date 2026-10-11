import '../styles/base.css'
import './home.css'
import { registerComponents, applyDefaultTheme } from '@hamtry/library'
import { HamtryHeroScene } from './components/hero-scene.js'
import { HamtryHome } from './pages/home.js'
import { HamtryApartmentMap } from './components/apartment-map.js'
import { HamtryRoomEditor } from './components/room-editor.js'
import { HamtryPhotoTour } from './components/photo-tour.js'

// App нь сангаа public entry-ээр импортлоно. React editor тусдаа entry-тэй.
applyDefaultTheme()
registerComponents()
for (const [name, component] of [['hamtry-apartment-map', HamtryApartmentMap], ['hamtry-room-editor', HamtryRoomEditor], ['hamtry-photo-tour', HamtryPhotoTour]]) {
  if (!customElements.get(name)) customElements.define(name, component)
}
if (!customElements.get('hamtry-hero-scene')) customElements.define('hamtry-hero-scene', HamtryHeroScene)
if (!customElements.get('hamtry-home')) customElements.define('hamtry-home', HamtryHome)
