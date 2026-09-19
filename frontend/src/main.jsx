import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { Web3Provider } from './context/Web3Context.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Web3Provider>
          <App />
        </Web3Provider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
