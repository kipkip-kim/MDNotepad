<script lang="ts">
  import TitleBar from './lib/components/TitleBar.svelte'
  import TabBar from './lib/components/TabBar.svelte'
  import EditorArea from './lib/components/EditorArea.svelte'
  import StatusBar from './lib/components/StatusBar.svelte'
  import { onMount } from 'svelte'
  import { tabStore } from './lib/stores/tabs.svelte'
  import { appState } from './lib/stores/app.svelte'
  import { handleOpen, handleSave, handleSaveAs, handleOpenPath } from './lib/commands/file'
  import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

  let editorArea: EditorArea | undefined = $state()

  onMount(() => {
    // Custom command events from menus
    const listener = ((e: CustomEvent<{ action: string }>) => {
      handleCommand(e)
    }) as EventListener
    window.addEventListener('mdnotepad:command', listener)

    // File drag and drop
    const appWindow = getCurrentWebviewWindow()
    const unlisten = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const editors = editorArea?.getEditors()
        if (!editors) return
        for (const path of event.payload.paths) {
          handleOpenPath(path, editors)
        }
      }
    })

    return () => {
      window.removeEventListener('mdnotepad:command', listener)
      unlisten.then((fn) => fn())
    }
  })

  const activeFileName = $derived(tabStore.activeTab?.fileName ?? 'Untitled')
  const isDirty = $derived(tabStore.isDirty)

  function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey

    // Tab management
    if (ctrl && e.key === 'n') {
      e.preventDefault()
      tabStore.createTab()
    } else if (ctrl && e.key === 'w') {
      e.preventDefault()
      if (tabStore.activeTab) tabStore.closeTab(tabStore.activeTab.id)
    } else if (ctrl && e.key === 'Tab') {
      e.preventDefault()
      e.shiftKey ? tabStore.prevTab() : tabStore.nextTab()
    }

    // File operations
    if (ctrl && e.key === 'o') {
      e.preventDefault()
      const editors = editorArea?.getEditors()
      if (editors) handleOpen(editors)
    } else if (ctrl && e.shiftKey && e.key === 'S') {
      e.preventDefault()
      const tab = tabStore.activeTab
      const editors = editorArea?.getEditors()
      if (tab && editors) handleSaveAs(tab, editors)
    } else if (ctrl && e.key === 's') {
      e.preventDefault()
      const tab = tabStore.activeTab
      const editors = editorArea?.getEditors()
      if (tab && editors) handleSave(tab, editors)
    }

    // Zoom
    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      appState.zoomIn()
    } else if (ctrl && e.key === '-') {
      e.preventDefault()
      appState.zoomOut()
    } else if (ctrl && e.key === '0') {
      e.preventDefault()
      appState.zoomReset()
    }

    // Find/Replace
    if (ctrl && e.key === 'f') {
      e.preventDefault()
      appState.showFindReplace = true
      appState.findReplaceMode = 'find'
    } else if (ctrl && e.key === 'h') {
      e.preventDefault()
      appState.showFindReplace = true
      appState.findReplaceMode = 'replace'
    }

    // F5 - Insert date/time
    if (e.key === 'F5') {
      e.preventDefault()
      editorArea?.insertText(new Date().toLocaleString())
    }

    // Ctrl+G - Go to line
    if (ctrl && e.key === 'g') {
      e.preventDefault()
      handleGoToLine()
    }

    // Source view toggle
    if (ctrl && e.key === '/') {
      e.preventDefault()
      handleToggleSourceView()
    }

    // Settings
    if (ctrl && e.key === ',') {
      e.preventDefault()
      appState.showSettings = !appState.showSettings
    }
  }

  function handleGoToLine() {
    const editor = editorArea?.getActiveEditor()
    if (!editor) return
    const totalLines = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n').split('\n').length
    const input = prompt(`Go to Line (1-${totalLines}):`, String(tabStore.activeTab?.cursorPosition.line ?? 1))
    if (input === null) return
    let lineNum = parseInt(input, 10)
    if (isNaN(lineNum) || lineNum < 1) lineNum = 1
    if (lineNum > totalLines) lineNum = totalLines

    let pos = 0
    let currentLine = 1
    editor.state.doc.descendants((node, nodePos) => {
      if (currentLine >= lineNum) return false
      if (node.isBlock) {
        currentLine++
        pos = nodePos + node.nodeSize
      }
      return true
    })
    if (lineNum === 1) pos = 1

    editor.commands.focus()
    editor.commands.setTextSelection(pos)
  }

  function handleToggleSourceView() {
    const tab = tabStore.activeTab
    if (!tab) return
    tabStore.setViewMode(tab.id, tab.viewMode === 'wysiwyg' ? 'source' : 'wysiwyg')
  }

  function handleCommand(e: CustomEvent<{ action: string }>) {
    const { action } = e.detail
    const editors = editorArea?.getEditors()
    const tab = tabStore.activeTab

    switch (action) {
      case 'newTab': tabStore.createTab(); break
      case 'open': if (editors) handleOpen(editors); break
      case 'save': if (tab && editors) handleSave(tab, editors); break
      case 'saveAs': if (tab && editors) handleSaveAs(tab, editors); break
      case 'closeTab': if (tab) tabStore.closeTab(tab.id); break
      case 'zoomIn': appState.zoomIn(); break
      case 'zoomOut': appState.zoomOut(); break
      case 'zoomReset': appState.zoomReset(); break
      case 'toggleSourceView': handleToggleSourceView(); break
      case 'openSettings': appState.showSettings = !appState.showSettings; break
      case 'find':
        appState.showFindReplace = true
        appState.findReplaceMode = 'find'
        break
      case 'replace':
        appState.showFindReplace = true
        appState.findReplaceMode = 'replace'
        break
      case 'goToLine': handleGoToLine(); break
      case 'undo': editorArea?.getActiveEditor()?.commands.undo(); break
      case 'redo': editorArea?.getActiveEditor()?.commands.redo(); break
      case 'selectAll': editorArea?.getActiveEditor()?.commands.selectAll(); break
      case 'toggleWordWrap': break // handled in Step 10
      case 'print': window.print(); break
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="app-root">
  <TitleBar title={activeFileName} {isDirty} />
  <TabBar />
  <EditorArea bind:this={editorArea} />
  <StatusBar ontoggleSourceView={handleToggleSourceView} />
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    background-color: transparent;
    height: 100%;
    overflow: hidden;
  }

  :global(body) {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    color: var(--text-primary);
  }

  :global(#app) {
    height: 100vh;
  }

  .app-root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-base);
    border-radius: 8px;
    overflow: hidden;
  }
</style>
