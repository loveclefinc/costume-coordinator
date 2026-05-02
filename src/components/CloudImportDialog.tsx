import { useState } from 'react'
import {
  authorizeGoogleDrive,
  authorizeGooglePhotos,
  authorizeDropbox,
  searchGoogleDriveImages,
  searchGooglePhotosImages,
  searchDropboxImages,
  importCostumeFromCloudFile,
  CloudFile,
} from '../utils/cloud-import'
import { storage } from '../utils/storage'
import '../styles/CloudImportDialog.css'

interface CloudImportDialogProps {
  onClose: () => void
  onImportSuccess: (count: number) => void
}

type CloudProvider = 'google-drive' | 'google-photos' | 'dropbox'

export default function CloudImportDialog({ onClose, onImportSuccess }: CloudImportDialogProps) {
  const [provider, setProvider] = useState<CloudProvider | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [files, setFiles] = useState<CloudFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAuthorize = async (selectedProvider: CloudProvider) => {
    setIsAuthorizing(true)
    setError('')

    try {
      let token: string

      switch (selectedProvider) {
        case 'google-drive':
          token = await authorizeGoogleDrive()
          break
        case 'google-photos':
          token = await authorizeGooglePhotos()
          break
        case 'dropbox':
          token = await authorizeDropbox()
          break
      }

      setProvider(selectedProvider)
      await handleSearch(selectedProvider)
    } catch (err) {
      setError(err instanceof Error ? err.message : '認可に失敗しました')
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleSearch = async (searchProvider?: CloudProvider) => {
    const targetProvider = searchProvider || provider
    if (!targetProvider) return

    setIsSearching(true)
    setError('')

    try {
      let results: CloudFile[] = []

      switch (targetProvider) {
        case 'google-drive':
          results = await searchGoogleDriveImages(searchQuery)
          break
        case 'google-photos':
          results = await searchGooglePhotosImages(searchQuery)
          break
        case 'dropbox':
          results = await searchDropboxImages(searchQuery)
          break
      }

      setFiles(results)

      if (results.length === 0) {
        setError('画像が見つかりませんでした')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)))
    }
  }

  const handleImport = async () => {
    if (selectedFiles.size === 0) {
      setError('ファイルを選択してください')
      return
    }

    setIsImporting(true)
    setError('')
    setSuccess('')

    try {
      const selectedFileList = files.filter(f => selectedFiles.has(f.id))
      let importedCount = 0

      for (const file of selectedFileList) {
        try {
          const costume = await importCostumeFromCloudFile(file, file.name, {
            colors: [],
            tone: 'neutral',
            pattern: 'solid',
            season: ['spring', 'summer', 'autumn', 'winter'],
          })

          await storage.addCostume({
            id: `costume-${Date.now()}-${Math.random()}`,
            name: costume.name,
            image: costume.image,
            colors: costume.colors,
            tone: costume.tone,
            pattern: costume.pattern,
            season: costume.season,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })

          importedCount++
        } catch (err) {
          console.error(`Failed to import ${file.name}:`, err)
        }
      }

      setSuccess(`${importedCount}個の衣装をインポートしました`)
      onImportSuccess(importedCount)

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'インポートに失敗しました')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="cloud-import-overlay">
      <div className="cloud-import-dialog">
        <div className="dialog-header">
          <h2>☁️ クラウドストレージからインポート</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {!provider ? (
          <div className="provider-selection">
            <p className="selection-subtitle">インポート元を選択してください</p>

            <div className="provider-buttons">
              <button
                className="provider-button google-drive"
                onClick={() => handleAuthorize('google-drive')}
                disabled={isAuthorizing}
              >
                <span className="provider-icon">🔵</span>
                <span className="provider-name">Google Drive</span>
                <span className="provider-desc">ドライブから画像をインポート</span>
              </button>

              <button
                className="provider-button google-photos"
                onClick={() => handleAuthorize('google-photos')}
                disabled={isAuthorizing}
              >
                <span className="provider-icon">🎨</span>
                <span className="provider-name">Google Photos</span>
                <span className="provider-desc">フォトライブラリからインポート</span>
              </button>

              <button
                className="provider-button dropbox"
                onClick={() => handleAuthorize('dropbox')}
                disabled={isAuthorizing}
              >
                <span className="provider-icon">📦</span>
                <span className="provider-name">Dropbox</span>
                <span className="provider-desc">Dropboxから画像をインポート</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="file-selection">
            <div className="search-section">
              <input
                type="text"
                placeholder="画像を検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                className="search-input"
              />
              <button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="search-button"
              >
                {isSearching ? '検索中...' : '検索'}
              </button>
              <button onClick={() => setProvider(null)} className="back-button">
                戻る
              </button>
            </div>

            {files.length > 0 && (
              <div className="file-list-header">
                <label className="select-all-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span>
                    すべて選択 ({selectedFiles.size}/{files.length})
                  </span>
                </label>
              </div>
            )}

            <div className="file-list">
              {files.length === 0 ? (
                <div className="empty-state">
                  <p>画像が見つかりません</p>
                </div>
              ) : (
                files.map(file => (
                  <div
                    key={file.id}
                    className={`file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}
                    onClick={() => handleSelectFile(file.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => handleSelectFile(file.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">
                        {new Date(file.createdTime).toLocaleDateString('ja-JP')} •{' '}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedFiles.size > 0 && (
              <div className="import-section">
                <button
                  onClick={handleImport}
                  disabled={isImporting || selectedFiles.size === 0}
                  className="import-button"
                >
                  {isImporting ? 'インポート中...' : `${selectedFiles.size}個をインポート`}
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  )
}
