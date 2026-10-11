import '../styles/base.css'
import './home.css'
import { registerComponents, applyDefaultTheme } from '@hamtry/library'
import { HamtryHeroScene } from './components/hero-scene.js'
import { HamtryHome } from './pages/home.js'

// App нь сангаа public entry-ээр импортлоно. React editor тусдаа entry-тэй.
applyDefaultTheme()
registerComponents()
if (!customElements.get('hamtry-hero-scene')) customElements.define('hamtry-hero-scene', HamtryHeroScene)
if (!customElements.get('hamtry-home')) customElements.define('hamtry-home', HamtryHome)
