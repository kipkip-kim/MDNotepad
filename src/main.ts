import App from './App.svelte'
import { mount } from 'svelte'
import { settingsStore } from './lib/stores/settings.svelte'
import './styles/fluent-tokens.css'
import './styles/editor.css'
import './styles/scrollbar.css'

// Load persisted settings (theme, font, etc.) before mounting app
settingsStore.load().then(() => {
  mount(App, { target: document.getElementById('app')! })
})
