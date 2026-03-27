import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[BCTA] main.tsx executing...')

const rootEl = document.getElementById('root')!
console.log('[BCTA] root element found:', !!rootEl)

const root = createRoot(rootEl)
console.log('[BCTA] createRoot called, about to render...')

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

console.log('[BCTA] render() called')
