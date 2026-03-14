<script lang="ts">
  import { onMount } from 'svelte'

  let {
    content = '',
    oncontentchange,
    oncursorchange,
    oncharcount,
  }: {
    content?: string
    oncontentchange?: (content: string) => void
    oncursorchange?: (line: number, col: number) => void
    oncharcount?: (count: number) => void
  } = $props()

  let textarea: HTMLTextAreaElement | undefined = $state()

  onMount(() => {
    if (textarea && content) {
      textarea.value = content
      emitCharCount()
      emitCursorChange()
    }
  })

  function handleInput() {
    if (!textarea) return
    oncontentchange?.(textarea.value)
    emitCharCount()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (!textarea) return
      textarea.focus()
      document.execCommand('insertText', false, '\t')
      // oncontentchange is fired by the resulting input event
    }
  }

  function handleSelect() {
    emitCursorChange()
  }

  function handleClick() {
    emitCursorChange()
  }

  function emitCursorChange() {
    if (!textarea) return
    const pos = textarea.selectionStart
    const text = textarea.value.substring(0, pos)
    const lines = text.split('\n')
    const line = lines.length
    const col = lines[lines.length - 1].length + 1
    oncursorchange?.(line, col)
  }

  function emitCharCount() {
    if (!textarea) return
    oncharcount?.(textarea.value.length)
  }

  /** Set the textarea content programmatically */
  export function setContent(text: string) {
    if (textarea) {
      textarea.value = text
      emitCharCount()
      emitCursorChange()
    }
  }

  /** Focus the textarea */
  export function focus() {
    textarea?.focus()
  }

  /** Insert text at cursor position */
  export function insertText(text: string) {
    if (!textarea) return
    textarea.focus()
    document.execCommand('insertText', false, text)
    // oncontentchange is fired by the resulting input event
  }

  /** Move cursor to a specific line */
  export function goToLine(lineNum: number) {
    if (!textarea) return
    textarea.focus()
    const lines = textarea.value.split('\n')
    const clampedLine = Math.max(1, Math.min(lineNum, lines.length))
    let pos = 0
    for (let i = 0; i < clampedLine - 1; i++) {
      pos += lines[i].length + 1 // +1 for \n
    }
    textarea.selectionStart = textarea.selectionEnd = pos
    emitCursorChange()

    // Scroll the line into view
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22.4
    const scrollTarget = (clampedLine - 1) * lineHeight - textarea.clientHeight / 2
    textarea.scrollTop = Math.max(0, scrollTarget)
  }

  /** Get total line count */
  export function getLineCount(): number {
    if (!textarea) return 0
    return textarea.value.split('\n').length
  }

  /** Get current content */
  export function getContent(): string {
    return textarea?.value ?? ''
  }

  /** Get the underlying textarea element */
  export function getTextarea(): HTMLTextAreaElement | undefined {
    return textarea
  }
</script>

<textarea
  bind:this={textarea}
  class="source-editor"
  spellcheck="false"
  autocomplete="off"
  autocapitalize="off"
  oninput={handleInput}
  onkeydown={handleKeydown}
  onkeyup={handleSelect}
  onclick={handleClick}
  onselect={handleSelect}
></textarea>

<style>
  .source-editor {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 16px 20px;
    margin: 0;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-editor, 'Cascadia Code', 'Consolas', 'Courier New', monospace);
    font-size: var(--font-size-editor, 14px);
    line-height: 1.6;
    tab-size: 4;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: auto;
  }
</style>
