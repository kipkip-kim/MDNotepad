<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window'

  const appWindow = getCurrentWindow()

  function minimize() {
    appWindow.minimize()
  }

  async function toggleMaximize() {
    await appWindow.toggleMaximize()
  }

  function close() {
    appWindow.close()
  }
</script>

<div class="window-controls">
  <button class="control-btn" onclick={minimize} aria-label="Minimize">
    <svg width="10" height="1" viewBox="0 0 10 1">
      <rect width="10" height="1" fill="currentColor" />
    </svg>
  </button>
  <button class="control-btn" onclick={toggleMaximize} aria-label="Maximize">
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1" />
    </svg>
  </button>
  <button class="control-btn close-btn" onclick={close} aria-label="Close">
    <svg width="10" height="10" viewBox="0 0 10 10">
      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.2" />
      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.2" />
    </svg>
  </button>
</div>

<style>
  .window-controls {
    display: flex;
    height: var(--titlebar-height);
    flex-shrink: 0;
  }

  .control-btn {
    width: 46px;
    height: var(--titlebar-height);
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.1s;
  }

  .control-btn:hover {
    background: var(--bg-hover);
  }

  .control-btn:active {
    background: var(--bg-active);
  }

  .close-btn:hover {
    background: var(--close-hover);
    color: var(--close-text);
  }

  .close-btn:active {
    background: var(--close-active);
    color: var(--close-text);
  }
</style>
