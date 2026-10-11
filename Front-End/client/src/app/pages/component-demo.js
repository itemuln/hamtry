import { Scope, listen, onCleanup, query, required, useEffect } from '@hamtry/library'
import roommateImage from '../../assets/roommate.jpg'
import propertyImage from '../../assets/property-source.png'

export class HamtryComponentDemo extends HTMLElement {
  scope
  connectedCallback() {
    if (this.scope) return
    // /components.html нь сангийн туршилт; үндсэн нүүр / дээр тусдаа ажиллана.
    if (!this.children.length)
      this.innerHTML = `
      <main class="native-demo">
        <header><img src="/hamtry.svg" alt="Hamtry" width="48" height="48"><div><p>HAMTRY / NATIVE COMPONENTS</p><h1>Компонентуудын туршилт</h1></div><a href="/editor.html">Дизайн системийн редактор →</a></header>
        <p>Сангийн компонентуудын ажиллагааг энд шалгана. <a href="/">Нүүр хуудас →</a></p>
        <p id="theme-status" role="status"></p>
        <section aria-labelledby="state-heading"><h2 id="state-heading">Тусдаа төлөв</h2><p>Тооцоолуур бүр өөрийн төлөвтэй.</p><div class="demo-grid"><hamtry-counter></hamtry-counter><hamtry-counter></hamtry-counter></div></section>
        <section aria-labelledby="form-heading"><h2 id="form-heading">Маягт ба удирдлагууд</h2>
          <form id="demo-form"><div class="demo-grid">
            <hamtry-input name="email" label="И-мэйл" type="email" required placeholder="you@example.com" helper="Зөв и-мэйл хаяг оруулна уу."></hamtry-input>
            <hamtry-select name="district" label="Дүүрэг"><option value="sukhbaatar">Сүхбаатар</option><option value="bayanzurkh">Баянзүрх</option></hamtry-select>
            <hamtry-textarea name="about" label="Танилцуулга" placeholder="Өөрийн тухай"></hamtry-textarea>
            <div><hamtry-checkbox name="pets" label="Амьтанд дуртай" value="yes"></hamtry-checkbox><hamtry-switch name="notifications" label="Мэдэгдэл авах" checked value="yes"></hamtry-switch><hamtry-radio name="role" value="seeker" label="Өрөө хайж байна" checked required></hamtry-radio><hamtry-radio name="role" value="provider" label="Өрөө түрээслүүлнэ"></hamtry-radio></div>
          </div><div class="demo-actions"><hamtry-button type="submit">Шалгах</hamtry-button><hamtry-button type="reset" variant="outline">Цэвэрлэх</hamtry-button><hamtry-button disabled>Идэвхгүй</hamtry-button><hamtry-button loading>Уншиж байна</hamtry-button></div><output id="form-result" role="status"></output></form>
        </section>
        <section aria-labelledby="feedback-heading"><h2 id="feedback-heading">Мэдээлэл</h2><div class="demo-actions"><hamtry-badge tone="success">Баталгаажсан</hamtry-badge><hamtry-badge tone="info">Шинэ</hamtry-badge></div><hamtry-alert heading="Компонентууд бэлэн" tone="success" dismissible>Өөрийн framework болон хамтын токенуудаар ажиллаж байна.</hamtry-alert></section>
        <section aria-labelledby="market-heading"><h2 id="market-heading">Зарын компонентууд</h2><hamtry-tabs><section label="Хамтрагчид"><hamtry-roommate-card heading="Номин, 24" location="Сүхбаатар · 8-р хороо" price="750,000 ₮ / сар" description="Энэ бол компонентын жишээ өгөгдөл." image="${roommateImage}" image-alt="Номингийн профайл зураг"></hamtry-roommate-card></section><section label="Өрөөнүүд"><hamtry-property-card heading="Тавилгатай хувийн өрөө" location="Сүхбаатар · 8-р хороо" price="850,000 ₮ / сар" description="Энэ бол компонентын жишээ өгөгдөл." image="${propertyImage}" image-alt="Тавилгатай хувийн өрөө"></hamtry-property-card></section></hamtry-tabs><p id="saved-status" role="status"></p></section>
        <section aria-labelledby="overlay-heading"><h2 id="overlay-heading">Сонголт ба modal</h2><div class="demo-actions"><hamtry-chip>Амьтан зөвшөөрнө</hamtry-chip><hamtry-button id="open-dialog">Цонх нээх</hamtry-button></div><p id="chip-result" role="status"></p><hamtry-dialog heading="Native dialog"><p>Escape дарж хаагаарай. Browser focus-ийг нээсэн товчид буцаана.</p><hamtry-button id="close-dialog">Хаах</hamtry-button></hamtry-dialog></section>
      </main>`
    const scope = new Scope()
    this.scope = scope
    scope.run(() => {
      const dialog = required('hamtry-dialog', this)
      listen(required('#open-dialog', this), 'click', () => dialog.showModal())
      listen(required('#close-dialog', this), 'click', () => dialog.close())
      listen(required('hamtry-chip', this), 'hamtry-toggle', event => { required('#chip-result', this).textContent = event.detail.selected ? 'Сонгосон' : 'Сонгоогүй' })
      onCleanup(() => dialog.close())
      const form = required('#demo-form', this)
      listen(form, 'submit', (event) => {
        event.preventDefault()
        required('#form-result', this).textContent = JSON.stringify(
          Object.fromEntries(new FormData(form)),
          null,
          2,
        )
      })
      listen(form, 'reset', () => {
        required('#form-result', this).textContent = ''
      })
      listen(this, 'hamtry-save', (event) => {
        required('#saved-status', this).textContent = event.detail.saved
          ? 'Жишээ зарыг хадгаллаа.'
          : 'Жишээ зарыг хадгалснаас хаслаа.'
      })
      listen(window, 'hamtry-theme-error', () => {
        required('#theme-status', this).textContent =
          'Хамтын загварыг ачаалж чадсангүй. Дахин оролдож байна.'
      })
      listen(window, 'hamtry-theme-change', () => {
        required('#theme-status', this).textContent = ''
      })
      // Компонентын public property-оор төлөвийг уншина.
      const email = query('hamtry-input', this)
      const tabs = query('hamtry-tabs', this)
      useEffect(() => {
        email.dataset.activePanel = String(tabs.selected)
      })
    })
  }
  disconnectedCallback() {
    this.scope?.dispose()
    this.scope = undefined
  }
}
