import { HamtryElement, emit, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import css from './hero-scene.css?inline'
const sheet = new CSSStyleSheet()
sheet.replaceSync(css)
const spaces = { living: ['Зочны хэсэг', 'Хамтдаа ярилцах, амрах жижиг орон зай.'], bedroom: ['Таны хувийн булан', 'Өөрийн хэмнэлээр ажиллах, амрах өрөө.'], kitchen: ['Хамтын гал тогоо', 'Өглөөний кофе, оройн хоол, шинэ дурсамж.'] }

export class HamtryHeroScene extends HamtryElement {
  rotation = signal(.18)
  stopped = signal(false)
  space = signal('living')
  status = signal('idle')
  get paused() { return this.stopped.get() }
  set paused(value) { this.stopped.set(Boolean(value)) }
  get rotationSpeed() { return this.rotation.get() }
  set rotationSpeed(value) { if (Number.isFinite(value)) this.rotation.set(Math.max(0, Math.min(1, value))) }
  get selectedSpace() { return this.space.get() }
  set selectedSpace(value) { if (spaces[value]) this.space.set(value) }
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `
      <div class="stage">
        <div class="halo" aria-hidden="true"></div>
        <svg class="fallback" aria-hidden="true" viewBox="0 0 640 480">
          <g stroke="var(--brand-primary)" stroke-opacity=".12" stroke-width="2" stroke-linejoin="round">
            <path fill="var(--brand-accent-pink)" d="M100 273 350 140 577 265 328 413Z"/>
            <path fill="var(--text-inverse)" d="M100 273V172L350 42V140ZM350 42 577 164V265L350 140Z"/>
            <path fill="var(--brand-accent-lime)" d="M148 247 251 192 328 234 226 290Z"/>
            <path fill="var(--text-inverse)" d="M153 228V199L247 148 328 191V225L226 281Z"/>
            <path fill="var(--brand-accent-pink)" d="M311 274 416 216 504 267 395 325Z"/>
            <path fill="var(--text-inverse)" d="M346 310 397 282 443 306 392 334Z"/>
            <path fill="var(--brand-primary)" d="M485 292 510 279 537 293 510 309Z"/>
          </g>
          <ellipse fill="var(--brand-accent-lime)" cx="515" cy="276" rx="23" ry="37"/>
        </svg>
        <canvas aria-hidden="true"></canvas>
        <div class="stage-top"><span class="live-dot"></span> ӨӨРИЙН ОРОН ЗАЙГ ТӨСӨӨЛ</div>
        <button class="pause" type="button" aria-label="Хөдөлгөөн түр зогсоох">Ⅱ</button>
        <div class="note"><span class="note-tag">ХАМТЫН АМЬДРАЛ</span><strong></strong><p></p></div>
        <div class="controls" role="group" aria-label="Орон зай сонгох">
          <button type="button" data-space="bedroom">Хувийн өрөө</button><button type="button" data-space="living">Зочны хэсэг</button><button type="button" data-space="kitchen">Гал тогоо</button>
        </div>
        <p class="hint">Чирж эргүүлээрэй <span aria-hidden="true">↔</span> <span class="state-hint"></span></p>
      </div>`
  }
  setup() {
    // Dispose хийсэн WebGL context-ийг дахин ашиглахгүй. Reconnect үед шинэ canvas авна.
    const previousCanvas = required('canvas', this.root)
    const canvas = previousCanvas.cloneNode(false)
    previousCanvas.replaceWith(canvas)
    const visible = signal(false), reduced = signal(matchMedia('(prefers-reduced-motion: reduce)').matches), hidden = signal(document.hidden)
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let active = true, loading = false, scene
    this.status.set('idle')
    const resize = () => { const { width, height } = canvas.getBoundingClientRect(); scene?.resize(width, height) }
    const update = () => scene?.update({ running: this.status.get() !== 'fallback' && visible.get() && !hidden.get() && !reduced.get() && !this.paused && this.rotationSpeed > 0, rotationSpeed: this.rotationSpeed, space: this.selectedSpace })
    // Async import-аас өмнө cleanup бүртгэнэ. Салсан instance-д renderer үүсгэхгүй.
    onCleanup(() => { active = false; scene?.dispose(); this.scene = undefined })
    const load = async () => {
      if (loading || scene) return
      loading = true; this.status.set('loading')
      try {
        const { createApartmentScene } = await import('./apartment-scene.js')
        if (!active) return
        scene = createApartmentScene(canvas, this, space => {
          this.selectedSpace = space
          emit(this, 'hamtry-space-select', { space })
        })
        this.scene = scene; resize(); update(); this.status.set('ready')
      } catch {
        // WebGL боломжгүй үед HTML сонголт ба static зураг ажилласаар байна.
        scene?.dispose(); scene = undefined; this.scene = undefined
        if (active) this.status.set('fallback')
      }
    }
    const intersection = new IntersectionObserver(entries => {
      visible.set(entries[0].isIntersecting)
      if (entries[0].isIntersecting) void load()
    }, { rootMargin: '120px' })
    intersection.observe(this)
    onCleanup(() => intersection.disconnect())
    const observer = new ResizeObserver(resize); observer.observe(canvas)
    onCleanup(() => observer.disconnect())
    listen(preference, 'change', event => reduced.set(event.matches))
    listen(document, 'visibilitychange', () => hidden.set(document.hidden))
    listen(window, 'hamtry-theme-change', () => scene?.recolor())
    listen(canvas, 'webglcontextlost', event => {
      event.preventDefault(); scene?.update({ running: false, rotationSpeed: 0, space: this.selectedSpace }); this.status.set('fallback')
    })
    listen(required('.pause', this.root), 'click', () => { this.paused = !this.paused })
    for (const button of this.root.querySelectorAll('[data-space]')) listen(button, 'click', () => {
      this.selectedSpace = button.dataset.space
      emit(this, 'hamtry-space-select', { space: this.selectedSpace })
    })
    useEffect(() => {
      update()
      const state = this.status.get(), space = this.selectedSpace
      this.dataset.sceneState = state
      canvas.hidden = state !== 'ready'
      required('.fallback', this.root).toggleAttribute('hidden', state === 'ready')
      required('.note strong', this.root).textContent = spaces[space][0]
      required('.note p', this.root).textContent = spaces[space][1]
      for (const button of this.root.querySelectorAll('[data-space]')) button.setAttribute('aria-pressed', String(button.dataset.space === space))
      const pause = required('.pause', this.root)
      pause.textContent = this.paused ? '▷' : 'Ⅱ'
      pause.setAttribute('aria-pressed', String(this.paused))
      pause.setAttribute('aria-label', this.paused ? 'Хөдөлгөөн үргэлжлүүлэх' : 'Хөдөлгөөн түр зогсоох')
      pause.hidden = reduced.get() || state !== 'ready'
      const hint = required('.hint', this.root)
      hint.textContent = state === 'fallback' ? 'Товчоор орон зай сонгоорой · Зургийн хувилбар' : state === 'loading' ? 'Загвар бэлдэж байна…' : 'Чирж эргүүлээрэй ↔ · Жишээ зохиомж'
    })
  }
}
