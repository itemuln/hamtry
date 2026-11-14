export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const MAX_DOCX_SIZE = 20 * 1024 * 1024
export function docxFileError(file) {
  if (!file || !/\.docx$/i.test(file.name)) return 'Зөвхөн .docx файл байршуулна уу.'
  if (!file.size) return 'Хоосон файл байна.'
  if (file.size > MAX_DOCX_SIZE) return 'Файлын хэмжээ 20 MB-аас хэтэрсэн байна.'
  return ''
}
export async function readDocx(file) {
  const error = docxFileError(file)
  if (error) throw new Error(error)
  const bytes = await file.arrayBuffer()
  const { default: JSZip } = await import('jszip')
  let archive
  try { archive = await JSZip.loadAsync(bytes) } catch { throw new Error('Файл зөв DOCX бүтэцтэй биш эсвэл гэмтсэн байна.') }
  if (!archive.file('[Content_Types].xml') || !archive.file('word/document.xml') || archive.file('word/vbaProject.bin')) throw new Error('Зөв Word .docx файл сонгоно уу. Macro болон бусад формат дэмжихгүй.')
  return bytes
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hamtry-documents-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Баримт бичгийн хадгалалтыг нээж чадсангүй.'))
    request.onblocked = () => reject(new Error('Бусад нээлттэй Hamtry цонхыг хаагаад дахин оролдоно уу.'))
  })
}
async function transaction(mode, action) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction('documents', mode)
      const request = action(tx.objectStore('documents'))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error || new Error('Баримт бичгийг хадгалж чадсангүй.'))
      tx.onabort = () => reject(tx.error || new Error('Хадгалалт тасалдсан. Хөтөчийн сул зайг шалгана уу.'))
    })
  } finally { database.close() }
}
export const listDocuments = async () => (await transaction('readonly', store => store.getAll())).map(record => ({ id: record.id, name: record.name, size: record.size, updatedAt: record.updatedAt })).sort((a,b) => b.updatedAt - a.updatedAt)
export const getDocument = id => transaction('readonly', store => store.get(id))
export const putDocument = record => transaction('readwrite', store => store.put(record))
export const deleteDocument = id => transaction('readwrite', store => store.delete(id))
