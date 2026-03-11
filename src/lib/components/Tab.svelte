<script lang="ts">
  import type { TabData } from '../types/tab'

  let {
    tab,
    isActive = false,
    isDirty = false,
    onactivate,
    onclose,
    ondragstart,
    ondragover,
    ondrop,
  }: {
    tab: TabData
    isActive?: boolean
    isDirty?: boolean
    onactivate: () => void
    onclose: (e: MouseEvent) => void
    ondragstart: (e: DragEvent) => void
    ondragover: (e: DragEvent) => void
    ondrop: (e: DragEvent) => void
  } = $props()

  function handleMouseDown(e: MouseEvent) {
    // Middle click to close
    if (e.button === 1) {
      e.preventDefault()
      onclose(e)
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="tab"
  class:active={isActive}
  onclick={onactivate}
  onmousedown={handleMouseDown}
  draggable="true"
  ondragstart={ondragstart}
  ondragover={ondragover}
  ondrop={ondrop}
  role="tab"
  aria-selected={isActive}
  tabindex="0"
>
  {#if isDirty}
    <span class="dirty-indicator">●</span>
  {/if}
  <span class="tab-name">{tab.fileName}</span>
  <button
    class="close-btn"
    onclick={(e) => { e.stopPropagation(); onclose(e); }}
    aria-label="Close tab"
  >
    ✕
  </button>
</div>

<style>
  .tab {
    height: 30px;
    padding: 0 4px 0 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    border-radius: var(--radius) var(--radius) 0 0;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    min-width: 0;
    max-width: 180px;
    flex-shrink: 0;
    transition: background 0.1s;
  }

  .tab.active {
    color: var(--text-primary);
    background: var(--bg-card);
    border-bottom: 2px solid var(--accent);
  }

  .tab:not(.active):hover {
    background: var(--bg-hover);
  }

  .dirty-indicator {
    color: var(--accent);
    font-size: 8px;
    flex-shrink: 0;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-btn {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.1s;
    flex-shrink: 0;
  }

  .tab:hover .close-btn,
  .tab.active .close-btn {
    opacity: 1;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
