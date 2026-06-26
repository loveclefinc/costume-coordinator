import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCostumes } from '../hooks/useCostumes'
import { useAppUi } from '../contexts/AppUiContext'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import {
  COLOR_LABELS,
  COSTUME_TYPE_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  TONE_LABELS,
  costumeSearchLabels,
  searchWardrobeCostumes,
} from '../utils/costume-search'
import './Costumes.css'

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value.toLowerCase()] ?? value
}

const QUICK_SEARCHES = ['無地', '柄', '花柄', '青系', 'タキシード', 'Aライン']

export default function Costumes() {
  const { confirm } = useAppUi()
  const { costumes, loading, error, deleteCostume } = useCostumes()
  const [filter, setFilter] = useState('')

  const searchResults = searchWardrobeCostumes(costumes, filter)
  const filteredCostumes = searchResults.map((result) => result.costume)
  const resultById = new Map(searchResults.map((result) => [result.costume.id, result]))

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
          placeholder="例: 無地 / 柄 / 青系 / タキシード"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
          aria-label="自分の衣装を探す"
        />
        <div className="quick-searches" aria-label="よく使う探し方">
          {QUICK_SEARCHES.map((word) => (
            <button
              key={word}
              type="button"
              className={`quick-search-chip${filter === word ? ' active' : ''}`}
              onClick={() => setFilter(word)}
            >
              {word}
            </button>
          ))}
          {filter && (
            <button
              type="button"
              className="quick-search-clear"
              onClick={() => setFilter('')}
            >
              解除
            </button>
          )}
        </div>
        <p className="search-result-count">
          {filter.trim()
            ? `${filteredCostumes.length} / ${costumes.length} 件`
            : `全 ${costumes.length} 件`}
        </p>
      </div>

      {filteredCostumes.length === 0 ? (
        <div className="empty-state">
          {costumes.length === 0 ? (
            <>
              <p>衣装がまだ登録されていません</p>
              <Link to="/costumes/add" className="cta-link">
                最初の衣装を追加する
              </Link>
            </>
          ) : (
            <>
              <p>条件に合う衣装が見つかりません</p>
              <button
                type="button"
                className="cta-link cta-link-button"
                onClick={() => setFilter('')}
              >
                検索を解除する
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="costumes-grid">
          {filteredCostumes.map((costume) => {
            const result = resultById.get(costume.id)
            const attributes = costumeSearchLabels(costume).filter((label) => label !== costume.name)
            return (
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
                  {filter.trim() && result && result.matchedLabels.length > 0 && (
                    <div className="matched-labels" aria-label="一致した条件">
                      {result.matchedLabels.slice(0, 4).map((label) => (
                        <span key={label} className="matched-label">{label}</span>
                      ))}
                    </div>
                  )}
                  <div className="costume-details">
                    {costume.type && (
                      <div className="detail-item">
                        <span className="label">種類:</span>
                        <span className="type-tag">{labelFor(COSTUME_TYPE_LABELS, costume.type)}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <span className="label">色:</span>
                      <div className="colors">
                        {normalizeCostumeColors(costume.colors).map((color) => (
                          <span
                            key={color}
                            className="color-tag"
                            style={{ backgroundColor: color }}
                            title={labelFor(COLOR_LABELS, color)}
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
                    {attributes.length > 0 && (
                      <div className="searchable-attributes" aria-label="検索できる属性">
                        {attributes.slice(0, 8).map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    )}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
