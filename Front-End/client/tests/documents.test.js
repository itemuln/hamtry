import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { docxFileError, readDocx, MAX_DOCX_SIZE } from '../src/app/state/document-store.js'
import { readRoute } from '../src/app/state/model.js'

const file = (name, buffer = new ArrayBuffer(8)) => ({ name, size: buffer.byteLength, arrayBuffer: async () => buffer })
test('contract imports accept only nonempty DOCX within the file-size limit', () => {
  assert.ok(docxFileError(file('contract.pdf')))
  assert.ok(docxFileError(file('contract.doc')))
  assert.ok(docxFileError(file('contract.docm')))
  assert.ok(docxFileError(file('contract.docx', new ArrayBuffer(0))))
  assert.ok(docxFileError({ name: 'large.docx', size: MAX_DOCX_SIZE + 1 }))
  assert.equal(docxFileError(file('Гэрээ.DOCX')), '')
})
test('DOCX import checks OOXML entries and rejects renamed ZIP files and macros', async () => {
  await assert.rejects(readDocx(file('broken.docx')))
  const zip = new JSZip(); zip.file('readme.txt', 'not a document')
  await assert.rejects(readDocx(file('renamed.docx', await zip.generateAsync({ type: 'arraybuffer' }))))
  zip.file('[Content_Types].xml', '<Types/>'); zip.file('word/document.xml', '<document/>')
  const buffer = await zip.generateAsync({ type: 'arraybuffer' })
  assert.equal((await readDocx(file('valid.docx', buffer))).byteLength, buffer.byteLength)
  zip.file('word/vbaProject.bin', 'macro')
  await assert.rejects(readDocx(file('macro.docx', await zip.generateAsync({ type: 'arraybuffer' }))))
})
test('provider links restore the document and chat sections without changing the public routes', () => {
  assert.deepEqual(readRoute('#dashboard'), { page: 'dashboard' })
  assert.deepEqual(readRoute('#dashboard/documents'), { page: 'dashboard', section: 'documents' })
  assert.deepEqual(readRoute('#dashboard/chat'), { page: 'dashboard', section: 'chat' })
  assert.deepEqual(readRoute('#rooms'), { page: 'rooms' })
  assert.deepEqual(readRoute('#dashboard/unknown'), { page: 'rooms' })
})