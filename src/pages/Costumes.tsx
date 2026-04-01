import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCostumes } from '../hooks/useCostumes'
import './Costumes.css'

export default function Costumes() {
  const { costumes, loading, error, deleteCostume } = useCostumes()
  const [filter, setFilter] = useState('')

  const filteredCostumes = costumes.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (window.confirm('この衣装を削除しますか？')) {
      try {
        await deleteCostume(id)
      } catch (err) {
        console.error('Failed to delete costume:', err)
      }
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
                      {costume.colors.map((color) => (
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
                    <span className="tone-tag">{costume.tone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">柄:</span>
                    <span className="pattern-tag">{costume.pattern}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">季節:</span>
                    <div className="seasons">
                      {costume.season.map((s) => (
                        <span key={s} className="season-tag">{s}</span>
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
