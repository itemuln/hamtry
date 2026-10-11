# Дараагийн ажил: ажиллах prototype-оос бодит үйлчилгээ рүү

Бидний зорилго бол Монгол хэрэглэгч өрөө, хамтрагчаа сонгоход туслах Hamtry.
UI/UX, манай JavaScript framework, native компонент, shared design system ба
Three.js нь үндсэн чиглэл хэвээр байна.

## Хийсэн зүйл

- 14 native library компонент, public import, class/state/Shadow DOM гарын авлага.
- `/` дээр responsive Монгол нүүр, тусдаа `/components.html`, бүрэн `/editor.html`.
- Байршил/төсөв/түлхүүр үг/амьтны filter → detail → save → reload зам.
- Native dialog, empty/reset feedback, mobile navigation, local role/dashboard.
- Байршлын цэг + өрөө бүрийн утасны зураг → preview → засах → хөтөчид хадгалах зар.
- Газрын зурагтай шүүсэн үр дүн, өрөө/зураг шилжих photo tour, IndexedDB зураг.
- Raw Three.js furnished apartment, орон зай сонгох, drag, pause, SVG fallback.
- Lazy module, offscreen/reduced-motion pause, resource disposal/reconnect.

[Газрын зураг ба photo tour](photo-tours.md), [нүүр ба scene-ийн заавар](homepage.md) бодит файл, API, хязгаарлалтыг тайлбарлана.
Жишээ зар, role, хадгалалт нь хичээлийн local prototype; бодит backend биш.

## 1. Хэрэглэгчээр UX-ээ шалгах

3–5 суралцагчид mobile дээр “төсөвтөө таарах өрөө ол”, “дараа үзэхээр хадгал”,
“өрөөгөө бэлдээд preview хар” гэсэн даалгавар өг. Аль label, алхам дээр
төөрснийг тэмдэглээд мэдээллийн дараалал, filter, detail copy-г сайжруул.
Safari/Firefox болон бодит удаан утсан дээр scene-ийн ажиллагааг хэмж.

## 2. Backend contract-аа бодитоор тогтоох

Spring backend-ийн одоогийн session, role, listing, save endpoint-ийг эхлээд
шалгана. Нэвтрэх, authorization, profile-ийн нийтэд харагдах мэдээлэл,
provider-ийн эрх ба алдааны contract-ийг тодорхойлсны дараа холбоно.
Local demo role-ийг серверийн эрх гэж тооцохгүй. Loading/error/retry нь зөвхөн
бодит asynchronous request гарсан үед нэмэгдэнэ.

## 3. Жинхэнэ зарын замыг гүйцээх

Хөтөчийн зураг нэмэх урсгалыг бодит серверийн upload/save-тэй холбоно. Нүүх хугацаа, хэмжээ, хэрэглээний зардал, тавилга,
амьдралын нөхцөлийн талбар; preview, засах/устгах, server save.
Хамтрагчийн profile, холбоо барих хүсэлт, зөвшөөрөл ба хувийн мэдээллийн
харагдах хүрээг нэг бүтэн UX замаар хийнэ.

## 4. Дүрслэлээ сайжруулах

Энгийн зургуудын linked tour эхний хувилбар болсон. Жинхэнэ 3D-д олон өнцгөөс
давхцалтай зураг авах заавар, reconstruction үйлчилгээ, чанар шалгах шат хэрэгтэй.
Three.js нь бэлэн model дүрслэх үүрэгтэй. Одоогийн furnished model нь illustrative. Бодит зарын floorplan/3D asset байгаа
тохиолдолд model loading, ownership, texture disposal, progress/failure UX-ийг
тодорхойлж нэмнэ. Эхлээд scene-ийн lazy bundle/GPU budget-ийг бодит төхөөрөмж
дээр хэмжээд shadow/resolution/geometry-гаа тохируул. UI үйлдлийг чимэглэлээс
үргэлж хүртээмжтэй HTML controls-оор хүргэнэ.

## 5. Санг түгээх шаардлагатай бол

Хоёр дахь app үнэхээр санг ашиглах үед npm package-ийн exports, CSS/fonts,
versioning ба build contract-ийг гаргана. Одоогийн `@hamtry/library` нь checkout
доторх alias. Зөвхөн folder харагдуулахын тулд олон package шинээр үүсгэхгүй.
