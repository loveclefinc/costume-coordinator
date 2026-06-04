import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { copyTextToClipboard, canUseWebShare, shareText } from '../utils/copy-to-clipboard'
import '../styles/InviteUrlModal.css'

export type InviteUrlModalVariant = 'created' | 'share'

interface InviteUrlModalProps {
  inviteUrl: string
  eventName?: string
  eventId?: string
  adminToken?: string
  /** 代表者の写真提出ページ（招待URLと同等の参加導線） */
  hostParticipateUrl?: string
  variant?: InviteUrlModalVariant
  showAdminWarning?: boolean
  onClose: () => void
}

export default function InviteUrlModal({
  inviteUrl,
  eventName,
  eventId,
  adminToken,
  hostParticipateUrl,
  variant = 'share',
  showAdminWarning = variant === 'created',
  onClose,
}: InviteUrlModalProps) {
  const navigate = useNavigate()
  const [inviteCopy, setInviteCopy] = useState<'idle' | 'success' | 'error'>('idle')
  const [adminCopy, setAdminCopy] = useState<'idle' | 'success' | 'error'>('idle')

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

  const handleCopyInvite = useCallback(async () => {
    const ok = await copyTextToClipboard(inviteUrl)
    setInviteCopy(ok ? 'success' : 'error')
    if (ok) window.setTimeout(() => setInviteCopy('idle'), 2500)
  }, [inviteUrl])

  const handleCopyAdmin = useCallback(async () => {
    if (!adminToken) return
    const ok = await copyTextToClipboard(adminToken)
    setAdminCopy(ok ? 'success' : 'error')
    if (ok) window.setTimeout(() => setAdminCopy('idle'), 2500)
  }, [adminToken])

  const handleShare = useCallback(async () => {
    const title = eventName ? `衣装提出: ${eventName}` : '衣装提出の招待'
    await shareText(title, '以下のURLから衣装写真を提出してください。', inviteUrl)
  }, [eventName, inviteUrl])

  const openHostParticipate = () => {
    if (hostParticipateUrl) {
      onClose()
      navigate(hostParticipateUrl)
    }
  }

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
          <button type="button" className="invite-url-close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        <div className="invite-url-body">
          {variant === 'created' && (
            <p className="invite-url-success-note">
              代表者はサーバーに登録済みです。下のボタンから写真を提出できます（招待 URL を開く必要はありません）。
            </p>
          )}

          {showAdminWarning && adminToken && (
            <div className="invite-url-admin-block">
              <p className="invite-url-warning">
                <strong>管理者トークン</strong>は再表示できません。今すぐコピーしてパスワード管理アプリ等に保存してください。
              </p>
              <button
                type="button"
                className={`invite-url-admin-copy${adminCopy === 'success' ? ' success' : ''}`}
                onClick={() => void handleCopyAdmin()}
              >
                {adminCopy === 'success' ? '✓ 管理者トークンをコピーしました' : '管理者トークンをコピー（バックアップ）'}
              </button>
            </div>
          )}

          <p className="invite-url-label">参加者に送る招待 URL（タップでコピー）</p>
          <button
            type="button"
            className={`invite-url-tap-zone${inviteCopy === 'success' ? ' copied' : ''}`}
            onClick={() => void handleCopyInvite()}
          >
            {inviteUrl}
          </button>
          <p className="invite-url-hint">LINE などに貼り付けて共有してください</p>

          <div className="invite-url-actions">
            {hostParticipateUrl && variant === 'created' && (
              <button type="button" className="invite-url-host-submit-btn" onClick={openHostParticipate}>
                代表者として写真を提出
              </button>
            )}

            <button
              type="button"
              className={`invite-url-copy-btn${inviteCopy === 'success' ? ' success' : ''}`}
              onClick={() => void handleCopyInvite()}
            >
              {inviteCopy === 'success' ? '✓ コピーしました' : '招待 URL をコピー'}
            </button>

            {canUseWebShare() && (
              <button type="button" className="invite-url-share-btn" onClick={() => void handleShare()}>
                共有メニューを開く
              </button>
            )}

            {inviteCopy === 'error' && (
              <p className="invite-url-copy-error">
                自動コピーできませんでした。上の URL を長押ししてコピーしてください。
              </p>
            )}

            <button type="button" className="invite-url-done-btn" onClick={onClose}>
              {eventId ? 'イベント詳細へ' : '閉じる'}
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
  adminToken?: string
  hostParticipateUrl?: string
}
