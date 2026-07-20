import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './lib/store'
ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <App/>
  </AppProvider>
)