<script lang="ts">
  import Tab from './Tab.svelte'
  import { tabStore } from '../stores/tabs.svelte'

  let dragFromIdx = $state<number | null>(null)

  function handleNewTab() {
    tabStore.createTab()
  }

  function handleCloseTab(id: string) {
    // Save confirmation will be added in Step 6
    tabStore.closeTab(id)
  }

  function handleDragStart(e: DragEvent, idx: number) {
    dragFromIdx = idx
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  function handleDrop(e: DragEvent, toIdx: number) {
    e.preventDefault()
    if (dragFromIdx !== null && dragFromIdx !== toIdx) {
      tabStore.reorderTabs(dragFromIdx, toIdx)
    }
    dragFromIdx = null
  }
</script>

<div class="tabbar">
  <div class="tabs-container">
    {#each tabStore.tabs as tab, idx (tab.id)}
      <Tab
        {tab}
        isActive={tab.id === tabStore.activeTabId}
        isDirty={tabStore.isTabDirty(tab.id)}
        onactivate={() => tabStore.setActiveTab(tab.id)}
        onclose={() => handleCloseTab(tab.id)}
        ondragstart={(e) => handleDragStart(e, idx)}
        ondragover={handleDragOver}
        ondrop={(e) => handleDrop(e, idx)}
      />
    {/each}
  </div>
  <button class="new-tab-btn" onclick={handleNewTab} aria-label="New tab">
    +
  </button>
</div>

<style>
  .tabbar {
    height: var(--tabbar-height);
    display: flex;
    align-items: flex-end;
    padding: 0 8px;
    background: transparent;
    flex-shrink: 0;
    gap: 2px;
  }

  .tabs-container {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    overflow-x: auto;
    flex: 1;
    scrollbar-width: none;
  }

  .tabs-container::-webkit-scrollbar {
    display: none;
  }

  .new-tab-btn {
    height: 30px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius);
    font-size: 16px;
    flex-shrink: 0;
    transition: background 0.1s;
  }

  .new-tab-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
