<script lang="ts">
  import { onMount } from 'svelte'

  interface ContextMenuItem {
    label: string
    action: () => void
    separator?: boolean
    disabled?: boolean
  }

  let {
    items,
    x,
    y,
    onclose,
  }: {
    items: ContextMenuItem[]
    x: number
    y: number
    onclose: () => void
  } = $props()

  let menuEl: HTMLElement | undefined = $state()
  let offsetX = $state(0)
  let offsetY = $state(0)
  let focusedIndex = $state(-1)

  // Get non-separator items for keyboard navigation
  const actionItems = $derived(
    items.map((item, i) => ({ item, index: i })).filter((e) => !e.item.separator)
  )

  // Adjust position to stay in viewport
  onMount(() => {
    if (!menuEl) return
    const rect = menuEl.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      offsetX = window.innerWidth - rect.right - 4
    }
    if (rect.bottom > window.innerHeight) {
      offsetY = window.innerHeight - rect.bottom - 4
    }
  })

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      onclose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIdx = actionItems.findIndex((e) => e.index > focusedIndex)
      focusedIndex = nextIdx !== -1 ? actionItems[nextIdx].index : actionItems[0]?.index ?? -1
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const candidates = actionItems.filter((e) => e.index < focusedIndex)
      focusedIndex = candidates.length > 0
        ? candidates[candidates.length - 1].index
        : actionItems[actionItems.length - 1]?.index ?? -1
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusedIndex = actionItems[0]?.index ?? -1
    } else if (e.key === 'End') {
      e.preventDefault()
      focusedIndex = actionItems[actionItems.length - 1]?.index ?? -1
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const focused = items[focusedIndex]
      if (focused && !focused.separator) handleItemClick(focused)
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      onclose()
    }
  }

  function handleItemClick(item: ContextMenuItem) {
    if (item.disabled) return
    item.action()
    onclose()
  }
</script>

<svelte:window onkeydown={handleKeydown} onmousedown={handleOutsideClick} />

<div
  class="context-menu"
  bind:this={menuEl}
  style:left="{x + offsetX}px"
  style:top="{y + offsetY}px"
>
  {#each items as item, i}
    {#if item.separator}
      <div class="separator"></div>
    {:else}
      <button
        class="context-item"
        class:disabled={item.disabled}
        class:focused={focusedIndex === i}
        onclick={() => handleItemClick(item)}
        onmouseenter={() => focusedIndex = i}
      >
        {item.label}
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    min-width: 180px;
    background: var(--menu-bg);
    border: 1px solid var(--menu-border);
    border-radius: var(--radius);
    box-shadow: var(--menu-shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 4px;
    z-index: 2000;
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

  .context-item {
    display: flex;
    align-items: center;
    width: 100%;
    height: 28px;
    padding: 0 12px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    border-radius: var(--radius-sm);
    text-align: left;
  }

  .context-item:hover:not(.disabled),
  .context-item.focused:not(.disabled) {
    background: var(--menu-hover);
  }

  .context-item:active:not(.disabled) {
    background: var(--menu-active);
  }

  .context-item.disabled {
    color: var(--text-disabled);
    cursor: default;
  }

  .separator {
    height: 1px;
    background: var(--border-subtle);
    margin: 4px 8px;
  }
</style>
