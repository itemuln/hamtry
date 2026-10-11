# Hamtry public library

Хуудас болон шинэ компонентын хэрэглэх public API `index.js` дотор байна.
Vite болон jsconfig хоёул `@hamtry/library` нэрийг энэ файл руу заана.
Одоогоор энэ нь төслийн доторх source library; npm дээр нийтлээгүй.

```js
import { registerComponents, applyDefaultTheme } from '@hamtry/library'

applyDefaultTheme()
registerComponents()
```

Бэлэн компонентууд shared design system-ийн CSS variable-уудыг open Shadow DOM
дотроо хэрэглэнэ. Fonts болон хадгалсан theme loader-ийг page entry ачаална.

- [Хүний заавар ба жишээнүүд](../../../../docs/human/README.md)
- [Компонент ашиглах](../../../../docs/human/components.md)
- [Design system холбоос](../../../../docs/human/design-system.md)
- [Agent entry point](../../../../docs/agents/README.md)
