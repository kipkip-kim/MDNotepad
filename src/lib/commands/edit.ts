import type { Editor } from '@tiptap/core'

export function handleUndo(editor: Editor | undefined) {
  editor?.commands.undo()
}

export function handleRedo(editor: Editor | undefined) {
  editor?.commands.redo()
}

export function handleSelectAll(editor: Editor | undefined) {
  editor?.commands.selectAll()
}
