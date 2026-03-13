<script lang="ts">
  import { settingsStore, type ThemeMode } from '../stores/settings.svelte'

  let { onclose }: { onclose: () => void } = $props()

  function setTheme(t: ThemeMode) {
    settingsStore.theme = t
    settingsStore.applyTheme()
    settingsStore.debouncedSave()
  }

  function setFontFamily(value: string) {
    settingsStore.editorFontFamily = value
    settingsStore.debouncedSave()
  }

  function setFontSize(value: number) {
    settingsStore.editorFontSize = Math.max(10, Math.min(32, value))
    settingsStore.debouncedSave()
  }

  function toggleWordWrap() {
    settingsStore.wordWrap = !settingsStore.wordWrap
    settingsStore.debouncedSave()
  }

  function toggleSpellCheck() {
    settingsStore.spellCheck = !settingsStore.spellCheck
    settingsStore.debouncedSave()
  }

  const fontOptions = [
    { label: 'Cascadia Code', value: "'Cascadia Code', 'Consolas', 'Courier New', monospace" },
    { label: 'Consolas', value: "'Consolas', 'Courier New', monospace" },
    { label: 'Courier New', value: "'Courier New', monospace" },
    { label: 'System Default', value: "monospace" },
  ]
</script>

<div class="settings-overlay">
  <div class="settings-page">
    <div class="settings-header">
      <h1>Settings</h1>
      <button class="close-btn" onclick={onclose} title="Close (Escape)">✕</button>
    </div>

    <div class="settings-content">
      <!-- Appearance -->
      <section class="settings-section">
        <h2>Appearance</h2>
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-title">Theme</span>
            <span class="setting-desc">Select the app color theme</span>
          </div>
          <div class="theme-buttons">
            <button
              class="theme-btn"
              class:active={settingsStore.theme === 'light'}
              onclick={() => setTheme('light')}
            >Light</button>
            <button
              class="theme-btn"
              class:active={settingsStore.theme === 'dark'}
              onclick={() => setTheme('dark')}
            >Dark</button>
            <button
              class="theme-btn"
              class:active={settingsStore.theme === 'system'}
              onclick={() => setTheme('system')}
            >System</button>
          </div>
        </div>
      </section>

      <!-- Editor -->
      <section class="settings-section">
        <h2>Editor</h2>

        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-title">Font Family</span>
            <span class="setting-desc">Editor font for code and markdown</span>
          </div>
          <select
            class="setting-select"
            value={settingsStore.editorFontFamily}
            onchange={(e) => setFontFamily(e.currentTarget.value)}
          >
            {#each fontOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-title">Font Size</span>
            <span class="setting-desc">Base editor font size (10–32px)</span>
          </div>
          <div class="font-size-control">
            <button class="size-btn" onclick={() => setFontSize(settingsStore.editorFontSize - 1)}>−</button>
            <input
              type="number"
              class="size-input"
              min="10"
              max="32"
              value={settingsStore.editorFontSize}
              onchange={(e) => setFontSize(parseInt(e.currentTarget.value, 10) || 14)}
            />
            <button class="size-btn" onclick={() => setFontSize(settingsStore.editorFontSize + 1)}>+</button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-title">Word Wrap</span>
            <span class="setting-desc">Wrap long lines to fit the editor width</span>
          </div>
          <button
            class="toggle-switch"
            class:on={settingsStore.wordWrap}
            onclick={toggleWordWrap}
            role="switch"
            aria-checked={settingsStore.wordWrap}
            aria-label="Toggle word wrap"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-title">Spell Check</span>
            <span class="setting-desc">Enable browser spell checking in the editor</span>
          </div>
          <button
            class="toggle-switch"
            class:on={settingsStore.spellCheck}
            onclick={toggleSpellCheck}
            role="switch"
            aria-checked={settingsStore.spellCheck}
            aria-label="Toggle spell check"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>
      </section>
    </div>
  </div>
</div>

<style>
  .settings-overlay {
    position: absolute;
    inset: 0;
    z-index: 50;
    background: var(--bg-base);
    display: flex;
    justify-content: center;
    overflow-y: auto;
  }

  .settings-page {
    width: 100%;
    max-width: 640px;
    padding: 24px 32px;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .settings-header h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 16px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius);
    margin-bottom: 4px;
    gap: 16px;
  }

  .setting-item:first-of-type {
    border-radius: var(--radius) var(--radius) 2px 2px;
  }
  .setting-item:last-of-type {
    border-radius: 2px 2px var(--radius) var(--radius);
    margin-bottom: 0;
  }
  .setting-item:only-of-type {
    border-radius: var(--radius);
  }

  .setting-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .setting-title {
    font-size: 14px;
    font-weight: 400;
    color: var(--text-primary);
  }

  .setting-desc {
    font-size: 12px;
    color: var(--text-secondary);
  }

  /* Theme buttons */
  .theme-buttons {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .theme-btn {
    padding: 6px 16px;
    border: 1px solid var(--border-control);
    background: var(--bg-card);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-ui);
  }
  .theme-btn:hover {
    background: var(--bg-hover);
  }
  .theme-btn.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  /* Select */
  .setting-select {
    padding: 6px 12px;
    border: 1px solid var(--border-control);
    background: var(--bg-card);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    min-width: 160px;
  }

  /* Font size control */
  .font-size-control {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .size-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-control);
    background: var(--bg-card);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-ui);
  }
  .size-btn:hover {
    background: var(--bg-hover);
  }

  .size-input {
    width: 48px;
    height: 28px;
    border: 1px solid var(--border-control);
    background: var(--bg-card);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    text-align: center;
    font-size: 13px;
    font-family: var(--font-ui);
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .size-input::-webkit-inner-spin-button,
  .size-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }

  /* Toggle switch */
  .toggle-switch {
    width: 40px;
    height: 20px;
    border-radius: 10px;
    border: 1px solid var(--border-control);
    background: var(--bg-active);
    cursor: pointer;
    position: relative;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .toggle-switch.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: transform 0.15s, background 0.15s;
  }
  .toggle-switch.on .toggle-thumb {
    transform: translateX(20px);
    background: var(--accent-text);
  }
</style>
