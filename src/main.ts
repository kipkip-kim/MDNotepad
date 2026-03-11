import App from './App.svelte'
import { mount } from 'svelte'
import './styles/fluent-tokens.css'
import './styles/editor.css'
import './styles/scrollbar.css'

const app = mount(App, { target: document.getElementById('app')! })

export default app
