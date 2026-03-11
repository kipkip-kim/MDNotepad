<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import { createExtensions } from '../editor/extensions'

  let {
    content = '',
    isMarkdown = true,
    onContentChange,
    onCursorChange,
    onCharacterCount,
  }: {
    content?: string
    isMarkdown?: boolean
    onContentChange?: (content: string) => void
    onCursorChange?: (pos: { line: number; col: number }) => void
    onCharacterCount?: (count: number) => void
  } = $props()

  let editorState = $state<{ editor: Editor | null }>({ editor: null })
  let element: HTMLElement | undefined = $state()

  export function getEditor(): Editor | null {
    return editorState.editor
  }

  function getCursorPosition(editor: Editor): { line: number; col: number } {
    const { from } = editor.state.selection
    const text = editor.state.doc.textBetween(0, from, '\n')
    const lines = text.split('\n')
    return {
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    }
  }

  function getMarkdownContent(editor: Editor): string {
    return editor.storage.markdown.getMarkdown()
  }

  onMount(() => {
    if (!element) return

    const editor = new Editor({
      element: element,
      extensions: createExtensions(),
      content: isMarkdown ? content : content,
      onTransaction: () => {
        // Trigger Svelte 5 reactivity
        editorState = { editor: editorState.editor }
      },
      onUpdate: ({ editor }) => {
        const md = getMarkdownContent(editor)
        onContentChange?.(md)
        const count = editor.storage.characterCount.characters()
        onCharacterCount?.(count)
      },
      onSelectionUpdate: ({ editor }) => {
        onCursorChange?.(getCursorPosition(editor))
      },
    })

    // If content is markdown, set it as markdown
    if (isMarkdown && content) {
      editor.commands.setContent(content)
    } else if (!isMarkdown && content) {
      // Plain text: set each line as a paragraph
      const html = content
        .split('\n')
        .map((line) => `<p>${line || '<br>'}</p>`)
        .join('')
      editor.commands.setContent(html)
    }

    editorState.editor = editor

    // Initial character count
    onCharacterCount?.(editor.storage.characterCount.characters())
    onCursorChange?.(getCursorPosition(editor))
  })

  onDestroy(() => {
    editorState.editor?.destroy()
  })
</script>

<div class="editor-wrapper" bind:this={element}></div>

<style>
  .editor-wrapper {
    flex: 1;
    overflow-y: auto;
    height: 100%;
  }

  .editor-wrapper :global(.ProseMirror) {
    min-height: 100%;
  }
</style>
