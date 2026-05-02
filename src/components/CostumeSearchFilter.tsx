import { useState, useMemo } from 'react'
import { Costume } from '../utils/storage'
import '../styles/CostumeSearchFilter.css'

interface CostumeSearchFilterProps {
  costumes: Costume[]
  onFilterChange: (filtered: Costume[]) => void
}

export default function CostumeSearchFilter({ costumes, onFilterChange }: CostumeSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTones, setSelectedTones] = useState<Set<string>>(new Set())
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set())
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // Get unique values for filters
  const uniqueTones = useMemo(() => {
    const tones = new Set<string>()
    costumes.forEach(c => {
      if (c.tone) tones.add(c.tone)
    })
    return Array.from(tones).sort()
  }, [costumes])

  const uniquePatterns = useMemo(() => {
    const patterns = new Set<string>()
    costumes.forEach(c => {
      if (c.pattern) patterns.add(c.pattern)
    })
    return Array.from(patterns).sort()
  }, [costumes])

  const uniqueColors = useMemo(() => {
    const colors = new Set<string>()
    costumes.forEach(c => {
      if (c.colors?.primary) colors.add(c.colors.primary)
    })
    return Array.from(colors).sort()
  }, [costumes])

  // Filter costumes based on selected criteria
  const filteredCostumes = useMemo(() => {
    return costumes.filter(costume => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesName = costume.name?.toLowerCase().includes(query)
        const matchesTags = costume.tags?.some(tag => tag.toLowerCase().includes(query))
        if (!matchesName && !matchesTags) return false
      }

      // Tone filter
      if (selectedTones.size > 0) {
        if (!costume.tone || !selectedTones.has(costume.tone)) return false
      }

      // Pattern filter
      if (selectedPatterns.size > 0) {
        if (!costume.pattern || !selectedPatterns.has(costume.pattern)) return false
      }

      // Color filter
      if (selectedColors.size > 0) {
        if (!costume.colors?.primary || !selectedColors.has(costume.colors.primary)) return false
      }

      return true
    })
  }, [costumes, searchQuery, selectedTones, selectedPatterns, selectedColors])

  // Notify parent of filtered results
  useMemo(() => {
    onFilterChange(filteredCostumes)
  }, [filteredCostumes, onFilterChange])

  const handleToggleTone = (tone: string) => {
    const newTones = new Set(selectedTones)
    if (newTones.has(tone)) {
      newTones.delete(tone)
    } else {
      newTones.add(tone)
    }
    setSelectedTones(newTones)
  }

  const handleTogglePattern = (pattern: string) => {
    const newPatterns = new Set(selectedPatterns)
    if (newPatterns.has(pattern)) {
      newPatterns.delete(pattern)
    } else {
      newPatterns.add(pattern)
    }
    setSelectedPatterns(newPatterns)
  }

  const handleToggleColor = (color: string) => {
    const newColors = new Set(selectedColors)
    if (newColors.has(color)) {
      newColors.delete(color)
    } else {
      newColors.add(color)
    }
    setSelectedColors(newColors)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedTones(new Set())
    setSelectedPatterns(new Set())
    setSelectedColors(new Set())
  }

  const activeFilterCount = selectedTones.size + selectedPatterns.size + selectedColors.size

  const toneLabels: Record<string, string> = {
    pastel: 'パステル',
    vivid: '鮮やか',
    dark: '濃い',
    neutral: '落ち着いた',
  }

  const patternLabels: Record<string, string> = {
    solid: '無地',
    floral: '花柄',
    stripe: 'ストライプ',
    dot: 'ドット',
    check: 'チェック',
    geometric: '幾何学模様',
    animal: 'アニマル柄',
    other: 'その他',
  }

  return (
    <div className="costume-search-filter">
      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="衣装名またはタグで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          title="フィルターを表示/非表示"
        >
          🔍 {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filters-panel">
          {/* Tone Filter */}
          {uniqueTones.length > 0 && (
            <div className="filter-section">
              <h3>トーン</h3>
              <div className="filter-options">
                {uniqueTones.map(tone => (
                  <label key={tone} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedTones.has(tone)}
                      onChange={() => handleToggleTone(tone)}
                    />
                    <span>{toneLabels[tone] || tone}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Filter */}
          {uniquePatterns.length > 0 && (
            <div className="filter-section">
              <h3>柄</h3>
              <div className="filter-options">
                {uniquePatterns.map(pattern => (
                  <label key={pattern} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedPatterns.has(pattern)}
                      onChange={() => handleTogglePattern(pattern)}
                    />
                    <span>{patternLabels[pattern] || pattern}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Color Filter */}
          {uniqueColors.length > 0 && (
            <div className="filter-section">
              <h3>色</h3>
              <div className="filter-colors">
                {uniqueColors.map(color => (
                  <label key={color} className="filter-color-option">
                    <input
                      type="checkbox"
                      checked={selectedColors.has(color)}
                      onChange={() => handleToggleColor(color)}
                    />
                    <span
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                    <span className="color-value">{color}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <button className="clear-filters-btn" onClick={handleClearFilters}>
              フィルターをクリア
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="results-info">
        {filteredCostumes.length === costumes.length ? (
          <p>全 {costumes.length} 件の衣装</p>
        ) : (
          <p>
            {filteredCostumes.length} / {costumes.length} 件の衣装
          </p>
        )}
      </div>
    </div>
  )
}
