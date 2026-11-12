import { createElement as h, createRef, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { DocxEditor } from '@docx-editor.dev/react'
import '@docx-editor.dev/core/styles/editor.css'

class EditorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { this.props.onError(error) }
  render() { return this.state.failed ? h('p', { role: 'alert' }, 'Гэрээг нээж чадсангүй. Өөр DOCX файл сонгоод дахин оролдоно уу.') : this.props.children }
}
export function mountContractEditor(container, bytes, options) {
  const root = createRoot(container), ref = createRef()
  root.render(h(EditorBoundary, { onError: options.onError }, h(DocxEditor, {
    ref, document: new Uint8Array(bytes), mode: 'edit', title: options.name,
    onChange: options.onChange, onReady: options.onReady, onSave: options.onSave,
    onOpen: options.onOpen, colorMode: 'light', rulers: false,
  })))
  return {
    async save() { const buffer = await ref.current?.save(); if (!buffer) throw new Error('Editor бэлэн болоогүй байна. Түр хүлээгээд дахин оролдоно уу.'); return buffer },
    dispose() { root.unmount() },
  }
}