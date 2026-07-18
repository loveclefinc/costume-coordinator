import { Link } from 'react-router-dom'
import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import type { CostumeThemeMatch } from '../utils/costume-theme-match'
import { formatThemeSummary } from '../utils/event-theme-ui'
import { COLOR_LABELS, PATTERN_LABELS, TONE_LABELS } from '../utils/event-theme-ui'
import type { Costume } from '../utils/storage'
import CostumePhotoMosaic from './CostumePhotoMosaic'
import './EventCostumeMatcher.css'

interface EventCostumeMatcherProps {
  picked: CostumeThemeMatch[]
  theme?: EventThemePreferencesPayload
  wardrobeCount?: number
  costumesLoading?: boolean
  status?: 'idle' | 'picking' | 'submitting' | 'done'
}

export function outfitCandidateBadge(
  costume: Pick<Costume, 'id' | 'componentCostumeIds' | 'componentCostumeNames'>,
): string | null {
  const componentCount = Math.max(
    costume.componentCostumeIds?.length ?? 0,
    costume.componentCostumeNames?.length ?? 0,
  )
  if (componentCount < 2) return null
  if (costume.id.startsWith('favorite-outfit:auto-')) return '自動提案コーデ'
  if (costume.id.startsWith('favorite-outfit:')) return '保存済みコーデ'
  return '完成コーデ'
}

export default function EventCostumeMatcher({
  picked,
  theme,
  wardrobeCount,
  costumesLoading = false,
  status = 'idle',
}: EventCostumeMatcherProps) {
  if (costumesLoading && picked.length === 0) {
    return <p className="event-costume-matcher-loading">登録した衣装・小物からイベントに合う候補を選出しています…</p>
  }

  if (status === 'picking' && picked.length === 0) {
    return <p className="event-costume-matcher-loading">登録した衣装・小物からイベントに合う候補を選出しています…</p>
  }

  if (picked.length === 0) {
    if (wardrobeCount != null && wardrobeCount > 0) {
      return (
        <div className="event-costume-matcher-empty">
          <p>登録衣装 {wardrobeCount} 件のうち、提出できる候補がありません。</p>
          <p>
            衣装の種類・写真、テーマ設定、使用履歴の除外期間を確認してください。トップスや小物だけの場合は、合わせるボトムスやベース衣装を
            <Link to="/costumes/add"> 登録 </Link>
            してから再試行してください。
          </p>
        </div>
      )
    }

    return (
      <div className="event-costume-matcher-empty">
        <p>登録されている衣装がありません。</p>
        <p>
          先に<Link to="/costumes/add">衣装を登録</Link>してから、この画面に戻ってください。
        </p>
      </div>
    )
  }

  return (
    <div className="event-costume-matcher">
      {theme && (
        <div className="event-costume-matcher-theme">
          <h4>イベントのテーマ</h4>
          <ul>
            {formatThemeSummary(theme).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="event-costume-matcher-lead">
        {status === 'done'
          ? `テーマに合う候補 ${picked.length} 件を提出しました。これは仮の候補で、全員提出後にシステムが1組（単品または完成コーデ）を正式決定します。`
          : status === 'submitting'
            ? `候補 ${picked.length} 件を提出しています…`
            : `登録した単品衣装、保存済みコーデ、自動提案コーデから、テーマに合う候補を ${picked.length} 件選出しました（正式決定までは使用済み扱いにしません）。`}
      </p>
      <p className="event-costume-matcher-note">
        正式決定された単品またはコーデは使用履歴に記録され、設定した期間は次回候補から外れます。
      </p>

      <div className="event-costume-matcher-grid">
        {picked.map((match, index) => {
          const { costume, scorePercent, reasons } = match
          const candidateBadge = outfitCandidateBadge(costume)
          const colorLabel = costume.colors
            .map((c) => COLOR_LABELS[c] ?? c)
            .slice(0, 2)
            .join('・')

          return (
            <article key={costume.id} className="event-costume-card event-costume-card--readonly">
              <div className="event-costume-card-rank">
                {`候補 ${index + 1}`}
                <span className="event-costume-card-score">{scorePercent}%</span>
              </div>
              <CostumePhotoMosaic
                costume={costume}
                className="event-costume-card-image"
                priority={index === 0}
              />
              <div className="event-costume-card-body">
                <div className="event-costume-card-title">
                  <strong>{costume.name}</strong>
                  {candidateBadge && <span>{candidateBadge}</span>}
                </div>
                <p className="event-costume-card-meta">
                  {colorLabel && `${colorLabel} / `}
                  {TONE_LABELS[costume.tone] ?? costume.tone}
                  {' / '}
                  {PATTERN_LABELS[normalizePatternLabel(costume.pattern)] ?? costume.pattern}
                </p>
                <ul className="event-costume-card-reasons">
                  {reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function normalizePatternLabel(pattern: string): string {
  return pattern === 'solid' ? 'plain' : pattern
}
