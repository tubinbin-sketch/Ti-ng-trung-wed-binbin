import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AppStoreProvider } from './context/AppStoreContext';
import { AppErrorBoundary } from './components/LazyErrorBoundary';
import './index.css';
import { purgeLegacyDemoData } from './utils/storageService';

import { registerSW } from 'virtual:pwa-register';

if (typeof window !== 'undefined') {
  // Remove sample data left by older versions before the app reads storage.
  purgeLegacyDemoData();
  registerSW({ immediate: true });

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
  <AppErrorBoundary>
    <BrowserRouter>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </BrowserRouter>
  </AppErrorBoundary>
);

