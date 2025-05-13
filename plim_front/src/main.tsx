import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root')!;
root.className = 'bp5-dark';

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
