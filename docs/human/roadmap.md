# Дараагийн ажлын төлөвлөгөө: UX, UI, Three.js

Бидний зорилго бол Монгол хэрэглэгч хамтрагч эсвэл өрөө хайж, сонголтоо ойлгож,
итгэлтэй дараагийн алхам хийхэд туслах Hamtry web app. Дүрслэл, хөдөлгөөн нь
энэ үйлдлийг ойлгомжтой болгоно. Бүх шинэ app код JavaScript, манай framework,
native Web Components, shared design system дээр ажиллана.

Энэ файл нь төлөвлөгөө. Доорх шинэ page, search, scene, API нь хараахан
хэрэгжээгүй. Одоогийн `/` бол component demo; editor `/editor.html` дээр тусдаа.

## 0. Сууриа цэгцлэх — хийсэн

JavaScript migration, [хавтасны бүтэц](folder-structure.md), public library
import, Mongolian comments, human/agent guide-ууд бэлэн. 12 компонент,
state/effect/scope, Shadow DOM ба shared theme-ийн үндэс байна. Editor-ийн
Save workflow хадгалагдана. Framework-ийг цааш томруулахдаа бодит UX хэрэгцээ
гарсан үед л API нэмнэ.

## 1. Гол UX замуудаа тодорхойлох — дараагийн эхний ажил

| Хэрэглэгч | Гол зам | Хэрэглэгч юу ойлгох ёстой вэ? |
| --- | --- | --- |
| Хамтрагч хайгч | Нүүр → хамтрагч хайх → filter → profile → холбоо барих | Байршил, төсөв, амьдралын хэв маяг, нүүх хугацаа |
| Өрөө хайгч | Нүүр → өрөө хайх → filter → room detail → холбоо барих | Үнэ, нөхцөл, зураг, байршил, боломжтой хугацаа |
| Өрөө санал болгогч | Нүүр → өрөө нийтлэх → мэдээлэл/зураг → preview → нийтлэх | Ямар мэдээлэл хэрэгтэй, засах ба нийтлэх ялгаа |

Навигацийн эхний санал: **Хамтрагчид**, **Өрөөнүүд**, **Хадгалсан**, **Профайл**.
Өрөө санал болгогчид dashboard нэмэгдэнэ. Бодит role/session API байхгүй үед
role-ийн UI-г жишээ төлөвөөр үзүүлж, authorization хийсэн гэж тооцохгүй.

Энэ шатны гаралт: mobile/desktop wireframe, page map, CTA нэр ба чиглэл,
Mongolian copy, loading/empty/error/success төлөвийн жижиг жагсаалт. Зөвхөн
өнгө үзүүлэхээс өмнө хэрэглэгчийн үндсэн үйлдлийг энэ зураг дээр шалгана.

## 2. Нүүр хуудасны UI ба шаардлагатай компонентууд

Эхний бүтэн page: header/navigation → hero → хайлтын сонголт → жишээ зарууд
→ хэрхэн ажилладаг тайлбар → footer. Header, hero, search bar, listing grid
нь app composition; button/input/card нь одоогийн сангийн компонент.

Одоогийн design token-уудын өнгө, typography, spacing-ийг ашиглаж, хэрэгтэй
тохиолдолд л шинэ shared token нэмнэ. Layout нь mobile дээр CTA, хайлт,
зураг, үнэ гэсэн ойлгомжтой дараалалтай. Card дээр төсөв/түрээс, байршил,
боломжтой хугацаа тод харагдана. Жишээ мэдээллийг бодит зар эсвэл баталгаажсан
хэрэглэгч гэж сурталчлахгүй.

Хайлтын interaction шаардмагц filter chip, mobile filter dialog/drawer,
loading/empty result зэрэг дутагдсан UX хэсгийг нэмнэ. Тэдгээрийн state,
keyboard focus, event API-г эхлээд тодорхойлно. Зөвхөн үзэмжийн төлөө
том component inventory шинээр үүсгэхгүй.

Гаралт: static visual direction бүхий responsive homepage, ажиллах local
navigation/search prototype, keyboard ашиглаж болох controls. Component demo-г
тусдаа dev page болгон шилжүүлж, `/`-д homepage байрлуулах нь энэ шатны ажил.

## 3. Three.js hero ба жижиг хөдөлгөөн

Hero-ийн эхний санал: тайван хөвж, аажмаар эргэдэг glass geometric shape.
Энэ нь одоогоор санал; хэрэгжүүлэх үед brand direction-тай нь тохируулна.
Text, хайлт, CTA нь HTML дээр хэвээр байж, canvas нь чимэглэл байна.

- Raw `three`-г app-ийн native `hamtry-hero-scene` component дотор ашиглана.
- Rotation speed, pause, pointer response нь манай `signal`-аар удирдагдана.
- Scene-ийн palette нь design system-ээс уншигдана; theme өөрчлөгдвөл шинэчилнэ.
- Шаардлагатай үед Three module-ийг ачаалж, hidden/offscreen үед animation-ийг
  түр зогсооно. Resize үед canvas зөв хэмжээнд байна; render resolution-ийг хязгаарлана.
- Reduced motion эсвэл WebGL unavailable үед static visual үзүүлнэ; хайлт,
  CTA хэвийн ажиллана. Reduced motion нь хэрэглэгчийн nonessential хөдөлгөөн
  багасгах хүсэлт юм. [MDN тайлбар](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
- Remove/reconnect үед loop, observer, renderer болон scene-owned GPU resource-ийг
  цэвэрлэнэ. Geometry/material/texture өөрөө автоматаар чөлөөлөгдөхгүй.
  [Three.js disposal guide](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).

UI motion: товчны feedback, card save, filter өөрчлөлт, dialog нээгдэх/хаагдах
зэрэг үйлдлийн үр дүнг харуулна. Эхний хувилбарт нэг hero scene хангалттай.

Гаралт: интерактив hero, static fallback, reduced-motion хувилбар, lifecycle
cleanup ба mobile performance-ийн browser шалгалт.

## 4. Нүүрээс цааш нэг бүтэн хэрэглэгчийн зам

Эхлээд **хайх → filter → detail → хадгалах** замыг бүрэн prototype болгоно.
Дараа нь профайл/холбоо барих, provider-ийн нийтлэх flow ба dashboard нэмнэ.
Local state, sample data-г demo гэж тодорхой байлгана. Backend contract,
session/role authority тохирсны дараа real persistence холбоно. Profile,
contact flow-д ямар мэдээлэл нийтэд харагдахыг UX specification-д тодорхойлно.

## 5. Хичээлийн үзүүлэн ба чанар

- Mobile/desktop layout, Mongolian текст, image crop, font болон token consistency.
- Keyboard/tab focus, form label/error, dialog focus return, reduced motion.
- Scene offscreen pause, remove/reconnect, image loading, document overflow.
- Search-ийн empty/loading/error, filter reset, save feedback, back navigation.
- Runtime/theme tests, lint, build; actual browser-ууд дээр шалгасан хүрээг тэмдэглэнэ.
- Human guide-д class/state/scene lifecycle-ийн жишээ; agent guide-д API/file map.

Дараагийн concrete deliverable: **homepage-ийн UX map + static UI prototype**.
Үүний дараа Three.js scene нэмнэ. Нэг дор бүх page, бүх animation хийхгүй;
нэг бүрэн, ойлгомжтой flow-г үзүүлээд дараагийн flow-д шилжинэ.
