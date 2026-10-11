# Design system сангийн компонентод хэрхэн хүрдэг вэ?

Компонентын сан өнгө, spacing, radius-аа тусдаа хуулж хадгалахгүй.
**Design system нь дүрслэлийн үндсэн утгуудыг өгнө; компонент тэдгээрийг
`var(--...)`-аар хэрэглэнэ.**

## Үндсэн файлууд

| Файл (`Front-End/client`-ээс) | Үүрэг |
| --- | --- |
| `src/library/design-system/tokens.json` | Token нэр, анхны утга, responsive mode-ийн эх өгөгдөл |
| `src/library/design-system/theme.js` | Token model, CSS үүсгэх, saved override шалгах |
| `src/library/design-system/tokens.css` | Typography class-ууд; token-ийн хоёр дахь эх үүсвэр биш |
| `src/library/design-system/components.css` | Бэлэн component style; токенуудыг хэрэглэнэ |
| `src/library/components/styles.js` | Shared stylesheet-ийг ShadowRoot-д холбоно |
| `theme/hamtry-theme.json` | Editor дээр Save хийсэн override-ууд |
| `public/hamtry-theme.js` | Хадгалсан CSS-ийг page дээр ачаалж, шинэчилнэ |

Figma дахь өөрчлөлт кодод автоматаар sync хийгдэхгүй. Browser editor дээр
Save хийх нь local project-ийн theme файлд бичнэ; Figma-г өөрчлөхгүй.

## Токенын нэрийг CSS-д хэрэглэх

`brand/primary` нь `--brand-primary`, `spacing/4` нь `--spacing-4` болно.

```css
button {
  background: var(--brand-primary);
  color: var(--text-inverse);
  border-radius: var(--radius-md);
  padding-inline: var(--spacing-4);
  min-height: var(--size-control-md);
}
```

Page болон shadow stylesheet адил нэр хэрэглэнэ. Root дээрх CSS variable нь
host-оор дамжаад Shadow DOM руу удамшдаг. Харин ердийн CSS selector нь shadow
хилээр шууд нэвтрэхгүй тул компонент `applyComponentStyles(this.root)`-оор
shared stylesheet-ээ холбоно.

## Хэмжээ ба responsive утга

Editor dimension-ийг засварлахад хялбар `rem` утгаар хадгална. Runtime-д
`themeCss()` нь түүнийг `calc(var(--u) * ...)` болгож дүрслэнэ.
`--u` нь `clamp(1rem, 0.94rem + 0.2vw, 1.125rem)` тул дэлгэцийн өргөн болон
уншигчийн root text size-тэй уялдана. Container нь available width-ээр
хязгаарлагдана. Tablet ≤ `64em`, mobile ≤ `40em` mode-уудтай.

Нэг хэмжээг `tokens.css` дээр дахин тодорхойлохгүй. Тэгвэл live theme болон
статик CSS хооронд аль нь үйлчлэх зөрчил үүснэ. Page layout нь шаардлагатай
`grid`, `flex`, хувь, aspect-ratio-гаа өөрөө хэрэглэж болно.

## Default, draft, saved theme

1. `applyDefaultTheme()` эх утгуудыг page-ийн head-ийн эхэнд байрлуулна.
2. `/hamtry-theme.js` хадгалсан `/hamtry-theme.css`-ийг ачаална.
3. Editor дээр засварлахад draft зөвхөн editor page дээр харагдана.
4. **Save changes** нь `PUT /api/theme` дуудна.
5. Server override-уудыг шалгаж файлд дараалалтай, atomic rename-аар хадгална.
6. Бусад page хоёр секундийн polling-оор шинэ CSS-ээ авна.

Reset нь мөн draft үүсгэнэ; бусдад үйлчлэхийн тулд Save хийнэ.
Сүлжээний алдаа гарвал loader өмнөх амжилттай CSS-ээ хадгалж,
`hamtry-theme-error` event гаргана. Амжилттай өөрчлөлтөд
`hamtry-theme-change` event гарна.

## Editor ашиглах ба шалгах

`/editor.html` → **Edit variables** → утгаа өөрчлөх → **Save changes**.
Өөр native demo tab нээгээд өөрчлөлт зөвхөн Save-ийн дараа ирж байгааг шалга.
Өөрийн theme-ээ өөрчлөхгүй тестлэх бол `HAMTRY_THEME_FILE`-ийг түр файл руу
зааж server ажиллуулна. Энэ нь local authoring server; public deployment-д
authenticated editing болон persistent writable storage тусдаа хэрэгтэй.

Шинэ токен нэмэхдээ source token model, утга шалгалт, CSS хэрэглэгчид,
editor display, тестээ хамтад нь шалгана. App-specific утгыг бүх хуудаст
хэрэгтэй shared token болгох шаардлагагүй бол page style дотор үлдээнэ.
