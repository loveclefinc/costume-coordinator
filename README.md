# Costume Coordinator PWA

Progressive Web App for costume coordination and event management.

## Features
- Costume management with color and pattern classification
- Event management with participant coordination
- Intelligent costume assignment optimization
- Usage history tracking
- Offline support with Service Worker
- iOS/Android home screen installation

## Live Demo
https://loveclefinc.github.io/costume-coordinator/

## Installation

### iOS (Safari)
1. Open https://loveclefinc.github.io/costume-coordinator/ in Safari
2. Tap Share → Add to Home Screen

### Android (Chrome)
1. Open https://loveclefinc.github.io/costume-coordinator/ in Chrome
2. Tap Menu → Install App

## Technology
- React 19 + TypeScript
- Vite
- IndexedDB for local storage
- Cloud sync: Google Drive & Dropbox (OAuth 2.0 PKCE, serverless)
- Service Worker for offline support
- GitHub Pages hosting

## Cloud sync setup

1. Copy `.env.example` to `.env` and set public OAuth client IDs.
2. Follow [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md) and [docs/DROPBOX_APP_SETUP.md](docs/DROPBOX_APP_SETUP.md).
3. Deploy with [docs/GITHUB_PAGES_DEPLOY.md](docs/GITHUB_PAGES_DEPLOY.md).
4. Architecture: [docs/CLOUD_SYNC_ARCHITECTURE.md](docs/CLOUD_SYNC_ARCHITECTURE.md) · Security: [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)

