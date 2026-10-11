# Төлөв, effect, DOM helper

## `signal`: өөрчлөлт мэдэгддэг утга

```js
import { signal } from '@hamtry/library'

const count = signal(0)
count.get()                         // 0
count.set(5)                        // Шинэ утга
count.set(previous => previous + 1)  // Өмнөх утгаар тооцоолно
```

`get()` нь одоогийн утгыг уншина. `set()` нь шинэ утгаа шууд хадгалж,
уншигч effect-үүдэд шинэчлэлт төлөвлөнө. Өмнөхтэй `Object.is`-аар ижил бол
шинэчлэлт үүсгэхгүй. Object/array дотрыг шууд mutate хийхийн оронд шинэ
object/array өгөх хэрэгтэй.

```js
const profile = signal({ name: 'Номин' })
profile.set(previous => ({ ...previous, name: 'Болд' }))
```

## `useState`: signal-ийг хос функцээр хэрэглэх

```js
import { useState } from '@hamtry/library'

const [count, setCount] = useState(0)
console.log(count())
setCount(previous => previous + 1)
```

`count` нь тоо биш функц. `count()` гэж дуудаж хамгийн сүүлийн утгаа уншина.
`useState` нь React-ийн hook биш; hook-ийн дараалал эсвэл component rerender
систем байхгүй. Class field дээр нэг удаа үүсгэж instance-ийн төлөв болгоно.

## `useEffect`: уншсан төлөвөө автоматаар дагана

```js
import { useState, useEffect, Scope } from '@hamtry/library'

const scope = new Scope()
const [count, setCount] = useState(0)

scope.run(() => {
  useEffect(() => console.log('Тоо:', count()))
})
setCount(1)
setCount(2)
// Эхлээд 0 хэвлэнэ. Дараагийн microtask-д 2-ыг нэг удаа хэвлэнэ.

// Хэрэглэж дуусаад listener/effect-үүдээ цэвэрлэнэ.
// Энэ жижиг жишээнд шинэчлэлт ажиллах microtask-ийн дараа dispose хийнэ.
queueMicrotask(() => scope.dispose())
```

Effect анх шууд ажиллахдаа `count()`-ийг уншсанаа бүртгэнэ. Дараа нь тэр
төлөв өөрчлөгдөхөд ажиллана. Dependency array дамжуулахгүй. `if/else` дотор
уншдаг signal солигдвол хуучин dependency арилж шинэ нь бүртгэгдэнэ.

**Зөвхөн синхрон уншилт бүртгэгдэнэ.** `await`-ын дараах уншилтыг effect
автоматаар дагахгүй. Async ажил хийх бол хамаарах төлөвөө эхлээд уншаад,
ажлаа эхлүүлж, хуучин ажлыг cleanup-ээр цуцална.

```js
// Компонентын setup() дотор хэрэглэх жишээ.
useEffect(() => {
  const currentQuery = search.get()
  const controller = new AbortController()
  // Хуудсанд байгаа бодит fetch функцийг энд дуудна.
  void loadResults(currentQuery, controller.signal)
  return () => controller.abort()
})
```

Энэ хэсгийн `search`, `loadResults` нь тухайн хуудасны өөрийн төлөв ба
хүсэлтийн функц; сангаас экспортлогдохгүй. React шиг async function-ийг
`useEffect` callback болгож өгөхгүй. Effect нь `void` эсвэл cleanup function
буцаана. Шинэ утга бүрт гаднын timer/fetch хамааруулахгүй унших бол
`untrack(() => anotherSignal.get())` хэрэглэнэ.

## Cleanup ба lifecycle

| API | Хэзээ хэрэглэх вэ? | Хэн цэвэрлэх вэ? |
| --- | --- | --- |
| `useEffect(fn)` | Төлөвтэй холбоотой DOM эсвэл нөөц шинэчлэх | Scope эсвэл буцаасан disposer |
| `onMount(fn)` | `setup()` үеэр timer/observer/canvas эхлүүлэх | Буцаасан cleanup-ийг scope |
| `onCleanup(fn)` | Өөрөө үүсгэсэн нөөцийн цэвэрлэгээ бүртгэх | Одоогийн scope |
| `listen(target, event, fn)` | Component/page scope дотор listener бүртгэх | Scope |
| `on(target, event, fn)` | Scope-гүй listener бүртгэх | Буцаасан stop функцийг caller |

`onMount`, `onCleanup`, `listen`-ийг component `setup()` эсвэл
`scope.run(...)` дотор синхрон дуудна. `await`-ын дараа scope автоматаар
үргэлжлэхгүй. `onMount` нь class instance үүсэхэд биш, холбогдох бүрийн setup
дотор ажиллана.

```js
// setup() дотор:
onMount(() => {
  const timer = setInterval(() => setCount(previous => previous + 1), 1000)
  return () => clearInterval(timer)
})
```

Effect-ийн cleanup дахин ажиллахын өмнө болон dispose хийхэд дуудагдана.
Nested effect нь outer effect-ийн тухайн ажиллалтад хамаарна. Cleanup синхрон
байна. Effect өөрийн уншсан төлөвийг байнга нэмсээр байвал cycle error гарна;
ингэж хязгааргүй шинэчлэлт хийж болохгүй.

## `$` ба жижиг DOM helper-үүд

```js
import { $, query, required, listen, bindText, emit } from '@hamtry/library'

// Бүх элемент: NodeList биш, жинхэнэ array.
const buttons = $('hamtry-button', document)
buttons.forEach(button => console.log(button))

// Эхний элемент, олдохгүй бол null.
const field = query('hamtry-input', document)

// Component setup() дотор өөрийн shadow root-оос хайна.
const output = required('output', this.root)
bindText(output, () => count())
listen(required('button', this.root), 'click', () => setCount(1))
emit(this, 'lesson-change', { count: count() })
```

Сүүлийн дөрвөн мөр нь class-ийн `setup()` дотор хэрэглэх жишээ; `this.root`
нь тэнд байгаа ShadowRoot. `$` нь jQuery биш: `.on()` chaining байхгүй,
`$('...', root)` нь array буцаана. Нэг элемент хэрэгтэй бол `query()` эсвэл
`required()` хэрэглэнэ. `$` бусдын Shadow DOM руу автоматаар нэвтрэхгүй.

`bindText` нь `textContent` ашигладаг тул текстийг HTML гэж тайлбарлахгүй.
`emit` нь `bubbles: true`, `composed: true` event гаргадаг. Хуудас event-ийг
сонсоод detail-ээс өгөгдлөө авна.
