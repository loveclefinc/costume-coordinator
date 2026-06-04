import { useRef, useState } from 'react'
import {
  readCollaborationBundleFromFile,
  type CollaborationBundle,
} from '../utils/collaboration-bundle'
import './CollaborationFileImport.css'

interface Props {
  onBundleLoaded: (bundle: CollaborationBundle, fileName: string) => void | Promise<void>
  acceptLabel?: string
  hint?: string
}

export default function CollaborationFileImport({
  onBundleLoaded,
  acceptLabel = 'JSON ファイルを選ぶ',
  hint = '代表者から送られた .json を選択してください',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const bundle = await readCollaborationBundleFromFile(file)
      await onBundleLoaded(bundle, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="collab-import">
      <p className="collab-import-hint">{hint}</p>
      {error && <p className="collab-import-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="collab-import-input"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="collab-import-button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? '読み込み中…' : acceptLabel}
      </button>
    </div>
  )
}
