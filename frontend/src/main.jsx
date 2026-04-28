import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
      return (
        <div style={{ padding: '2rem', background: '#07090E', color: '#fff', fontFamily: 'system-ui, sans-serif', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>🎵</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>Disba Music</h1>
          {missingEnv ? (
            <>
              <p style={{ color: '#f87171', fontWeight: 'bold' }}>⚠️ Konfigurasi belum lengkap</p>
              <p style={{ color: '#9ca3af', textAlign: 'center', maxWidth: '400px', fontSize: '0.875rem' }}>
                Environment variables Supabase belum diisi di dashboard Vercel. Silakan tambahkan <code style={{background:'#1f2937',padding:'2px 6px',borderRadius:'4px'}}>VITE_SUPABASE_URL</code> dan <code style={{background:'#1f2937',padding:'2px 6px',borderRadius:'4px'}}>VITE_SUPABASE_ANON_KEY</code>.
              </p>
            </>
          ) : (
            <>
              <p style={{ color: '#f87171', fontWeight: 'bold' }}>Terjadi kesalahan</p>
              <pre style={{ color: '#6b7280', fontSize: '0.75rem', maxWidth: '500px', overflow: 'auto' }}>{this.state.error && this.state.error.toString()}</pre>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
