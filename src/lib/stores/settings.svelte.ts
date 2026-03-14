import { loadStore } from '../services/portable'

export type ThemeMode = 'light' | 'dark' | 'system'

class SettingsStore {
  theme = $state<ThemeMode>('system')
  wordWrap = $state(true)
  editorFontFamily = $state("'Cascadia Code', 'Consolas', 'Courier New', monospace")
  editorFontSize = $state(14)
  spellCheck = $state(false)

  private _loaded = false
  private _saving = false
  private _pendingSave = false
  private _saveTimer: ReturnType<typeof setTimeout> | null = null
  private _mediaQuery: MediaQueryList | null = null
  private _mediaListener: ((e: MediaQueryListEvent) => void) | null = null

  async load() {
    try {
      const store = await loadStore('settings.json')
      const theme = await store.get<ThemeMode>('theme')
      const wordWrap = await store.get<boolean>('wordWrap')
      const fontFamily = await store.get<string>('editorFontFamily')
      const fontSize = await store.get<number>('editorFontSize')
      const spellCheck = await store.get<boolean>('spellCheck')

      if (theme) this.theme = theme
      if (wordWrap !== null && wordWrap !== undefined) this.wordWrap = wordWrap
      if (fontFamily) this.editorFontFamily = fontFamily
      if (fontSize) this.editorFontSize = fontSize
      if (spellCheck !== null && spellCheck !== undefined) this.spellCheck = spellCheck
    } catch {
      // Use defaults on first run
    }

    this._loaded = true
    this.applyTheme()
  }

  async save() {
    if (!this._loaded) return
    if (this._saving) {
      this._pendingSave = true
      return
    }
    this._saving = true
    try {
      const store = await loadStore('settings.json')
      await store.set('theme', this.theme)
      await store.set('wordWrap', this.wordWrap)
      await store.set('editorFontFamily', this.editorFontFamily)
      await store.set('editorFontSize', this.editorFontSize)
      await store.set('spellCheck', this.spellCheck)
      await store.save()
    } catch {
      // Ignore save errors
    }
    this._saving = false
    if (this._pendingSave) {
      this._pendingSave = false
      this.save()
    }
  }

  debouncedSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => this.save(), 500)
  }

  applyTheme() {
    // Clean up old media listener
    if (this._mediaQuery && this._mediaListener) {
      this._mediaQuery.removeEventListener('change', this._mediaListener)
      this._mediaListener = null
    }

    if (this.theme === 'system') {
      this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = (dark: boolean) => {
        document.documentElement.classList.toggle('dark', dark)
      }
      apply(this._mediaQuery.matches)
      this._mediaListener = (e) => apply(e.matches)
      this._mediaQuery.addEventListener('change', this._mediaListener)
    } else {
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    }
  }
}

export const settingsStore = new SettingsStore()
