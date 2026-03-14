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

  // Adjust position to stay in viewport
  onMount(() => {
    if (!menuEl) return
    const rect = menuEl.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menuEl.style.left = `${window.innerWidth - rect.width - 4}px`
    }
    if (rect.bottom > window.innerHeight) {
      menuEl.style.top = `${window.innerHeight - rect.height - 4}px`
    }
  })

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      onclose()
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
  style:left="{x}px"
  style:top="{y}px"
>
  {#each items as item}
    {#if item.separator}
      <div class="separator"></div>
    {:else}
      <button
        class="context-item"
        class:disabled={item.disabled}
        onclick={() => handleItemClick(item)}
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

  .context-item:hover:not(.disabled) {
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
