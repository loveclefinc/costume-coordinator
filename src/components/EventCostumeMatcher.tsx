import { Link } from 'react-router-dom'
import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import type { CostumeThemeMatch } from '../utils/costume-theme-match'
import { formatThemeSummary } from '../utils/event-theme-ui'
import { COLOR_LABELS, PATTERN_LABELS, TONE_LABELS } from '../utils/event-theme-ui'
import './EventCostumeMatcher.css'

interface EventCostumeMatcherProps {
  picked: CostumeThemeMatch[]
  theme?: EventThemePreferencesPayload
  costumesLoading?: boolean
  status?: 'idle' | 'picking' | 'submitting' | 'done'
}

export default function EventCostumeMatcher({
  picked,
  theme,
  costumesLoading = false,
  status = 'idle',
}: EventCostumeMatcherProps) {
  if (costumesLoading || status === 'picking') {
    return <p className="event-costume-matcher-loading">登録衣装からイベントに合う衣装を選出しています…</p>
  }

  if (picked.length === 0) {
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
          ? '以下の衣装が自動選出され、代表者へ提出されました。'
          : status === 'submitting'
            ? '選出した衣装を提出しています…'
            : '登録衣装の中から、イベントのテーマに合う衣装を自動選出しました。'}
      </p>

      <div className="event-costume-matcher-grid">
        {picked.map((match, index) => {
          const { costume, scorePercent, reasons } = match
          const colorLabel = costume.colors
            .map((c) => COLOR_LABELS[c] ?? c)
            .slice(0, 2)
            .join('・')

          return (
            <article key={costume.id} className="event-costume-card event-costume-card--readonly">
              <div className="event-costume-card-rank">
                {index === 0 ? '自動選出' : `候補 ${index + 1}`}
                <span className="event-costume-card-score">{scorePercent}%</span>
              </div>
              {costume.image ? (
                <img src={costume.image} alt={costume.name} className="event-costume-card-image" />
              ) : (
                <div className="event-costume-card-image placeholder">写真なし</div>
              )}
              <div className="event-costume-card-body">
                <strong>{costume.name}</strong>
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
