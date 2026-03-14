import App from './App.svelte'
import { mount } from 'svelte'
import { settingsStore } from './lib/stores/settings.svelte'
import { restoreSession } from './lib/services/session'
import './styles/fluent-tokens.css'
import './styles/editor.css'
import './styles/scrollbar.css'
import './styles/print.css'

// Load persisted settings, restore session, then mount app.
// Always mount the app even if initialization fails.
settingsStore
  .load()
  .then(() => restoreSession())
  .catch((err) => console.error('Initialization error:', err))
  .finally(() => {
    mount(App, { target: document.getElementById('app')! })
  })
