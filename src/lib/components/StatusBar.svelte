<script lang="ts">
  import { tabStore } from '../stores/tabs.svelte'
  import { appState } from '../stores/app.svelte'

  let { ontoggleSourceView }: { ontoggleSourceView?: () => void } = $props()

  const cursorPos = $derived(tabStore.activeTab?.cursorPosition ?? { line: 1, col: 1 })
  const encoding = $derived(tabStore.activeTab?.encoding ?? 'UTF-8')
  const lineEnding = $derived(tabStore.activeTab?.lineEnding ?? 'CRLF')
  const viewMode = $derived(tabStore.activeTab?.viewMode ?? 'wysiwyg')
  const charCount = $derived(appState.characterCount)
  const zoom = $derived(appState.zoomLevel)
</script>

<div class="statusbar">
  <span class="status-item">Ln {cursorPos.line}, Col {cursorPos.col}</span>
  <span class="status-separator"></span>
  <span class="status-item">Characters: {charCount.toLocaleString()}</span>
  <span class="status-separator"></span>
  <span class="status-item">{encoding}</span>
  <span class="status-separator"></span>
  <span class="status-item">{lineEnding}</span>
  <span class="status-separator"></span>
  <span class="status-item">{zoom}%</span>
  <div class="status-spacer"></div>
  <button
    class="status-btn"
    class:active={viewMode === 'source'}
    onclick={ontoggleSourceView}
    title="Toggle source view (Ctrl+/)"
  >
    &lt;/&gt;
  </button>
</div>

<style>
  .statusbar {
    height: var(--statusbar-height);
    display: flex;
    align-items: center;
    padding: 0 12px;
    background: transparent;
    flex-shrink: 0;
    gap: 4px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .status-item {
    padding: 0 6px;
    cursor: default;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  .status-item:hover {
    background: var(--bg-hover);
  }

  .status-separator {
    width: 1px;
    height: 14px;
    background: var(--border-control);
    flex-shrink: 0;
  }

  .status-spacer {
    flex: 1;
  }

  .status-btn {
    height: 20px;
    padding: 0 6px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-family: var(--font-ui);
    transition: background 0.1s;
  }

  .status-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .status-btn.active {
    color: var(--accent);
  }
</style>
