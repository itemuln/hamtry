# Бэлэн компонентуудыг импортлож ашиглах

## Нэг үүдээр импортлох

Хуудасны JavaScript module дотор:

```js
import '../styles/base.css'
import { registerComponents, applyDefaultTheme } from '@hamtry/library'

applyDefaultTheme()
registerComponents()
```

`src/app/main.js` яг энэ зарчмаар санг хэрэглэдэг. `registerComponents()` нь
`hamtry-*` tag-уудыг browser-т бүртгэнэ. Нэг хуудсанд дахин дуудахад өмнө
бүртгэсэн tag-ийг overwrite хийхгүй. `applyDefaultTheme()` нь анхны CSS
токенуудыг нэг удаа үүсгэнэ. `src/styles/base.css` нь page-ийн үндсэн style, fonts,
typography-г ачаална.

Хадгалсан shared theme-ээ ашиглах бол HTML-ийн head дотор нэг удаа:

```html
<script type="module" src="/hamtry-theme.js"></script>
```

Энэ module нь theme route-уудтай Hamtry server дээр ажиллана. Alias нь Vite
болон jsconfig-д тохируулагдсан; bare import-ийг browser шууд тайлбарлахгүй.
Бидний кодыг Vite-ээр ажиллуулна.

## Товч, label, alert

```html
<hamtry-button variant="primary" size="md">Хадгалах</hamtry-button>
<hamtry-button variant="outline" disabled>Боломжгүй</hamtry-button>
<hamtry-button loading>Уншиж байна</hamtry-button>
<hamtry-badge tone="success">Баталгаажсан</hamtry-badge>
<hamtry-alert tone="info" heading="Мэдээлэл" dismissible>
  Профайлаа бөглөөрэй.
</hamtry-alert>
```

Button variant: `primary`, `secondary`, `outline`, `ghost`, `destructive`.
Size: `sm`, `md`, `lg`. Tone: `neutral`, `info`, `success`, `warning`, `error`.
Boolean attribute-д `disabled="false"` гэж бичвэл мөн disabled болно.
Идэвхжүүлэхдээ attribute-ийг устгах эсвэл `button.disabled = false` хэрэглэнэ.

## Form талбарууд

```html
<form id="profile-form">
  <hamtry-input name="email" label="И-мэйл" type="email" required></hamtry-input>
  <hamtry-textarea name="about" label="Өөрийн тухай"></hamtry-textarea>
  <hamtry-select name="district" label="Дүүрэг">
    <option value="sukhbaatar">Сүхбаатар</option>
    <option value="bayanzurkh">Баянзүрх</option>
  </hamtry-select>
  <hamtry-checkbox name="pets" value="yes" label="Амьтанд дуртай"></hamtry-checkbox>
  <hamtry-switch name="notifications" value="yes" label="Мэдэгдэл авах" checked></hamtry-switch>
  <hamtry-radio name="role" value="seeker" label="Өрөө хайж байна" checked required></hamtry-radio>
  <hamtry-radio name="role" value="provider" label="Өрөө түрээслүүлнэ"></hamtry-radio>
  <hamtry-button type="submit">Хадгалах</hamtry-button>
  <hamtry-button type="reset" variant="outline">Цэвэрлэх</hamtry-button>
</form>
```

Эдгээр нь `ElementInternals`-ээр native form-д оролцоно. `required`, email
validation, reset, disabled fieldset, `FormData` ажиллана. Submit товч нь
validation амжилттай бол form-ийн `submit` event гаргана. `input` дээр Enter
дарахад submit хийнэ; `textarea` дээр Enter нь шинэ мөр үүсгэнэ.

```js
import { Scope, listen, required } from '@hamtry/library'

const pageScope = new Scope()
pageScope.run(() => {
  const form = required('#profile-form', document)
  listen(form, 'submit', event => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(form))
    console.log(data)
    // Бодит хадгалах хүсэлтийг хуудас энд хариуцна.
  })
})
// Хуудас/route-аа салгах үед pageScope.dispose() дуудна.
```

