<script lang="ts">
  import TitleBar from './lib/components/TitleBar.svelte'
  import TabBar from './lib/components/TabBar.svelte'
  import EditorArea from './lib/components/EditorArea.svelte'
  import FindReplace from './lib/components/FindReplace.svelte'
  import SettingsPage from './lib/components/SettingsPage.svelte'
  import StatusBar from './lib/components/StatusBar.svelte'
  import ContextMenu from './lib/components/ContextMenu.svelte'
  import { onMount } from 'svelte'
  import { tabStore } from './lib/stores/tabs.svelte'
  import { appState } from './lib/stores/app.svelte'
  import { settingsStore } from './lib/stores/settings.svelte'
  import { handleOpen, handleSave, handleSaveAs, handleOpenPath } from './lib/commands/file'
  import { saveSession } from './lib/services/session'
  import { startAutoSave, stopAutoSave } from './lib/services/auto-save'
  import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { ask, message } from '@tauri-apps/plugin-dialog'

  async function safeAsync(fn: () => Promise<void>) {
    try {
      await fn()
    } catch (err) {
      await message(String(err), { title: 'MDNotepad', kind: 'error' })
    }
  }

  let editorArea: EditorArea | undefined = $state()
  let findReplaceRef: FindReplace | undefined = $state()
  let contextMenu: { x: number; y: number } | null = $state(null)

  onMount(() => {
    // Custom command events from menus
    const listener = ((e: CustomEvent<{ action: string }>) => {
      handleCommand(e)
    }) as EventListener
    window.addEventListener('mdnotepad:command', listener)

    // Start auto-save
    startAutoSave(() => editorArea?.getEditors())

    // File drag and drop
    const appWindow = getCurrentWebviewWindow()
    const unlisten = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        for (const path of event.payload.paths) {
          safeAsync(() => handleOpenPath(path))
        }
      }
    })

    // Intercept window close to check for unsaved changes
    const unlistenClose = appWindow.onCloseRequested(async (event) => {
      const dirtyTabs = tabStore.tabs.filter((t) => tabStore.isTabDirty(t.id))

      if (dirtyTabs.length > 0) {
        event.preventDefault()
        const shouldSave = await ask(
          `You have ${dirtyTabs.length} unsaved file(s). Save before closing?`,
          { title: 'MDNotepad', kind: 'warning' }
        )
        if (shouldSave) {
          const editors = editorArea?.getEditors()
          if (editors) {
            for (const tab of dirtyTabs) {
              try {
                await handleSave(tab, editors)
              } catch {
                return // Save failed, abort close
              }
            }
          }
        }
      }

      // Save session before closing
      const editors = editorArea?.getEditors()
      if (editors) {
        await saveSession(editors)
      }

      await appWindow.destroy()
    })

    return () => {
      window.removeEventListener('mdnotepad:command', listener)
      stopAutoSave()
      unlisten.then((fn) => fn())
      unlistenClose.then((fn) => fn())
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
      if (tabStore.activeTab) confirmAndCloseTab(tabStore.activeTab.id)
    } else if (ctrl && e.key === 'Tab') {
      e.preventDefault()
      e.shiftKey ? tabStore.prevTab() : tabStore.nextTab()
    }

    // File operations
    if (ctrl && e.key === 'o') {
      e.preventDefault()
      safeAsync(() => handleOpen())
    } else if (ctrl && e.shiftKey && e.key === 'S') {
      e.preventDefault()
      const tab = tabStore.activeTab
      const editors = editorArea?.getEditors()
      if (tab && editors) safeAsync(() => handleSaveAs(tab, editors))
    } else if (ctrl && e.key === 's') {
      e.preventDefault()
      const tab = tabStore.activeTab
      const editors = editorArea?.getEditors()
      if (tab && editors) safeAsync(() => handleSave(tab, editors))
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

    // Alt+Z - toggle word wrap
    if (e.altKey && e.key === 'z') {
      e.preventDefault()
      settingsStore.wordWrap = !settingsStore.wordWrap
      settingsStore.debouncedSave()
    }

    // Escape - close Settings or FindReplace
    if (e.key === 'Escape' && appState.showSettings) {
      e.preventDefault()
      appState.showSettings = false
      return
    }
    if (e.key === 'Escape' && appState.showFindReplace) {
      e.preventDefault()
      closeFindReplace()
      return
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

    // Print
    if (ctrl && e.key === 'p') {
      e.preventDefault()
      window.print()
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

  async function confirmAndCloseTab(id: string) {
    if (tabStore.isTabDirty(id)) {
      const tab = tabStore.getTabById(id)
      if (!tab) return

      const shouldSave = await ask(
        `Do you want to save changes to "${tab.fileName}"?`,
        { title: 'MDNotepad', kind: 'warning' }
      )

      if (shouldSave) {
        const editors = editorArea?.getEditors()
        if (editors) {
          try {
            await handleSave(tab, editors)
          } catch {
            return // Save failed, don't close
          }
        }
      }
    }

    tabStore.closeTab(id)
  }

  function handleGoToLine() {
    if (!editorArea) return
    const totalLines = editorArea.getLineCount()
    if (totalLines === 0) return

    const input = prompt(`Go to Line (1-${totalLines}):`, String(tabStore.activeTab?.cursorPosition.line ?? 1))
    if (input === null) return
    let lineNum = parseInt(input, 10)
    if (isNaN(lineNum) || lineNum < 1) lineNum = 1
    if (lineNum > totalLines) lineNum = totalLines

    editorArea.goToLine(lineNum)
  }

  function closeFindReplace() {
    // Clear search decorations before destroying the component
    findReplaceRef?.clearSearchDecorations()
    // Also clear directly in case ref is unavailable (e.g., Escape from editor)
    editorArea?.getActiveEditor()?.commands.clearSearch()

    appState.showFindReplace = false
    // Focus back to editor
    const tab = tabStore.activeTab
    if (tab?.viewMode === 'source') {
      editorArea?.getSourceEditor(tab.id)?.focus()
    } else {
      editorArea?.getActiveEditor()?.commands.focus()
    }
  }

  function handleToggleSourceView() {
    const tab = tabStore.activeTab
    if (!tab) return
    tabStore.setViewMode(tab.id, tab.viewMode === 'wysiwyg' ? 'source' : 'wysiwyg')
  }

  function handleContextMenu(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.editor-area')) return
    e.preventDefault()
    contextMenu = { x: e.clientX, y: e.clientY }
  }

  function getContextMenuItems() {
    const tab = tabStore.activeTab
    const isSource = tab?.viewMode === 'source'

    const items: { label: string; action: () => void; separator?: boolean; disabled?: boolean }[] = [
      {
        label: 'Undo',
        action: () => {
          if (isSource) {
            editorArea?.getSourceEditor(tab!.id)?.focus()
            document.execCommand('undo')
          } else {
            editorArea?.getActiveEditor()?.commands.undo()
          }
        },
      },
      {
        label: 'Redo',
        action: () => {
          if (isSource) {
            editorArea?.getSourceEditor(tab!.id)?.focus()
            document.execCommand('redo')
          } else {
            editorArea?.getActiveEditor()?.commands.redo()
          }
        },
      },
      { label: '', action: () => {}, separator: true },
      { label: 'Cut', action: () => document.execCommand('cut') },
      { label: 'Copy', action: () => document.execCommand('copy') },
      { label: 'Paste', action: () => document.execCommand('paste') },
      { label: '', action: () => {}, separator: true },
      {
        label: 'Select All',
        action: () => {
          if (isSource) {
            editorArea?.getSourceEditor(tab!.id)?.focus()
            document.execCommand('selectAll')
          } else {
            editorArea?.getActiveEditor()?.commands.selectAll()
          }
        },
      },
    ]

    // Add formatting options for markdown tabs in WYSIWYG mode
    if (tab?.isMarkdown && !isSource) {
      const editor = editorArea?.getActiveEditor()
      if (editor) {
        items.push({ label: '', action: () => {}, separator: true })
        items.push({ label: 'Bold', action: () => editor.chain().focus().toggleBold().run() })
        items.push({ label: 'Italic', action: () => editor.chain().focus().toggleItalic().run() })
        items.push({ label: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run() })
        items.push({ label: 'Code', action: () => editor.chain().focus().toggleCode().run() })
      }
    }

    return items
  }

  function handleCommand(e: CustomEvent<{ action: string }>) {
    const { action } = e.detail
    const editors = editorArea?.getEditors()
    const tab = tabStore.activeTab

    switch (action) {
      case 'newTab': tabStore.createTab(); break
      case 'open': safeAsync(() => handleOpen()); break
      case 'save': if (tab && editors) safeAsync(() => handleSave(tab, editors)); break
      case 'saveAs': if (tab && editors) safeAsync(() => handleSaveAs(tab, editors)); break
      case 'closeTab': {
        const closeId = (e.detail as { tabId?: string }).tabId ?? tab?.id
        if (closeId) confirmAndCloseTab(closeId)
        break
      }
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
      case 'undo':
        if (tab?.viewMode === 'source') {
          editorArea?.getSourceEditor(tab.id)?.focus()
          document.execCommand('undo')
        } else {
          editorArea?.getActiveEditor()?.commands.undo()
        }
        break
      case 'redo':
        if (tab?.viewMode === 'source') {
          editorArea?.getSourceEditor(tab.id)?.focus()
          document.execCommand('redo')
        } else {
          editorArea?.getActiveEditor()?.commands.redo()
        }
        break
      case 'selectAll':
        if (tab?.viewMode === 'source') {
          editorArea?.getSourceEditor(tab.id)?.focus()
          document.execCommand('selectAll')
        } else {
          editorArea?.getActiveEditor()?.commands.selectAll()
        }
        break
      case 'toggleWordWrap':
        settingsStore.wordWrap = !settingsStore.wordWrap
        settingsStore.debouncedSave()
        break
      case 'print': window.print(); break
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:window onkeydown={handleKeydown} oncontextmenu={handleContextMenu} />

<main class="app-root">
  <TitleBar title={activeFileName} {isDirty} />
  <TabBar />
  {#if appState.showFindReplace}
    <FindReplace
      bind:this={findReplaceRef}
      mode={appState.findReplaceMode}
      getActiveEditor={() => editorArea?.getActiveEditor()}
      getSourceEditor={(tabId) => editorArea?.getSourceEditor(tabId)}
      onclose={closeFindReplace}
    />
  {/if}
  <EditorArea bind:this={editorArea} />
  {#if appState.showSettings}
    <SettingsPage onclose={() => appState.showSettings = false} />
  {/if}
  <StatusBar ontoggleSourceView={handleToggleSourceView} />
  {#if contextMenu}
    <ContextMenu
      items={getContextMenuItems()}
      x={contextMenu.x}
      y={contextMenu.y}
      onclose={() => contextMenu = null}
    />
  {/if}
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
    position: relative;
  }
</style>
