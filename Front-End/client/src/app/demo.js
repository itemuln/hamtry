import '../styles/base.css'
import './styles.css'
import { registerComponents, applyDefaultTheme } from '@hamtry/library'
import { HamtryCounter } from './components/counter.js'
import { HamtryComponentDemo } from './pages/component-demo.js'

// Хуудасны эхлэл: design token, сангийн tag, page-ийн tag-уудаа холбоно.
// Хадгалсан theme-ийг HTML дахь /hamtry-theme.js тусад нь шинэчилнэ.
applyDefaultTheme()
registerComponents()
if (!customElements.get('hamtry-counter'))
  customElements.define('hamtry-counter', HamtryCounter)
if (!customElements.get('hamtry-component-demo'))
  customElements.define('hamtry-component-demo', HamtryComponentDemo)
