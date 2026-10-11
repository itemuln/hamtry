# Hamtry санг ойлгох гарын авлага

Эхлээд бэлэн компонент ашиглаж сурна, дараа нь дотоод ажиллагааг уншина.

| Дараалал | Гарын авлага | Юу ойлгох вэ? |
| --- | --- | --- |
| 1 | [Компонент ашиглах](components.md) | Нэг import, HTML tag, property, event, form |
| 2 | [Архитектур](architecture.md) | Framework, design system, library, app ямар үүрэгтэй вэ? |
| 3 | [Class ба Shadow DOM](class-guide.md) | `extends`, `this`, `render`, `setup`, lifecycle, slot |
| 4 | [State, effect, DOM helper](state-and-dom.md) | `signal`, `useState`, `useEffect`, `$`, cleanup |
| 5 | [Design system](design-system.md) | Токенууд сангийн компонентод хэрхэн хүрэх вэ? |

## Ажиллуулж үзэх

Terminal-ийн working directory нь `Front-End/client` байна.

```sh
rtk npm run dev
```

Terminal-д гарсан хаягаар ороход `/` дээр интерактив нүүр, `/components.html`
дээр native компонентын туршилт, `/editor.html` дээр бүрэн React showcase ба
theme editor харагдана. [Нүүр ба scene-ийн гарын авлага](homepage.md)-ыг уншаарай.

Бидний сан энгийн JavaScript ES module-уудаас бүтнэ; React/Svelte runtime
импортлохгүй. Vite нь module, CSS, asset-уудыг dev болон build үед холбоно. `useState` нэр төстэй боловч React hook-той яг
ижил API биш: төлөвөө `count()` гэж уншина.

Эхний дасгал: `/components.html` дээрх хоёр тоолуурын зөвхөн нэгийг нь нэмээд үз. Нөгөө нь өөрчлөгдөхгүй
байгаа нь class-ийн instance бүр өөрийн төлөвтэйг харуулна.

- [Газрын зураг ба өрөөний зурагтай аялал](photo-tours.md)

## Дараагийн ажил

- [UX/UI ба Three.js roadmap](roadmap.md)
- [JavaScript folder structure](folder-structure.md)
