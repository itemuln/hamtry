# Нүүр хуудас ба Three.js scene хэрхэн ажилладаг вэ?

`/` дээрх Hamtry нь манай JavaScript framework, native Web Components,
shared design system ашигласан интерактив хичээлийн хувилбар. `/components.html`
дээр компонент бүрийг шалгана. Бүрэн React editor `/editor.html` дээр тусдаа.

## Хэрэглэгчийн зам

| Үйлдэл | Үр дүн |
| --- | --- |
| Өрөө / хамтрагч сонгох → байршил, төсөв → хайх | Өрөө бол газрын зураг, хамтрагч бол шүүсэн жагсаалт |
| Түлхүүр үг бичих, дүүрэг/төсөв/амьтан сонгох | Шууд өөрчлөгдөх үр дүн, хоосон үед reset |
| Дэлгэрэнгүй → Escape / хаах | Native dialog, өмнөх зарын хуудас руу буцах |
| Картын зүрх / detail-ийн хадгалах товч | Хадгалсан сонголт; reload хийсэн ч энэ хөтөчид үлдэнэ |
| Миний орон зай → өрөө санал болгох | Миний зарууд цэс, local demo dashboard |
| Өрөө нэмэх → мэдээлэл → preview → засах / хадгалах | Байршил ба өөрийн зургуудтай энэ хөтөчийн зар |

Эдгээр нь бодит бүртгэл, эрхийн шалгалт, зар нийтлэх API биш. [Газрын зураг, зураг нэмэх гарын авлага](photo-tours.md)-ыг уншаарай. Холбоо барих,
чат, захиалга, төлбөр холбогдоогүй. Жишээ заруудыг бодит хүн/байр эсвэл
баталгаажуулалт гэж тооцохгүй. Өөрийн туршилтын зар 20 хүртэл байна.

## Файлуудын үүрэг

- `src/app/pages/home.js`: light DOM page, navigation, form, card composition.
- `src/app/home.css`: responsive page layout, токеноос гаргасан palette.
- `src/app/state/store.js`: filter, route, save, demo role, local зарын signal.
- `src/app/state/model.js`: хайлтын цэвэр функц, hash route, local data validation.
- `src/app/data/listings.js`: хичээлийн тодорхой тэмдэглэсэн жишээ өгөгдөл.
- `src/app/components/hero-scene.js`: Shadow DOM scene class, HTML controls, lifecycle.
- `src/app/components/apartment-scene.js`: raw Three.js renderer, geometry, picking.

`HamtryHome` light DOM хэрэглэдэг тул page layout ердийн CSS-ээр ажиллана.
Товч, input, card, chip, dialog нь сангаас импортлосон Shadow DOM компонентууд.
Hero мөн Shadow DOM-той, гэхдээ Hamtry app-д зориулсан тул сан руу ороогүй.

## Class, signal, effect-ийн бодит жишээ

```js
// Hero component дотор instance бүр өөрийн signal-тай.
rotation = signal(.18)
get rotationSpeed() { return this.rotation.get() }
set rotationSpeed(value) {
  if (Number.isFinite(value)) this.rotation.set(Math.max(0, Math.min(1, value)))
}
```

Page эсвэл browser console дээр:

```js
const hero = document.querySelector('hamtry-hero-scene')
hero.rotationSpeed = .3
hero.paused = true
hero.selectedSpace = 'bedroom' // bedroom | living | kitchen
```

`useEffect()` signal уншилтыг дагаад HTML button-ийн `aria-pressed`, тайлбар,
scene-ийн хөдөлгөөнийг шинэчилнэ. Canvas чимэглэлийн дүрслэл; бүх сонголт native
HTML button-оор keyboard-д хүрнэ. Mouse-аар чирч camera-г эргүүлнэ, өрөөний
шалан дээр дарахад Raycaster тухайн хэсгийг сонгоно. Энэ загвар нь бодит зарын
3D хэмжилт биш, хамтын амьдралыг тайлбарласан жишээ зохиомж.

Form-ын утгыг effect дотор буцааж sync хийхдээ:

```js
const filter = state.filters.get() // Үүнийг dependency болгоно.
untrack(() => { queryField.value = filter.query })
```

Control-ийн setter дотроо signal уншдаг. `untrack()` байхгүй бол setter-ийн
дотоод уншилт page effect-д dependency болж, хэрэглэгч бичих үед өмнөх filter
утгыг буцааж тавьж болно. Хайлтын page энэ асуудлаас хамгаалсан.

## Scene lifecycle

1. `setup()` cleanup/cancellation-ийг эхэлж бүртгэнэ.
2. Hero viewport-д ойр ирэхэд Three module dynamic import-оор ачаална.
3. Renderer нэг canvas/context эзэмшиж, ResizeObserver хэмжээг шинэчилнэ.
4. Animation нь offscreen, document hidden, pause, speed=0, reduced motion үед зогсоно.
5. WebGL2 боломжгүй эсвэл context алдагдвал SVG fallback ба HTML controls үлдэнэ.
6. Remove хийхэд RAF, observers, listeners, renderer, geometry, material, shadow resources цэвэрлэгдэнэ.
7. Reconnect үед шинэ canvas/context үүсгэнэ; instance-ийн сонголт, speed хадгалагдана.

Render pixel ratio 1.5-аар хязгаарлагдана; жижиг хөдөлгөөн нэг RAF loop-той.
Reduced motion үед өөрөө хөвөхгүй, хэрэглэгчийн сонголт/drag хэвээр ажиллана.

## Design system ба reference

Өнгө нь `brand/primary`, `brand/accent-lime`, `brand/accent-pink`, `surface/base`
зэрэг shared token-оос гарна. Page-ийн цайвар гадаргуу `surface/base` ба цагааны
холимог; editor-ийн хадгалсан theme file-д өөрчлөлт бичихгүй. Display typography
нь `--font-display` Manrope, бусад UI нь Inter. Manrope-ийн Cyrillic font ачаална.

[3D Estate](https://3destate.pl/en/)-ийн орон зайгаар танилцуулах санаа,
[Montempz](https://montempz.mn/)-ийн том Монгол typography, compact navigation,
цайвар/бараан section-ийн хэмнэлийг Hamtry-ийн өөрийн агуулгад ашигласан.
Зураг, текст, кодыг хуулбарлаагүй; apartment нь процедур geometry.

[Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer.html),
[Raycaster](https://threejs.org/docs/pages/Raycaster.html),
[resource disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html),
[reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
нь implementation-ийн үндсэн лавлагаа.
