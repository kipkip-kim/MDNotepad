<script lang="ts">
  interface CommandItem {
    title: string
    icon: string
    description: string
    action: (editor: any) => void
  }

  let {
    items = [],
    selectedIndex = $bindable(0),
    onselect,
  }: {
    items: CommandItem[]
    selectedIndex?: number
    onselect?: (item: CommandItem) => void
  } = $props()
</script>

<div class="slash-menu">
  {#if items.length === 0}
    <div class="no-results">No results</div>
  {:else}
    {#each items as item, index}
      <button
        class="slash-item"
        class:selected={index === selectedIndex}
        onmouseenter={() => { selectedIndex = index }}
        onclick={() => onselect?.(item)}
      >
        <span class="item-icon">{item.icon}</span>
        <div class="item-text">
          <span class="item-title">{item.title}</span>
          <span class="item-desc">{item.description}</span>
        </div>
      </button>
    {/each}
  {/if}
</div>

<style>
  .slash-menu {
    width: 250px;
    max-height: 300px;
    overflow-y: auto;
    background: var(--menu-bg, rgba(252, 252, 252, 0.95));
    border: 1px solid var(--menu-border, rgba(0, 0, 0, 0.08));
    border-radius: 6px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 4px;
    z-index: 9999;
  }

  .no-results {
    padding: 8px 12px;
    color: var(--text-disabled, #a0a0a0);
    font-size: 12px;
  }

  .slash-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-ui, 'Segoe UI Variable', sans-serif);
    transition: background 0.05s;
  }

  .slash-item:hover,
  .slash-item.selected {
    background: var(--menu-hover, rgba(0, 0, 0, 0.04));
  }

  .item-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-hover, rgba(0, 0, 0, 0.04));
    border-radius: 4px;
    font-size: 13px;
    flex-shrink: 0;
    color: var(--text-primary, #1a1a1a);
  }

  .item-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .item-title {
    font-size: 13px;
    color: var(--text-primary, #1a1a1a);
    font-weight: 500;
  }

  .item-desc {
    font-size: 11px;
    color: var(--text-secondary, #616161);
  }
</style>
