// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import App from './App.jsx'
import './index.css'

// Limpieza de los datos del antiguo modo simulado (localStorage), que
// incluían usuarios con contraseñas en texto plano. Los datos ahora viven
// solo en la API; en el navegador quedan únicamente el token y el tema.
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('stockbar_') && !['stockbar_token', 'stockbar_theme'].includes(k))
    .forEach((k) => localStorage.removeItem(k));
} catch {
  // localStorage no disponible (modo privado): no hay nada que limpiar.
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
