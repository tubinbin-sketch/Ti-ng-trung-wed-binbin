import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AppStoreProvider } from './context/AppStoreContext';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reasonText = String(
      (event.reason as { message?: string })?.message ?? event.reason ?? ''
    );
    if (reasonText.includes('WebSocket closed without opened')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </BrowserRouter>
);

