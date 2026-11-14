import { onCleanup } from '@hamtry/library'
import { readDocx, listDocuments, putDocument, getDocument, deleteDocument } from '../state/document-store.js'
import './contract-documents.css'

const fileIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 13h8M8 17h5"/></svg>'
export function documentsMarkup() {
  return `<section class="contract-documents" data-provider-section="documents" aria-labelledby="documents-title" hidden>
    <header class="contract-heading"><div><p class="contract-eyebrow">ТҮРЭЭСЛҮҮЛЭГЧИЙН ОРОН ЗАЙ</p><h1 id="documents-title" tabindex="-1">Баримт бичиг, гэрээ</h1><p>Гэрээгээ байршуулж, засаад PDF хэлбэрээр татаарай.</p></div><hamtry-button size="sm" data-contract-upload>＋ DOCX байршуулах</hamtry-button></header>
    <input class="contract-file-input" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="DOCX гэрээ сонгох" hidden>
    <p class="contract-error" role="alert" hidden></p>
    <div class="contract-library"><div class="contract-dropzone" tabindex="0" role="button" aria-label="DOCX гэрээ байршуулах">${fileIcon}<h2>Гэрээний файлаа энд оруулаарай</h2><p>Чирж оруулах эсвэл дарж сонгох</p><small>Зөвхөн .docx · 20 MB хүртэл</small></div><div class="contract-saved"><h2>Миний баримт бичгүүд <span data-document-count>0</span></h2><div class="contract-file-list"></div><p class="contract-no-files">Байршуулсан баримт бичиг алга.</p></div></div>
    <section class="contract-editor-panel" aria-label="Гэрээ засварлах" hidden><header class="contract-editor-actions"><div>${fileIcon}<div><strong data-document-name></strong><span class="contract-save-state" role="status" aria-live="polite"></span></div></div><div><hamtry-button size="sm" variant="outline" data-contract-save disabled>Хадгалах</hamtry-button><hamtry-button size="sm" data-contract-pdf disabled>PDF татах ↗</hamtry-button></div></header><div class="contract-editor-mount"></div></section>
    <p class="contract-storage-note">Баримт бичиг энэ хөтөч дээр хадгалагдана. PDF үүсгэх үед гэрээний агуулгыг серверт түр боловсруулна.</p>
  </section>`
}
export function setupDocuments(root, listen) {
  const page = root.querySelector('.contract-documents'), input = page.querySelector('input[type="file"]')
  const error = page.querySelector('.contract-error'), status = page.querySelector('.contract-save-state')
  const saveButton = page.querySelector('[data-contract-save]'), pdfButton = page.querySelector('[data-contract-pdf]')
  const mount = page.querySelector('.contract-editor-mount'), dropzone = page.querySelector('.contract-dropzone')
  let active = true, editor, current, dirty = false, revision = 0, ready = false, timer, saving, exporting = false, importing = false
  let request = 0, deleting = false
  const report = message => { if (!active) return; error.textContent = message; error.hidden = !message }
  const controls = () => {
    saveButton.disabled = !ready || exporting || deleting || Boolean(saving)
    pdfButton.disabled = !ready || exporting || deleting || Boolean(saving)
    page.querySelector('[data-contract-upload]').disabled = importing || exporting || deleting
    page.querySelectorAll('[data-document-delete]').forEach(button => { button.disabled = importing || exporting || deleting })
  }
  const refreshList = async () => {
    const documents = await listDocuments()
    if (!active) return
    page.querySelector('[data-document-count]').textContent = documents.length
    page.querySelector('.contract-no-files').hidden = documents.length > 0
    const list = page.querySelector('.contract-file-list'); list.replaceChildren()
    for (const document of documents) {
      const button = window.document.createElement('button'); button.type = 'button'; button.className = 'contract-file'; button.dataset.documentId = document.id
      if (document.id === current?.id) button.setAttribute('aria-current', 'true')
      button.innerHTML = `${fileIcon}<span><strong></strong><small></small></span><span aria-hidden="true">↗</span>`
      button.querySelector('strong').textContent = document.name
      button.querySelector('small').textContent = `${(document.size / 1024).toFixed(0)} KB · ${new Date(document.updatedAt).toLocaleDateString('mn-MN')}`
      const row = window.document.createElement('div'); row.className = 'contract-file-row'
      const remove = window.document.createElement('button'); remove.type = 'button'; remove.className = 'contract-file-delete'
      remove.dataset.documentDelete = document.id; remove.textContent = 'Устгах'
      remove.setAttribute('aria-label', `${document.name} устгах`)
      remove.disabled = importing || exporting || deleting
      row.append(button, remove); list.append(row)
    }
  }
  const saveCurrent = async (force = false) => {
    if (saving) await saving
    if (deleting) return current?.buffer
    if (!editor || !current || !ready) throw new Error('Editor бэлэн болоогүй байна.')
    if (!dirty && !force) return current.buffer
    const document = current, version = revision
    saving = (async () => {
      status.textContent = 'Хадгалж байна…'
      const buffer = await editor.save()
      const record = { ...document, buffer, size: buffer.byteLength, updatedAt: Date.now() }
      await putDocument(record)
      if (active && current?.id === document.id) {
        current = record; dirty = revision !== version
        status.textContent = dirty ? 'Шинэ өөрчлөлт хадгалагдаж байна…' : 'Хадгалсан'
        await refreshList()
      }
      return buffer
    })()
    controls()
    try { return await saving }
    catch (failure) { if (active) status.textContent = 'Хадгалж чадсангүй'; throw failure }
    finally { saving = null; if (active) controls() }
  }
  const changed = () => {
    if (!active || !ready || deleting) return
    dirty = true; revision++; status.textContent = 'Өөрчлөлттэй'
    clearTimeout(timer)
    timer = setTimeout(() => { void saveCurrent().catch(failure => report(failure.message)) }, 1000)
  }
  const openDocument = async id => {
    if (importing || exporting || deleting) return
    if (current?.id === id) return
    if (dirty) await saveCurrent()
    if (deleting || !active) return
    const ticket = ++request
    const record = await getDocument(id)
    if (!record) throw new Error('Баримт бичиг олдсонгүй.')
    const { mountContractEditor } = await import('../components/contract-editor.js')
    if (!active || request !== ticket) return
    clearTimeout(timer); editor?.dispose(); mount.replaceChildren()
    current = record; ready = false; dirty = false; revision = 0
    page.querySelector('.contract-editor-panel').hidden = false
    page.querySelector('[data-document-name]').textContent = record.name
    status.textContent = 'Нээж байна…'; report(''); controls()
    editor = mountContractEditor(mount, record.buffer, {
      name: record.name, onChange: changed, onSave: () => { void saveCurrent(true).catch(failure => report(failure.message)) },
      onOpen: () => input.click(),
      onReady: () => { if (active && current?.id === record.id) { ready = true; status.textContent = 'Хадгалсан'; controls() } },
      onError: failure => { if (active) { ready = false; controls(); report(`Гэрээг нээж чадсангүй. ${failure.message || ''}`) } },
    })
    await refreshList()
  }
  const removeDocument = async id => {
    if (deleting || importing || exporting) return
    const record = await getDocument(id)
    if (!active || !record || deleting || importing || exporting) return
    if (!window.confirm(`“${record.name}” файлыг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return
    deleting = true; request++; clearTimeout(timer); report(''); controls()
    mount.inert = true
    try {
      // Хадгалалт дууссаны дараа устгаж, файлыг дахин үүсэхээс хамгаална.
      if (saving) await saving.catch(() => {})
      await deleteDocument(id)
      if (!active) return
      if (current?.id === id) {
        ready = false; dirty = false; current = null
        editor?.dispose(); editor = null; mount.replaceChildren()
        page.querySelector('.contract-editor-panel').hidden = true
        page.querySelector('[data-document-name]').textContent = ''
        status.textContent = ''
      }
      await refreshList()
      page.querySelector('[data-contract-upload]').focus()
    } catch (failure) { report(`Файлыг устгаж чадсангүй. ${failure.message}`) }
    finally {
      deleting = false; mount.inert = false
      if (active) {
        controls()
        if (dirty) timer = setTimeout(() => { void saveCurrent().catch(failure => report(failure.message)) }, 1000)
      }
    }
  }
  const upload = async file => {
    if (!file || importing || exporting || deleting) return
    importing = true; report(''); controls()
    try {
      const buffer = await readDocx(file)
      const record = { id: `document-${crypto.randomUUID()}`, name: file.name.slice(0,180), size: buffer.byteLength, buffer, updatedAt: Date.now() }
      await putDocument(record); await refreshList()
      importing = false
      if (active) await openDocument(record.id)
    } catch (failure) { report(failure.message) }
    finally { importing = false; input.value = ''; if (active) controls() }
  }
  listen(page.querySelector('[data-contract-upload]'), 'click', () => input.click())
  listen(dropzone, 'click', () => input.click())
  listen(dropzone, 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click() } })
  listen(input, 'change', () => { void upload(input.files[0]) })
  listen(dropzone, 'dragover', event => { event.preventDefault(); dropzone.dataset.dragging = 'true' })
  listen(dropzone, 'dragleave', () => { delete dropzone.dataset.dragging })
  listen(dropzone, 'drop', event => { event.preventDefault(); delete dropzone.dataset.dragging; void upload(event.dataTransfer.files[0]) })
  listen(page.querySelector('.contract-file-list'), 'click', event => {
    const remove = event.target.closest('[data-document-delete]')
    if (remove) { void removeDocument(remove.dataset.documentDelete).catch(failure => report(failure.message)); return }
    const button = event.target.closest('[data-document-id]')
    if (button) void openDocument(button.dataset.documentId).catch(failure => report(failure.message))
  })
  listen(saveButton, 'click', () => { report(''); void saveCurrent(true).catch(failure => report(failure.message)) })
  listen(pdfButton, 'click', async () => {
    if (!ready || exporting || deleting) return
    exporting = true; report(''); controls(); pdfButton.textContent = 'PDF үүсгэж байна…'
    try {
      const buffer = await saveCurrent(true)
      const { docxToPrintHtml, pdfFilename } = await import('../state/document-pdf.js')
      const html = await docxToPrintHtml(buffer)
      const response = await fetch('/api/documents/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, filename: pdfFilename(current.name) }) })
      if (!response.ok) { const failure = await response.json().catch(() => ({})); throw new Error(failure.error || 'PDF үүсгэж чадсангүй. Дахин оролдоно уу.') }
      const blob = await response.blob()
      if (blob.type.split(';')[0] !== 'application/pdf') throw new Error('Серверээс PDF файл буцаж ирсэнгүй.')
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = pdfFilename(current.name); link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (failure) { report(failure.message) }
    finally { exporting = false; if (active) { pdfButton.textContent = 'PDF татах ↗'; controls() } }
  })
  listen(window, 'beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = '' } })
  void refreshList().catch(failure => report(failure.message))
  onCleanup(() => { active = false; request++; clearTimeout(timer); editor?.dispose() })
}
