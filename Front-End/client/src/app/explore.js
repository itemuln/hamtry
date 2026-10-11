import '../styles/base.css'
import './explore-base.css'
import { applyDefaultTheme, registerComponents } from '@hamtry/library'
import { HamtryExplore } from './pages/explore.js'

applyDefaultTheme()
registerComponents()
if (!customElements.get('hamtry-explore')) customElements.define('hamtry-explore', HamtryExplore)
