import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCostumes } from '../hooks/useCostumes'
import { useAppUi } from '../contexts/AppUiContext'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import './Costumes.css'

const TONE_LABELS: Record<string, string> = {
  pastel: 'パステル',
  vivid: '鮮やか',
  dark: '濃い',
  neutral: '落ち着いた',
  warm: '暖色',
  cool: '寒色',
}

const PATTERN_LABELS: Record<string, string> = {
  plain: '無地',
  solid: '無地',
  floral: '花柄',
  stripe: 'ストライプ',
  striped: 'ストライプ',
  dot: 'ドット',
  check: 'チェック',
  geometric: '幾何学模様',
  animal: 'アニマル柄',
  other: 'その他',
}

const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  fall: '秋',
  winter: '冬',
}

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value.toLowerCase()] ?? value
}

export default function Costumes() {
  const { confirm } = useAppUi()
  const { costumes, loading, error, deleteCostume } = useCostumes()
  const [filter, setFilter] = useState('')

  const filteredCostumes = costumes.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      message: 'この衣装を削除しますか？',
      confirmLabel: '削除する',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteCostume(id)
    } catch (err) {
      console.error('Failed to delete costume:', err)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="costumes-page">
      <div className="costumes-header">
        <h1>👗 衣装管理</h1>
        <Link to="/costumes/add" className="add-button">
          + 新しい衣装を追加
        </Link>
      </div>

      {error && (
        <div className="error-message">
          エラー: {error}
        </div>
      )}

      <div className="search-box">
        <input
          type="text"
          placeholder="衣装を検索..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredCostumes.length === 0 ? (
        <div className="empty-state">
          <p>衣装がまだ登録されていません</p>
          <Link to="/costumes/add" className="cta-link">
            最初の衣装を追加する
          </Link>
        </div>
      ) : (
        <div className="costumes-grid">
          {filteredCostumes.map((costume) => (
            <div key={costume.id} className="costume-card">
              {costume.image && (
                <img
                  src={costume.image}
                  alt={costume.name}
                  className="costume-image"
                />
              )}
              <div className="costume-info">
                <h3>{costume.name}</h3>
                <div className="costume-details">
                  <div className="detail-item">
                    <span className="label">色:</span>
                    <div className="colors">
                      {normalizeCostumeColors(costume.colors).map((color) => (
                        <span
                          key={color}
                          className="color-tag"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="label">トーン:</span>
                    <span className="tone-tag">{labelFor(TONE_LABELS, costume.tone)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">柄:</span>
                    <span className="pattern-tag">{labelFor(PATTERN_LABELS, costume.pattern)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">季節:</span>
                    <div className="seasons">
                      {(Array.isArray(costume.season) && costume.season.length > 0
                        ? costume.season
                        : ['none']
                      ).map((s) => (
                        <span key={s} className="season-tag">
                          {s === 'none' ? '指定なし' : labelFor(SEASON_LABELS, s)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="costume-actions">
                <Link to={`/costumes/${costume.id}`} className="action-button edit">
                  編集
                </Link>
                <button
                  onClick={() => handleDelete(costume.id)}
                  className="action-button delete"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