Checked checkbox/switch л FormData-д орно. Radio нь ижил form, root, name
бүлэгт нэг сонголттой. Select нь `option` болон `optgroup` дэмжинэ.
Field-үүдийн `helper` нь тайлбар, `error` нь validation-ийн нэмэлт алдаа.
Input нь `min`, `max`, `step`, `minlength`, `maxlength`, `pattern` зэрэг
тухайн native төрөлд хамаарах constraint-ийг дамжуулна.

## Attribute ба property

```js
import { required } from '@hamtry/library'

const email = required('hamtry-input', document)
email.value = 'student@example.com'
email.disabled = false
email.setAttribute('helper', 'Энэ хаягаар холбогдоно.')

const notifications = required('hamtry-switch', document)
notifications.checked = true
```

HTML-ийн `value`/`checked` attribute нь default утга бөгөөд form reset хийхэд
ашиглагдана. `.value`/`.checked` property нь одоогийн төлөв; property бичих нь
default attribute-ийг заавал өөрчлөхгүй. `.value`/`.checked` нь холбогдсон native
control болон form value-тай шууд sync хийнэ. Бусад reactive DOM шинэчлэлт
microtask-д хийгдэнэ.

Field-ийн `.form`, `.validity`, `.validationMessage`, `.checkValidity()`,
`.reportValidity()`, `.focus()`-ийг ашиглаж болно. Сангийн бүх attribute нь
ижил нэртэй JS property болж автоматаар үүсэхгүй; `label` зэрэгт
`setAttribute()` хэрэглэнэ.

## Tab ба card

```html
<hamtry-tabs selected="0">
  <section label="Хамтрагчид">Хамтрагчдын агуулга</section>
  <section label="Өрөөнүүд">Өрөөний агуулга</section>
</hamtry-tabs>

<hamtry-roommate-card
  heading="Номин, 24"
  image="/images/nomin.jpg"
  image-alt="Номингийн зураг"
  location="Сүхбаатар"
  price="750,000 ₮ / сар"
  description="Тайван, цэвэрч хамтрагч хайж байна."
>
  <hamtry-badge tone="success">Баталгаажсан</hamtry-badge>
</hamtry-roommate-card>
```

Зургийн `/images/nomin.jpg` зам нь таны бодитоор оруулсан asset байх ёстой.
`hamtry-property-card` нь ижил API-тай, өрөөний зургийн өөр харьцаатай.
Tabs нь хүүхэд элемент бүрийн `label`-ийг tab нэр болгоно; ArrowLeft,
ArrowRight, Home, End дэмжинэ. Одоогийн сонголтыг `tabs.selected = 1` гэж
бичиж болно. Panel children-ийг runtime-д нэмэх/хасахыг ажиглана; label
attribute-ийг дангаар нь солих нь одоогоор tab-ийг rebuild хийхгүй.

| Event | `detail` | Page хийх зүйл |
| --- | --- | --- |
| `hamtry-save` | `{ saved: boolean }` | Зар хадгалах/хасах үйлдэл |
| `hamtry-tab-change` | `{ selected: number }` | Page-ийн сонголт шинэчлэх |
| `hamtry-dismiss` | `{}` | Alert хаагдсаныг мэдэх |
| Field `change` | `{ value: string, checked: boolean }` | Одоогийн талбарын утгыг авах |
| Field `input` | Native InputEvent/Event | Бичиж байх үеийн өөрчлөлт |

Custom event-үүд Shadow DOM-ийн хилээр гарна. Энгийн үйлдэлд native `click`
сонсоно. Card save төлөв нь дангаараа backend хадгалалт болохгүй.

## Гаднаас theme/style өөрчлөх

Өнгө, radius, spacing-ийг [design system-ийн токеноор](design-system.md)
өөрчилнө. Тусгай override үнэхээр хэрэгтэй бол component-ийн нээсэн
`::part(button)`, `::part(control)`, `::part(card)`, `::part(alert)`,
`::part(badge)`-ийг ашиглаж болно. Page нь компонентын private shadow selector
эсвэл дотоод DOM бүтэц дээр бизнес логик байгуулахгүй.
