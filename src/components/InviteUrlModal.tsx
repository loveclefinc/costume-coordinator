import { useCallback, useEffect, useState } from 'react'
import { copyTextToClipboard, canUseWebShare, shareText } from '../utils/copy-to-clipboard'
import '../styles/InviteUrlModal.css'

export type InviteUrlModalVariant = 'created' | 'share'

interface InviteUrlModalProps {
  inviteUrl: string
  eventName?: string
  variant?: InviteUrlModalVariant
  showAdminWarning?: boolean
  onClose: () => void
}

export default function InviteUrlModal({
  inviteUrl,
  eventName,
  variant = 'share',
  showAdminWarning = variant === 'created',
  onClose,
}: InviteUrlModalProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(inviteUrl)
    setCopyState(ok ? 'success' : 'error')
    if (ok) {
      window.setTimeout(() => setCopyState('idle'), 2500)
    }
  }, [inviteUrl])

  const handleShare = useCallback(async () => {
    const title = eventName ? `衣装提出: ${eventName}` : '衣装提出の招待'
    await shareText(title, '以下のURLから衣装写真を提出してください。', inviteUrl)
  }, [eventName, inviteUrl])

  const title =
    variant === 'created' ? 'オンラインイベントを作成しました' : '招待 URL'

  return (
    <div
      className="invite-url-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="invite-url-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-url-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="invite-url-dialog-header">
          <h2 id="invite-url-modal-title">{title}</h2>
          <button
            type="button"
            className="invite-url-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="invite-url-body">
          {showAdminWarning && (
            <p className="invite-url-warning">
              管理者トークンはこの端末にのみ保存されます。紛失すると再発行できません。
            </p>
          )}

          <p className="invite-url-label">参加者に送る招待 URL（タップでコピー）</p>
          <button
            type="button"
            className={`invite-url-tap-zone${copyState === 'success' ? ' copied' : ''}`}
            onClick={() => void handleCopy()}
          >
            {inviteUrl}
          </button>
          <p className="invite-url-hint">LINE などに貼り付けて共有してください</p>

          <div className="invite-url-actions">
            <button
              type="button"
              className={`invite-url-copy-btn${copyState === 'success' ? ' success' : ''}`}
              onClick={() => void handleCopy()}
            >
              {copyState === 'success' ? '✓ コピーしました' : '招待 URL をコピー'}
            </button>

            {canUseWebShare() && (
              <button type="button" className="invite-url-share-btn" onClick={() => void handleShare()}>
                共有メニューを開く
              </button>
            )}

            {copyState === 'error' && (
              <p className="invite-url-copy-error">
                自動コピーできませんでした。上の URL を長押ししてコピーしてください。
              </p>
            )}

            <button type="button" className="invite-url-done-btn" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** react-router の location.state 用 */
export type InviteUrlModalLocationState = {
  showInviteModal?: boolean
  inviteUrl?: string
}
