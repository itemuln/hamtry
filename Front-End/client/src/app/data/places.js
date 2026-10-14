// Хотын зохиомж нь жишээ; бодит хаяг, зам эсвэл кафе санал болгож байгаа биш.
export const places = [
  { id: 'cafe', name: 'Булан кафе', kind: 'УУЛЗАХ · ТАНИЛЦАХ', description: 'Нэг аяга кофе. Нэг шинэ танил. Хамтын амьдрал эндээс эхэлнэ.', detail: 'Ширээн дээрх цэсээр хамтрагчидтай танилцаарай. Номын тавиураас хадгалсан сонголтоо үзнэ.', x: -7, color: '#ff4d6d', actions: [['menu', 'Цэс · Хамтрагчид'], ['shelf', 'Тавиур · Хадгалсан']] },
  { id: 'home', name: 'Таны орон зай', kind: 'ҮЗЭХ · ТӨСӨӨЛӨХ', description: 'Тав тух гэдэг жижиг зүйлсээс эхэлдэг. Өөрийн булангаа ол.', detail: 'Буйдан дээр дарж өрөөнүүдээ үзээрэй. Ширээ нь өөрийн өрөөг санал болгох замыг нээнэ.', x: 0, color: '#304cbd', actions: [['sofa', 'Буйдан · Өрөөнүүд'], ['desk', 'Ширээ · Өрөө санал болгох']] },
  { id: 'gallery', name: 'Дурсамж галерей', kind: 'НЭЭХ · ХАДГАЛАХ', description: 'Дараагийн гэрийнхээ өнгө, мэдрэмжийг эндээс төсөөл.', detail: 'Ханан дээрх зураг нь өрөөний сонголтууд. Номын тавиурт таны хадгалсан булангууд бий.', x: 7, color: '#ffb78c', actions: [['art', 'Зураг · Өрөөнүүд'], ['shelf', 'Тавиур · Хадгалсан']] },
]
export const placeById = id => places.find(place => place.id === id) || places[0]
export const readExploreRoute = hash => {
  const match = /^#(city|inside)\/(cafe|home|gallery)$/.exec(hash)
  return match ? { mode: match[1], place: match[2] } : { mode: 'city', place: 'cafe' }
}
