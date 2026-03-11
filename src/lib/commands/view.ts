import { appState } from '../stores/app.svelte'
import { tabStore } from '../stores/tabs.svelte'

export function handleZoomIn() {
  appState.zoomIn()
}

export function handleZoomOut() {
  appState.zoomOut()
}

export function handleZoomReset() {
  appState.zoomReset()
}

export function handleToggleSourceView() {
  const tab = tabStore.activeTab
  if (!tab) return
  const newMode = tab.viewMode === 'wysiwyg' ? 'source' : 'wysiwyg'
  tabStore.setViewMode(tab.id, newMode)
}

export function handleToggleSettings() {
  appState.showSettings = !appState.showSettings
}
