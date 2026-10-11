# Хавтаснуудыг хэрхэн ашиглах вэ?

Бид JavaScript ES module хэрэглэнэ. Native app болон сан `.js`, тусдаа React
editor `.jsx` файлтай. TypeScript compiler хэрэглэхгүй. `jsconfig.json` нь
editor-ийн import autocomplete-д зориулсан mapping; build-ийг Vite хийнэ.

```text
Front-End/client/
├── src/
│   ├── library/                # Дахин хэрэглэгдэх манай сан
│   │   ├── index.js            # @hamtry/library public API
│   │   ├── theme.js            # Default theme bootstrap
│   │   ├── core/               # signal, effect, scope, DOM helper, base class
│   │   ├── design-system/      # tokens, theme generator, CSS, system SVG
│   │   └── components/         # 12 native Web Components
│   ├── app/                    # Сангаа хэрэглэдэг native web app
│   │   ├── main.js             # Эхлэл: style/theme/tag бүртгэл
│   │   ├── pages/              # Одоогоор component-demo.js
│   │   ├── components/         # Зөвхөн app-д хэрэгтэй counter.js
│   │   └── styles.css          # App layout
│   ├── editor/                 # Тусдаа бүрэн React showcase/theme editor
│   ├── assets/                 # Хуудас, editor-ийн жишээ зураг
│   └── styles/base.css         # Хуудасны fonts, reset, typography
├── server/                     # Built page server + theme GET/PUT route
├── theme/hamtry-theme.json     # Хэрэглэгчийн Save хийсэн shared theme
├── public/                     # Shared theme loader, logo
├── tests/                      # Энгийн JS runtime/theme тест
├── index.html                  # Native page
├── editor.html                 # Editor page
├── vite.config.js              # Build/dev болон public alias
└── jsconfig.json               # Editor import mapping

docs/
├── human/                      # Монгол тайлбар, сурах заавар, UX төлөвлөгөө
└── agents/                     # Contract, файл эзэмшил, validation, next work
```

## Шинэ файл хаана тавих вэ?

- Өөр ямар ч page ашиглаж болох control бол `src/library/components/`.
- Өнгө, typography, radius, spacing-ийн shared утга бол `src/library/design-system/`.
- Signal/scope зэрэг ерөнхий runtime бол `src/library/core/`.
- Нүүр хуудас бол `src/app/pages/home.js`; энэ нь дараагийн ажил, одоогоор байхгүй.
- Header/search зэрэг Hamtry app-ийн агуулгатай хэсэг бол `src/app/components/`.
- Нэг page-ийн Three.js scene бол эхлээд app component дотор. Хоёр ба түүнээс
  олон хэрэглэгч үнэхээр хэрэгтэй бол сан руу ерөнхий API-тай шилжүүлнэ.
- Editor-ийн React код бол зөвхөн `src/editor/`.
- Өгөгдөл хадгалах server route бол `server/`; компонент дотор бичихгүй.

Page нь `@hamtry/library`-аас импортлоно. Сангийн дотоод файл нь өөрийн доод
давхаргыг relative import-оор авна; public index рүү буцаж импортлоод circular
dependency үүсгэхгүй. Shared design system React editor-оос юу ч импортлохгүй.

Нэг жижиг санг олон package/workspace болгон хуваах шаардлага одоогоор байхгүй.
Тусдаа npm distribution нь хэрэглэгч, build/export contract тодорсны дараах ажил.
