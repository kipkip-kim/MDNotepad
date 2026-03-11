<script lang="ts">
  import WindowControls from './WindowControls.svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'

  interface MenuItem {
    label: string
    shortcut?: string
    action?: () => void
    separator?: boolean
    disabled?: boolean
  }

  interface MenuDef {
    label: string
    items: MenuItem[]
  }

  let { title = 'Untitled', isDirty = false }: { title?: string; isDirty?: boolean } = $props()

  let openMenu = $state<string | null>(null)
  let menuRefs = $state<Record<string, HTMLElement>>({})

  const appWindow = getCurrentWindow()

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New Tab', shortcut: 'Ctrl+N', action: () => dispatch('newTab') },
        { label: 'Open...', shortcut: 'Ctrl+O', action: () => dispatch('open') },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => dispatch('save') },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => dispatch('saveAs') },
        { label: '', separator: true },
        { label: 'Print', shortcut: 'Ctrl+P', action: () => dispatch('print'), disabled: true },
        { label: '', separator: true },
        { label: 'Close Tab', shortcut: 'Ctrl+W', action: () => dispatch('closeTab') },
        { label: 'Exit', shortcut: 'Alt+F4', action: () => appWindow.close() },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => dispatch('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => dispatch('redo') },
        { label: '', separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => dispatch('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => dispatch('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => dispatch('paste') },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => dispatch('selectAll') },
        { label: '', separator: true },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => dispatch('find') },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => dispatch('replace') },
        { label: 'Go to Line...', shortcut: 'Ctrl+G', action: () => dispatch('goToLine') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl+=', action: () => dispatch('zoomIn') },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', action: () => dispatch('zoomOut') },
        { label: 'Reset Zoom', shortcut: 'Ctrl+0', action: () => dispatch('zoomReset') },
        { label: '', separator: true },
        { label: 'Word Wrap', shortcut: 'Alt+Z', action: () => dispatch('toggleWordWrap') },
        { label: 'Source View', shortcut: 'Ctrl+/', action: () => dispatch('toggleSourceView') },
        { label: '', separator: true },
        { label: 'Settings', shortcut: 'Ctrl+,', action: () => dispatch('openSettings') },
      ],
    },
  ]

  function dispatch(action: string) {
    openMenu = null
    window.dispatchEvent(new CustomEvent('mdnotepad:command', { detail: { action } }))
  }

  function handleMenuClick(menuLabel: string) {
    if (openMenu === menuLabel) {
      openMenu = null
    } else {
      openMenu = menuLabel
    }
  }

  function handleMenuHover(menuLabel: string) {
    if (openMenu !== null) {
      openMenu = menuLabel
    }
  }

  function handleItemClick(item: MenuItem) {
    if (item.disabled) return
    item.action?.()
    openMenu = null
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (openMenu === null) return
    if (e.key === 'Escape') {
      openMenu = null
      e.preventDefault()
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.menu-bar')) {
      openMenu = null
    }
  }

  async function handleDoubleClick() {
    await appWindow.toggleMaximize()
  }

  $effect(() => {
    if (openMenu !== null) {
      document.addEventListener('click', handleOutsideClick, { capture: true })
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick, { capture: true })
      document.removeEventListener('keydown', handleKeyDown)
    }
  })

  const displayTitle = $derived(
    (isDirty ? '● ' : '') + title + ' - MDNotepad'
  )
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="titlebar" data-tauri-drag-region ondblclick={handleDoubleClick}>
  <div class="menu-bar">
    {#each menus as menu}
      <div class="menu-container">
        <button
          class="menu-btn"
          class:active={openMenu === menu.label}
          onclick={() => handleMenuClick(menu.label)}
          onmouseenter={() => handleMenuHover(menu.label)}
          bind:this={menuRefs[menu.label]}
        >
          {menu.label}
        </button>
        {#if openMenu === menu.label}
          <div class="dropdown">
            {#each menu.items as item}
              {#if item.separator}
                <div class="separator"></div>
              {:else}
                <button
                  class="dropdown-item"
                  class:disabled={item.disabled}
                  onclick={() => handleItemClick(item)}
                >
                  <span class="item-label">{item.label}</span>
                  {#if item.shortcut}
                    <span class="item-shortcut">{item.shortcut}</span>
                  {/if}
                </button>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <span class="titlebar-title" data-tauri-drag-region>{displayTitle}</span>

  <div class="titlebar-spacer" data-tauri-drag-region></div>

  <WindowControls />
</div>

<style>
  .titlebar {
    height: var(--titlebar-height);
    display: flex;
    align-items: center;
    background: transparent;
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
    position: relative;
    z-index: 100;
  }

  .menu-bar {
    display: flex;
    align-items: center;
    height: 100%;
    padding-left: 8px;
  }

  .menu-container {
    position: relative;
  }

  .menu-btn {
    height: 28px;
    padding: 0 8px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
  }

  .menu-btn:hover,
  .menu-btn.active {
    background: var(--bg-hover);
  }

  .titlebar-title {
    font-size: 12px;
    color: var(--text-secondary);
    flex: 1;
    text-align: center;
    pointer-events: none;
  }

  .titlebar-spacer {
    flex: 1;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 220px;
    background: var(--menu-bg);
    border: 1px solid var(--menu-border);
    border-radius: var(--radius);
    box-shadow: var(--menu-shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 4px;
    z-index: 1000;
    animation: menuFadeIn 0.1s ease;
  }

  @keyframes menuFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 28px;
    padding: 0 8px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    border-radius: var(--radius-sm);
    text-align: left;
  }

  .dropdown-item:hover:not(.disabled) {
    background: var(--menu-hover);
  }

  .dropdown-item:active:not(.disabled) {
    background: var(--menu-active);
  }

  .dropdown-item.disabled {
    color: var(--text-disabled);
    cursor: default;
  }

  .item-label {
    flex: 1;
  }

  .item-shortcut {
    color: var(--text-secondary);
    font-size: 11px;
    margin-left: 24px;
  }

  .separator {
    height: 1px;
    background: var(--border-subtle);
    margin: 4px 8px;
  }
</style>
