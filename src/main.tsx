import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { CloudSyncProvider } from './contexts/CloudSyncContext'
import { AppUiProvider } from './contexts/AppUiContext'
import './index.css'

// 旧ビルドがルート /sw.js を登録している場合は解除（vite-plugin-pwa が正しいパスで登録）
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const scriptUrl =
        registration.active?.scriptURL ??
        registration.installing?.scriptURL ??
        registration.waiting?.scriptURL ??
        ''
      if (scriptUrl.includes('/sw.js') && !scriptUrl.includes('/costume-coordinator/')) {
        void registration.unregister()
      }
    }
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CloudSyncProvider>
        <AppUiProvider>
          <BrowserRouter basename="/costume-coordinator">
            <App />
          </BrowserRouter>
        </AppUiProvider>
      </CloudSyncProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
