import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.css'

import './data/especies.js'
import './data/sectores.js'
import './data/opa.js'
import './data/sectores_amerb.js'
import './data/botes.js'
import './data/operaciones.js'
import './data/perfiles.js'

import './components/toast.jsx'
import './components/modal.jsx'
import './components/app.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
