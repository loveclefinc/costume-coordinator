import { useCallback, useEffect, useState } from 'react'
import type { CloudProvider } from '../cloud/types'
import {
  searchCloudImages,
  downloadCloudImage,
  type CloudImageFile,
} from '../cloud/import/cloud-image-picker'
import {
  getCloudImageFolderHelp,
  getCloudImageFolderSteps,
} from '../cloud/import/cloud-import-help'
import '../styles/CloudImportDialog.css'

interface CostumeImageCloudPickerProps {
  provider: CloudProvider
  onClose: () => void
  onSelect: (dataUrl: string, fileName: string) => void
}

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  'google-drive': 'Google Drive',
  dropbox: 'Dropbox',
}

export default function CostumeImageCloudPicker({
  provider,
  onClose,
  onSelect,
}: CostumeImageCloudPickerProps) {
  const [files, setFiles] = useState<CloudImageFile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadImages = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const results = await searchCloudImages(provider, query)
      setFiles(results)
      if (results.length === 0) {
        setError('画像が見つかりませんでした')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の取得に失敗しました')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    void loadImages('')
  }, [loadImages])

  const handleSelect = async (file: CloudImageFile) => {
    setDownloading(file.id)
    setError('')
    try {
      const dataUrl = await downloadCloudImage(provider, file)
      onSelect(dataUrl, file.name)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像のダウンロードに失敗しました')
    } finally {
      setDownloading(null)
    }
  }

  const providerLabel = PROVIDER_LABELS[provider]

  return (
    <div className="cloud-import-overlay" onClick={onClose}>
      <div className="cloud-import-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>☁️ {providerLabel} から画像を選択</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="file-selection">
          <p className="selection-subtitle">{getCloudImageFolderHelp(provider)}</p>
          <div className="cloud-import-folder-help">
            <p className="cloud-import-folder-help-title">画像の置き場所</p>
            <ol className="cloud-import-folder-steps">
              {getCloudImageFolderSteps(provider).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="search-section">
            <input
              type="text"
              placeholder="ファイル名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void loadImages(searchQuery)}
              className="search-input"
            />
            <button
              type="button"
              onClick={() => void loadImages(searchQuery)}
              disabled={loading}
              className="search-button"
            >
              {loading ? '検索中...' : '検索'}
            </button>
          </div>

          <div className="file-list">
            {loading && files.length === 0 ? (
              <div className="empty-state">
                <p>読み込み中...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="empty-state">
                <p>画像が見つかりません</p>
                <p className="empty-state-hint">
                  {provider === 'dropbox'
                    ? 'Dropbox の「アプリ」→「CostumeCoordinator」に画像を置いてから、再検索してください。'
                    : 'Google Drive の「CostumeCoordinator」フォルダに画像を置いてから、再検索してください。'}
                </p>
              </div>
            ) : (
              files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={`file-item${downloading === file.id ? ' selected' : ''}`}
                  onClick={() => void handleSelect(file)}
                  disabled={!!downloading}
                >
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      {file.modifiedAt
                        ? new Date(file.modifiedAt).toLocaleDateString('ja-JP')
                        : '—'}
                      {file.size > 0 ? ` • ${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </div>
                  </div>
                  {downloading === file.id && (
                    <span className="file-meta">取得中...</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  )
}
