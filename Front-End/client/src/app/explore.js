import '../styles/base.css'
import './explore-base.css'
import { applyDefaultTheme, registerComponents } from '@hamtry/library'
// Өмнөх процедур хотыг тусдаа сонголтоор хадгална.
const { HamtryExplore } = new URLSearchParams(location.search).get('view') === 'classic'
  ? await import('./pages/explore.js')
  : { HamtryExplore: (await import('./pages/immersive-explore.js')).HamtryImmersiveExplore }

applyDefaultTheme()
registerComponents()
if (!customElements.get('hamtry-explore')) customElements.define('hamtry-explore', HamtryExplore)
