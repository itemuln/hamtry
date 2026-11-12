import test from 'node:test'
import assert from 'node:assert/strict'
import { listingSchema } from '../src/validation.js'
import { searchQuery } from '../src/features/listings.js'
import { inspectImage } from '../src/features/media.js'

const listing = { kind:'rooms',title:'Тухтай өрөө',description:'Хамтын амьдралын өрөө',district:'Хан-Уул',price:800000,available:'2026-11-15',location:[106.9,47.9] }
test('listing input excludes client ownership, status and invalid dates', () => {
  assert.equal(listingSchema.safeParse(listing).success,true)
  for (const changes of [{ownerId:'another-user'},{status:'published'},{available:'2026-02-30'},{price:0},{location:[190,47]}]) assert.equal(listingSchema.safeParse({...listing,...changes}).success,false)
})
test('search binds user text, bounds, conditions and cursor instead of interpolating SQL', () => {
  const query=searchQuery({q:"%' OR 1=1 --",conditions:'wifi,non_smoking',bbox:'106,47,108,49',cursor:btoa(JSON.stringify([100,'room-2']))})
  assert.equal(query.where.includes("OR 1=1 --"),false)
  assert.equal(query.params.includes("%\\%' OR 1=1 --%"),true)
  assert.equal(query.params.includes('wifi'),true)
  for (const input of [{limit:'10000'},{conditions:'not-real'},{cursor:btoa('{}')},{bbox:'108,49,106,47'}]) assert.throws(()=>searchQuery(input))
})
test('image inspection rejects HTML/SVG disguised as a photo', () => {
  assert.throws(()=>inspectImage(new TextEncoder().encode('<svg onload="alert(1)"></svg>')))
  const image=new Uint8Array(30),view=new DataView(image.buffer)
  image.set(new TextEncoder().encode('RIFF'));view.setUint32(4,22,true);image.set(new TextEncoder().encode('WEBPVP8X'),8);image[24]=63;image[27]=47
  assert.deepEqual(inspectImage(image),{mime:'image/webp',width:64,height:48})
  view.setUint32(4,999,true);assert.throws(()=>inspectImage(image))
})
