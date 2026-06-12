import { Link } from 'react-router-dom'
import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import type { CostumeThemeMatch } from '../utils/costume-theme-match'
import { formatThemeSummary } from '../utils/event-theme-ui'
import { COLOR_LABELS, PATTERN_LABELS, TONE_LABELS } from '../utils/event-theme-ui'
import './EventCostumeMatcher.css'

interface EventCostumeMatcherProps {
  matches: CostumeThemeMatch[]
  theme?: EventThemePreferencesPayload
  selectedCostumeId: string | null
  onSelect: (costumeId: string) => void
  disabled?: boolean
  costumesLoading?: boolean
}

export default function EventCostumeMatcher({
  matches,
  theme,
  selectedCostumeId,
  onSelect,
  disabled = false,
  costumesLoading = false,
}: EventCostumeMatcherProps) {
  if (costumesLoading) {
    return <p className="event-costume-matcher-loading">登録衣装を読み込み中…</p>
  }

  if (matches.length === 0) {
    return (
      <div className="event-costume-matcher-empty">
        <p>登録されている衣装がありません。</p>
        <p>
          先に<Link to="/costumes/add">衣装を登録</Link>してから、この画面に戻って提出してください。
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
          <p className="event-costume-matcher-lead">
            登録済みの衣装から、テーマに合う順に並べています。提出する衣装を選んでください。
          </p>
        </div>
      )}

      <div className="event-costume-matcher-grid">
        {matches.map((match, index) => {
          const { costume, scorePercent, reasons } = match
          const selected = selectedCostumeId === costume.id
          const colorLabel = costume.colors
            .map((c) => COLOR_LABELS[c] ?? c)
            .slice(0, 2)
            .join('・')

          return (
            <button
              key={costume.id}
              type="button"
              className={`event-costume-card${selected ? ' selected' : ''}`}
              disabled={disabled}
              onClick={() => onSelect(costume.id)}
            >
              <div className="event-costume-card-rank">
                {index === 0 && theme ? 'おすすめ' : `${index + 1}位`}
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

function normalizePatternLabel(pattern: string): string {
  return pattern === 'solid' ? 'plain' : pattern
}
