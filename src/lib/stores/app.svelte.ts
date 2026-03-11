class AppState {
  zoomLevel = $state(100)
  showSettings = $state(false)
  showFindReplace = $state(false)
  findReplaceMode = $state<'find' | 'replace'>('find')
  showGoToLine = $state(false)
  characterCount = $state(0)

  zoomIn() {
    this.zoomLevel = Math.min(500, this.zoomLevel + 10)
  }
  zoomOut() {
    this.zoomLevel = Math.max(10, this.zoomLevel - 10)
  }
  zoomReset() {
    this.zoomLevel = 100
  }

  get editorFontSize(): number {
    return 14 * (this.zoomLevel / 100)
  }
}

export const appState = new AppState()
