# Газрын зураг ба өрөөний зурагтай аялал

Эхний хувилбарын зорилго: утсаар авсан энгийн зургуудыг өрөө бүрээр холбоод,
байрны байршлаас сонгож үздэг болгох. Энэ нь 360° panorama эсвэл бодит хэмжээс
бүхий 3D загвар биш. Нүүрний Three.js байшин нь зөвхөн жишээ зохиомж.

## Ашиглах дараалал

1. «Газрын зураг» цэсийг нээнэ. Үнэ бүхий цэг дээр дарахад дэлгэрэнгүй гарна.
2. Дүүрэг, төсөв, түлхүүр үгийн шүүлтүүр нь карт болон цэгүүдэд зэрэг үйлчилнэ.
3. «Өрөө нэмэх» → гарчиг, дүүрэг, сарын түрээсээ бөглөнө.
4. Газрын зураг дээр байрны цэгээ сонгох, чирэх эсвэл координат оруулах.
   Уртраг, өргөрөг хоёул хэрэгтэй; эхний цэгийг автоматаар батлахгүй.
5. Өрөөний нэр ба зураг нэмнэ. Өрөө бүрт дор хаяж нэг зураг хэрэгтэй.
   6 өрөө, нийт 12 зураг; JPG/PNG/WebP, файл бүр 10 MB хүртэл.
6. Тайлбар → урьдчилан харах → өрөө, зураг хооронд шилжиж шалгах → засах эсвэл хадгалах.
7. Хадгалсны дараа газрын зурагт шинэ цэг харагдана. Reload хийсэн ч зураг үлдэнэ.
   Зарын цэг/картыг нээгээд өрөөний товч, ←/→ эсвэл keyboard сум ашиглана.

Жишээ 4 байрны цэг нь бодит хаяг биш. Шинээр нэмсэн зар, зураг нь **энэ хөтөч,
энэ origin** дээр л хадгалагдана; бусдад нийтлэгдэхгүй. Browser data арилгах,
өөр порт/хөтөч ашиглахад хуучин зураг байхгүй болно. Газрын зураг интернеттэй
үед ажиллана; ачаалахгүй бол жагсаалт болон координат input-ууд үлдэнэ.

## Class-уудын үүрэг

| Class / файл (`Front-End/client/src/app/`) | Үүрэг |
| --- | --- |
| `HamtryApartmentMap` / `components/apartment-map.js` | Shadow DOM, signal, lazy map module, event, resize/cleanup |
| `components/map-renderer.js` | MapLibre renderer, keyboard-д хүрэх native pin buttons, map click/drag |
| `HamtryRoomEditor` / `components/room-editor.js` | Өрөө нэмэх/хасах, нэрлэх, зураг сонгох, preview/validation |
| `HamtryPhotoTour` / `components/photo-tour.js` | Өрөө ба зураг сонгох, Blob унших, алдааны тайлбар |
| `state/media-store.js` | Зургийг JPEG болгох, IndexedDB transaction |
| `pages/home.js` | Компонентуудыг холбох, preview/confirm, route, metadata |

Эдгээр нь бүтээгдэхүүний composition тул `src/app/components` дотор байна.
Ерөнхий input/button/dialog нь `@hamtry/library`-аас ирнэ. Бүгд native JavaScript,
манай signal engine; React editor тусдаа хэвээр. Өнгө, хэмжээ, focus төлөв нь
shared design system-ийн CSS variable-уудыг ашиглана. MapLibre-ийн base CSS нь
зөвхөн map-ийн Shadow DOM-д орно.

```js
const map = document.querySelector('hamtry-apartment-map')
map.listings = [{ id: 'example', title: 'Өрөө', price: 800000, location: [106.917, 47.918] }]
map.addEventListener('hamtry-map-select', event => {
  console.log(event.detail.id)
})
```

Map `location` үргэлж `[уртраг, өргөрөг]`. `pick-location` attribute нь owner-ийн
сонгох горим. `hamtry-location-pick` event-ийн `detail.location`-оос form бөглөнө.

## Хадгалалт ба lifecycle

Thumbnail (360 хүртэл), текст, өрөө/зургийн ID, координат нь localStorage-д.
1600 хүртэл хэмжээтэй JPEG Blob нь IndexedDB-ийн `hamtry-media-v1/photos` store-д.
Original файлыг өөрчлөхгүй; сервер рүү upload хийхгүй. Preview нь жижиг thumbnail.
Confirm эхлээд Blob-уудыг нэг transaction-аар бичиж, дараа нь metadata хадгална.
Metadata бичиж чадахгүй бол зарын state-ийг буцааж, саяын Blob-уудыг устгана.

Map салгахад observers, timer, markers, workers/WebGL renderer-ийг `map.remove()`
цэвэрлэнэ. Зураг солих болон tour салгахад Blob object URL-ийг revoke хийнэ;
хоцорсон async уншилт нь салсан component-д зураг тавихгүй.

## Дараагийн шат

Эхлээд Spring backend-ийн бодит listing/upload API, authentication, owner edit/delete,
зураг хадгалалт, хаяг нийтлэх зөвшөөрлийг нэг урсгал болгоно. Дараа нь хүсвэл guided
capture → reconstruction → шалгасан 3D model → Three.js viewer нэмнэ.
[COLMAP capture guidance](https://colmap.github.io/tutorial.html) нь олон өнцгийн
давхцалтай зураг шаардана. [Three GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
нь бэлэн model ачаалдаг. Three.js дангаараа дурын зургуудыг байрны загвар болгохгүй.
[MapLibre](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/),
[OpenFreeMap](https://openfreemap.org/quick_start/) нь map-ийн лавлагаа.
