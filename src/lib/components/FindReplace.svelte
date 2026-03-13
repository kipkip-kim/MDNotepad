<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import type { SourceEditorExports } from '../types/tab'
  import { tabStore } from '../stores/tabs.svelte'

  let {
    mode = 'find',
    getActiveEditor,
    getSourceEditor,
    onclose,
  }: {
    mode: 'find' | 'replace'
    getActiveEditor: () => Editor | undefined
    getSourceEditor: (tabId: string) => SourceEditorExports | undefined
    onclose: () => void
  } = $props()

  let searchInput: HTMLInputElement | undefined = $state()
  let searchTerm = $state('')
  let replaceTerm = $state('')
  let caseSensitive = $state(false)

  // Source mode search state
  let sourceMatches: { start: number; end: number }[] = $state([])
  let sourceCurrentIndex = $state(-1)

  // Reactive counter bumped after each WYSIWYG search to force $derived re-evaluation
  let wysiwygSearchVersion = $state(0)

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  // Focus search input when opened
  $effect(() => {
    if (searchInput) {
      setTimeout(() => {
        searchInput?.focus()
        searchInput?.select()
      }, 0)
    }
  })

  // Debounced search effect — tracks searchTerm, caseSensitive, activeTabId, and viewMode
  $effect(() => {
    const _term = searchTerm
    const _case = caseSensitive
    const _tabId = tabStore.activeTabId
    const _viewMode = tabStore.activeTab?.viewMode

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      performSearch()
    }, 150)

    return () => clearTimeout(debounceTimer)
  })

  function isSourceMode(): boolean {
    return tabStore.activeTab?.viewMode === 'source'
  }

  function getSourceTextarea(): HTMLTextAreaElement | undefined {
    const tab = tabStore.activeTab
    if (!tab) return undefined
    return getSourceEditor(tab.id)?.getTextarea()
  }

  function performSearch() {
    if (isSourceMode()) {
      performSourceSearch()
    } else {
      performWysiwygSearch()
    }
  }

  function performWysiwygSearch() {
    const editor = getActiveEditor()
    if (!editor) return

    if (!searchTerm) {
      editor.commands.clearSearch()
      wysiwygSearchVersion++
      return
    }

    editor.commands.setSearchTerm(searchTerm, caseSensitive)
    wysiwygSearchVersion++
  }

  function performSourceSearch() {
    const tab = tabStore.activeTab
    if (!tab) return
    const srcEditor = getSourceEditor(tab.id)
    if (!srcEditor) return

    sourceMatches = []
    sourceCurrentIndex = -1

    if (!searchTerm) return

    const content = srcEditor.getContent()
    const term = caseSensitive ? searchTerm : searchTerm.toLowerCase()
    const text = caseSensitive ? content : content.toLowerCase()

    const newMatches: { start: number; end: number }[] = []
    let index = 0
    while (index < text.length) {
      const found = text.indexOf(term, index)
      if (found === -1) break
      newMatches.push({ start: found, end: found + searchTerm.length })
      index = found + 1
    }

    sourceMatches = newMatches

    if (sourceMatches.length > 0) {
      sourceCurrentIndex = 0
      highlightSourceMatch()
    }
  }

  function highlightSourceMatch() {
    if (sourceCurrentIndex < 0 || sourceCurrentIndex >= sourceMatches.length) return

    const textarea = getSourceTextarea()
    if (!textarea) return

    const match = sourceMatches[sourceCurrentIndex]
    textarea.focus()
    textarea.setSelectionRange(match.start, match.end)

    // Scroll into view
    const content = textarea.value.substring(0, match.start)
    const lines = content.split('\n')
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22.4
    const scrollTarget = (lines.length - 1) * lineHeight - textarea.clientHeight / 2
    textarea.scrollTop = Math.max(0, scrollTarget)
  }

  // Result counts — wysiwygSearchVersion forces re-evaluation when storage changes
  const resultCount = $derived.by(() => {
    if (isSourceMode()) {
      return sourceMatches.length
    }
    const _v = wysiwygSearchVersion
    const editor = getActiveEditor()
    return editor?.storage.searchHighlight?.results?.length ?? 0
  })

  const currentMatchIndex = $derived.by(() => {
    if (isSourceMode()) {
      return sourceCurrentIndex
    }
    const _v = wysiwygSearchVersion
    return getActiveEditor()?.storage.searchHighlight?.currentIndex ?? -1
  })

  const resultLabel = $derived(
    resultCount > 0 ? `${currentMatchIndex + 1} of ${resultCount}` : searchTerm ? 'No results' : ''
  )

  function goToNext() {
    if (resultCount === 0) return

    if (isSourceMode()) {
      sourceCurrentIndex = (sourceCurrentIndex + 1) % sourceMatches.length
      highlightSourceMatch()
    } else {
      const editor = getActiveEditor()
      if (!editor) return
      const next = (currentMatchIndex + 1) % resultCount
      editor.commands.setSearchIndex(next)
      wysiwygSearchVersion++
      scrollToCurrentMatch(editor)
    }
  }

  function goToPrev() {
    if (resultCount === 0) return

    if (isSourceMode()) {
      sourceCurrentIndex = (sourceCurrentIndex - 1 + sourceMatches.length) % sourceMatches.length
      highlightSourceMatch()
    } else {
      const editor = getActiveEditor()
      if (!editor) return
      const prev = (currentMatchIndex - 1 + resultCount) % resultCount
      editor.commands.setSearchIndex(prev)
      wysiwygSearchVersion++
      scrollToCurrentMatch(editor)
    }
  }

  function scrollToCurrentMatch(editor: Editor) {
    const results = editor.storage.searchHighlight?.results
    const idx = editor.storage.searchHighlight?.currentIndex
    if (!results || idx == null || idx < 0 || idx >= results.length) return

    const { from } = results[idx]
    editor.chain().setTextSelection(from).scrollIntoView().run()
  }

  function replaceCurrentMatch() {
    if (resultCount === 0) return

    if (isSourceMode()) {
      replaceSourceCurrent()
    } else {
      replaceWysiwygCurrent()
    }
  }

  function replaceWysiwygCurrent() {
    const editor = getActiveEditor()
    if (!editor) return
    const results = editor.storage.searchHighlight?.results
    const idx = editor.storage.searchHighlight?.currentIndex
    if (!results || idx == null || idx < 0 || idx >= results.length) return

    const match = results[idx]
    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .command(({ tr }) => {
        tr.insertText(replaceTerm, match.from, match.to)
        return true
      })
      .run()

    wysiwygSearchVersion++
  }

  function replaceSourceCurrent() {
    if (sourceCurrentIndex < 0 || sourceCurrentIndex >= sourceMatches.length) return

    const textarea = getSourceTextarea()
    if (!textarea) return

    const match = sourceMatches[sourceCurrentIndex]
    textarea.focus()
    textarea.setSelectionRange(match.start, match.end)
    document.execCommand('insertText', false, replaceTerm)

    // Re-search after replacement
    setTimeout(() => performSourceSearch(), 50)
  }

  function replaceAll() {
    if (resultCount === 0) return

    if (isSourceMode()) {
      replaceAllSource()
    } else {
      replaceAllWysiwyg()
    }
  }

  function replaceAllWysiwyg() {
    const editor = getActiveEditor()
    if (!editor) return
    const results = editor.storage.searchHighlight?.results
    if (!results || results.length === 0) return

    // Replace in reverse order to preserve positions
    const { tr } = editor.state
    for (let i = results.length - 1; i >= 0; i--) {
      if (replaceTerm) {
        tr.replaceWith(results[i].from, results[i].to, editor.state.schema.text(replaceTerm))
      } else {
        tr.delete(results[i].from, results[i].to)
      }
    }
    editor.view.dispatch(tr)

    wysiwygSearchVersion++
  }

  function replaceAllSource() {
    const tab = tabStore.activeTab
    if (!tab) return
    const srcEditor = getSourceEditor(tab.id)
    if (!srcEditor) return

    const content = srcEditor.getContent()
    let newContent: string
    if (caseSensitive) {
      newContent = content.split(searchTerm).join(replaceTerm)
    } else {
      newContent = content.replace(new RegExp(escapeRegex(searchTerm), 'gi'), replaceTerm)
    }
    srcEditor.setContent(newContent)
    tabStore.updateContent(tab.id, newContent)

    // Re-search
    setTimeout(() => performSourceSearch(), 50)
  }

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      goToPrev()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      goToNext()
    }
  }

  function close() {
    clearSearchDecorations()
    onclose()
  }

  /** Clear search state — called both internally and from parent via onclose */
  export function clearSearchDecorations() {
    const editor = getActiveEditor()
    if (editor) {
      editor.commands.clearSearch()
    }
    sourceMatches = []
    sourceCurrentIndex = -1
  }

  function toggleCaseSensitive() {
    caseSensitive = !caseSensitive
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="find-replace-bar" onkeydown={handleKeydown}>
  <div class="find-row">
    <input
      bind:this={searchInput}
      bind:value={searchTerm}
      type="text"
      class="search-input"
      placeholder="Find"
      spellcheck="false"
    />
    <span class="result-count">{resultLabel}</span>
    <button
      class="fr-btn case-btn"
      class:active={caseSensitive}
      onclick={toggleCaseSensitive}
      title="Match Case"
    >Aa</button>
    <button class="fr-btn" onclick={goToPrev} title="Previous Match (Shift+Enter)"
      >&#9650;</button
    >
    <button class="fr-btn" onclick={goToNext} title="Next Match (Enter)">&#9660;</button>
    <button class="fr-btn close-btn" onclick={close} title="Close (Escape)">&#10005;</button>
  </div>
  {#if mode === 'replace'}
    <div class="replace-row">
      <input
        bind:value={replaceTerm}
        type="text"
        class="search-input"
        placeholder="Replace"
        spellcheck="false"
      />
      <button class="fr-btn replace-btn" onclick={replaceCurrentMatch} title="Replace"
        >Replace</button
      >
      <button class="fr-btn replace-btn" onclick={replaceAll} title="Replace All">All</button>
    </div>
  {/if}
</div>

<style>
  .find-replace-bar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 12px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    margin: 0 8px;
    z-index: 10;
  }

  .find-row,
  .replace-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 13px;
    font-family: var(--font-ui);
    outline: none;
  }

  .search-input:focus {
    border-color: var(--accent);
  }

  .result-count {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    min-width: 60px;
    text-align: center;
  }

  .fr-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 4px;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
  }

  .fr-btn:hover {
    background: var(--bg-hover);
  }

  .case-btn {
    font-weight: bold;
    font-size: 14px;
  }

  .case-btn.active {
    background: var(--accent);
    color: white;
  }

  .close-btn {
    font-size: 14px;
  }

  .replace-btn {
    font-size: 12px;
    padding: 0 8px;
    white-space: nowrap;
  }
</style>
