import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './index.css'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/**
 * Single GoogleOAuthProvider at the root (outside StrictMode) so
 * google.accounts.id.initialize() is not called twice in React 18/19.
 */
function AppTree() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

const root = createRoot(document.getElementById('root'))

if (googleClientId) {
  root.render(
    <GoogleOAuthProvider clientId={googleClientId}>
      <StrictMode>
        <AppTree />
      </StrictMode>
    </GoogleOAuthProvider>,
  )
} else {
  root.render(
    <StrictMode>
      <AppTree />
    </StrictMode>,
  )
}
