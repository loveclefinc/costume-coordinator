import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FavoriteCombinationComposer from '../components/FavoriteCombinationComposer'
import { useCostumes } from '../hooks/useCostumes'
import { useAppUi } from '../contexts/AppUiContext'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import { themeColorNamesFrom } from '../utils/theme-colors'
import type { Costume, FavoriteCombination } from '../utils/storage'
import {
  COLOR_LABELS,
  COSTUME_TYPE_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  TONE_LABELS,
  costumeFeatureLabels,
  costumeSearchLabels,
  searchWardrobeCostumes,
  wardrobeLabelsMatchQuery,
} from '../utils/costume-search'
import {
  buildAutoOutfitSuggestions,
  createFavoriteCombination,
  removeFavoriteCombination,
  resolveFavoriteCombinations,
  searchFavoriteCombinations,
  upsertFavoriteCombination,
  validateFavoriteCombination,
  type AutoOutfitSuggestion,
  type FavoriteCombinationInput,
  type ResolvedFavoriteCombination,
} from '../utils/favorite-combinations'
import './Costumes.css'

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value.toLowerCase()] ?? value
}

const QUICK_SEARCHES = ['自動提案', 'お気に入り', '無地', '柄', '花柄', '青系', 'タキシード', 'Aライン']

function WardrobeImage({ costume, priority = false }: { costume: Costume; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (!costume.image || failed) {
    return (
      <div className="wardrobe-costume-image wardrobe-costume-image-placeholder" role="img" aria-label={`${costume.name}は写真なし`}>
        写真なし
      </div>
    )
  }

  return (
    <img
      src={costume.image}
      alt={`${costume.name}の衣装写真`}
      className="wardrobe-costume-image"
      width={480}
      height={360}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
    />
  )
}

function CombinationThumbnail({ costume }: { costume: Costume }) {
  const [failed, setFailed] = useState(false)
  return costume.image && !failed ? (
    <img
      src={costume.image}
      alt={`${costume.name}の写真`}
      width={180}
      height={180}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="favorite-combination-card-placeholder" role="img" aria-label={`${costume.name}は写真なし`}>
      写真なし
    </div>
  )
}

function FavoriteCombinationCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ResolvedFavoriteCombination
  onEdit: () => void
  onDelete: () => void
}) {
  const items = [entry.owner, ...entry.pieces]
  return (
    <li className="favorite-combination-list-item">
      <article className="favorite-combination-card" aria-labelledby={`favorite-${entry.combination.id}`}>
        <div className="favorite-combination-card-images">
          {items.slice(0, 5).map((costume) => (
            <CombinationThumbnail key={costume.id} costume={costume} />
          ))}
        </div>
        <div className="favorite-combination-card-body">
          <p className="favorite-combination-card-kicker">お気に入りコーデ</p>
          <h3 id={`favorite-${entry.combination.id}`}>{entry.combination.name}</h3>
          <dl className="favorite-combination-pieces">
            <div>
              <dt>ベース衣装</dt>
              <dd>{entry.owner.name}</dd>
            </div>
            <div>
              <dt>組み合わせ</dt>
              <dd>{entry.pieces.map((piece) => piece.name).join('・') || 'なし'}</dd>
            </div>
          </dl>
          {entry.missingPieceIds.length > 0 && (
            <p className="favorite-combination-missing" role="status">
              削除された衣装があります。内容を編集してください。
            </p>
          )}
        </div>
        <div className="favorite-combination-card-actions">
          <button type="button" onClick={onEdit} aria-label={`「${entry.combination.name}」を編集`}>
            編集
          </button>
          <button type="button" className="danger" onClick={onDelete} aria-label={`「${entry.combination.name}」を削除`}>
            削除
          </button>
        </div>
      </article>
    </li>
  )
}

export function autoOutfitSuggestionMatchesQuery(
  suggestion: AutoOutfitSuggestion,
  query: string,
): boolean {
  return wardrobeLabelsMatchQuery(
    [
      '自動提案',
      '未保存',
      'コーデ提案',
      ...costumeSearchLabels(suggestion.costume),
      ...costumeSearchLabels(suggestion.owner),
      ...suggestion.pieces.flatMap(costumeSearchLabels),
      ...suggestion.reasons,
    ],
    query,
  )
}

function AutoOutfitSuggestionCard({
  suggestion,
  onReview,
}: {
  suggestion: AutoOutfitSuggestion
  onReview: () => void
}) {
  const items = [suggestion.owner, ...suggestion.pieces]
  const headingId = `auto-outfit-${suggestion.costume.id}`
  const scoreLabelId = `${headingId}-score-label`

  return (
    <li className="favorite-combination-list-item">
      <article
        className="favorite-combination-card auto-outfit-suggestion-card"
        aria-labelledby={headingId}
      >
        <div className="favorite-combination-card-images">
          {items.map((costume) => (
            <CombinationThumbnail key={costume.id} costume={costume} />
          ))}
        </div>
        <div className="favorite-combination-card-body auto-outfit-suggestion-card-body">
          <p className="auto-outfit-suggestion-kicker">自動提案・未保存</p>
          <h3 id={headingId}>{suggestion.costume.name}</h3>
          <p className="auto-outfit-suggestion-components">
            <span>構成</span>
            {items.map((item) => item.name).join('・')}
          </p>
          <div className="auto-outfit-suggestion-score">
            <span id={scoreLabelId}>組み合わせやすさ</span>
            <strong>{suggestion.score} / 100</strong>
            <meter
              min={0}
              max={100}
              value={suggestion.score}
              aria-labelledby={scoreLabelId}
            >
              {suggestion.score} / 100
            </meter>
          </div>
          <ul className="auto-outfit-suggestion-reasons" aria-label="提案理由">
            {suggestion.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
          <p className="auto-outfit-suggestion-note">
            保存しなくてもイベント候補に使われます。よく使う場合は、内容を確認してお気に入りに保存できます。
          </p>
        </div>
        <div className="favorite-combination-card-actions auto-outfit-suggestion-card-actions">
          <button
            type="button"
            onClick={onReview}
            aria-label={`「${suggestion.costume.name}」の内容を確認してお気に入りに保存`}
          >
            内容を確認して保存
          </button>
        </div>
      </article>
    </li>
  )
}

function samePieceIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((id) => bSet.has(id))
}

export default function Costumes() {
  const { confirm, toast } = useAppUi()
  const { costumes, loading, error, deleteCostume, updateCostume, reloadCostumes } = useCostumes()
  const [filter, setFilter] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingCombination, setEditingCombination] = useState<ResolvedFavoriteCombination | undefined>()
  const [draftCombination, setDraftCombination] = useState<FavoriteCombinationInput | undefined>()

  const allCombinations = resolveFavoriteCombinations(costumes)
  const allAutoSuggestions = useMemo(() => buildAutoOutfitSuggestions(costumes), [costumes])
  const filteredCombinations = searchFavoriteCombinations(costumes, filter)
  const filteredAutoSuggestions = allAutoSuggestions.filter((suggestion) =>
    autoOutfitSuggestionMatchesQuery(suggestion, filter),
  )
  const searchResults = searchWardrobeCostumes(costumes, filter)
  const filteredCostumes = searchResults.map((result) => result.costume)
  const resultById = new Map(searchResults.map((result) => [result.costume.id, result]))
  const hasQuery = Boolean(filter.trim())
  const hasAnyResults =
    filteredCostumes.length > 0 ||
    filteredCombinations.length > 0 ||
    filteredAutoSuggestions.length > 0

  const openNewCombination = () => {
    if (costumes.length < 2) {
      toast('お気に入りコーデを作るには、衣装を2点以上登録してください。', 'info')
      return
    }
    setEditingCombination(undefined)
    setDraftCombination(undefined)
    setComposerOpen(true)
  }

  const openSuggestedCombination = (suggestion: AutoOutfitSuggestion) => {
    setEditingCombination(undefined)
    setDraftCombination({
      name: suggestion.costume.name,
      ownerId: suggestion.owner.id,
      pieceIds: suggestion.pieces.map((piece) => piece.id),
    })
    setComposerOpen(true)
  }

  const handleSaveCombination = async (input: FavoriteCombinationInput) => {
    const validation = validateFavoriteCombination(input, costumes)
    if (!validation.valid || !validation.owner) throw new Error(validation.errors[0])

    const duplicate = allCombinations.find(
      (entry) =>
        entry.combination.id !== editingCombination?.combination.id &&
        entry.owner.id === validation.owner!.id &&
        samePieceIds(entry.combination.pieceIds, validation.pieceIds),
    )
    if (duplicate) throw new Error(`同じ衣装の組み合わせ「${duplicate.combination.name}」が登録済みです`)

    const now = Date.now()
    const nextCombination: FavoriteCombination = editingCombination
      ? {
          ...editingCombination.combination,
          name: input.name.normalize('NFKC').trim(),
          pieceIds: validation.pieceIds,
          updatedAt: now,
        }
      : createFavoriteCombination(input, costumes, now)

    if (editingCombination && editingCombination.owner.id !== validation.owner.id) {
      await updateCostume(editingCombination.owner.id, {
        favoriteCombinations: removeFavoriteCombination(
          editingCombination.owner.favoriteCombinations,
          editingCombination.combination.id,
        ),
      })
    }

    const ownerCombinations =
      editingCombination?.owner.id === validation.owner.id
        ? editingCombination.owner.favoriteCombinations
        : validation.owner.favoriteCombinations
    await updateCostume(validation.owner.id, {
      favoriteCombinations: upsertFavoriteCombination(ownerCombinations, nextCombination),
    })
    setComposerOpen(false)
    setEditingCombination(undefined)
    setDraftCombination(undefined)
    toast(editingCombination ? 'お気に入りコーデを更新しました。' : 'お気に入りコーデを保存しました。', 'success')
  }

  const handleDeleteCombination = async (entry: ResolvedFavoriteCombination) => {
    const ok = await confirm({
      message: `お気に入りコーデ「${entry.combination.name}」を削除しますか？登録衣装は削除されません。`,
      confirmLabel: '削除する',
      danger: true,
    })
    if (!ok) return
    await updateCostume(entry.owner.id, {
      favoriteCombinations: removeFavoriteCombination(
        entry.owner.favoriteCombinations,
        entry.combination.id,
      ),
    })
    toast('お気に入りコーデを削除しました。', 'success')
  }

  const handleDelete = async (id: string) => {
    const costume = costumes.find((item) => item.id === id)
    const dependents = allCombinations.filter(
      (entry) => entry.owner.id === id || entry.combination.pieceIds.includes(id),
    )
    const dependentNote = dependents.length > 0
      ? ` この衣装を使うお気に入りコーデ ${dependents.length}件も削除されます。`
      : ''
    const ok = await confirm({
      message: `「${costume?.name ?? 'この衣装'}」を削除しますか？${dependentNote}`,
      confirmLabel: '削除する',
      danger: true,
    })
    if (!ok) return

    try {
      const ownersToUpdate = new Map<string, Costume>()
      for (const entry of dependents) {
        if (entry.owner.id !== id) ownersToUpdate.set(entry.owner.id, entry.owner)
      }
      for (const owner of ownersToUpdate.values()) {
        const dependentIds = new Set(
          dependents
            .filter((entry) => entry.owner.id === owner.id)
            .map((entry) => entry.combination.id),
        )
        await updateCostume(owner.id, {
          favoriteCombinations: (owner.favoriteCombinations ?? []).filter(
            (combination) => !dependentIds.has(combination.id),
          ),
        })
      }
      await deleteCostume(id)
    } catch (err) {
      console.error('Failed to delete costume:', err)
    }
  }

  if (loading) {
    return (
      <div className="wardrobe-loading" role="status">
        <p>所有衣装を読み込んでいます…</p>
      </div>
    )
  }

  if (error && costumes.length === 0) {
    return (
      <div className="wardrobe-load-error" role="alert">
        <h1>所有衣装を読み込めませんでした</h1>
        <p>{error}</p>
        <button type="button" onClick={() => void reloadCostumes()}>もう一度読み込む</button>
      </div>
    )
  }

  return (
    <div className="costumes-page">
      <header className="wardrobe-header">
        <div>
          <p className="wardrobe-eyebrow">MY WARDROBE</p>
          <h1>👗 所有衣装</h1>
          <p className="wardrobe-intro">写真と属性を見比べ、色・柄・種類・タグから手持ちの衣装や小物、コーデを探せます。</p>
        </div>
        <div className="wardrobe-header-actions">
          <button type="button" className="wardrobe-combination-button" onClick={openNewCombination}>
            お気に入りコーデを作る
          </button>
          <Link to="/costumes/add" className="wardrobe-add-button">
            ＋ 衣装を追加
          </Link>
        </div>
      </header>

      {composerOpen && (
        <FavoriteCombinationComposer
          key={
            editingCombination?.combination.id ??
            (draftCombination
              ? `draft-${draftCombination.ownerId}-${draftCombination.pieceIds.join('-')}`
              : 'new-combination')
          }
          wardrobe={costumes}
          initial={editingCombination}
          draft={draftCombination}
          onSave={handleSaveCombination}
          onCancel={() => {
            setComposerOpen(false)
            setEditingCombination(undefined)
            setDraftCombination(undefined)
          }}
        />
      )}

      {error && <div className="wardrobe-inline-error" role="alert">エラー: {error}</div>}

      {costumes.length > 0 && (
        <search className="wardrobe-search" aria-labelledby="wardrobe-search-label">
          <label id="wardrobe-search-label" htmlFor="wardrobe-search-input">所有衣装・小物とコーデを検索</label>
          <p id="wardrobe-search-help">「青 花柄」のように複数の条件を組み合わせられます。</p>
          <div className="wardrobe-search-control">
            <input
              id="wardrobe-search-input"
              type="search"
              placeholder="例: 自動提案 / 青系 / ブラウス / 本番用"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-describedby="wardrobe-search-help wardrobe-result-count"
              aria-controls="wardrobe-results favorite-combination-results auto-outfit-suggestion-results"
            />
            {filter && (
              <button type="button" onClick={() => setFilter('')} aria-label="検索条件をすべて解除">
                クリア
              </button>
            )}
          </div>
          <div className="wardrobe-quick-searches" aria-label="よく使う探し方">
            {QUICK_SEARCHES.map((word) => (
              <button
                key={word}
                type="button"
                className={filter === word ? 'active' : ''}
                aria-pressed={filter === word}
                onClick={() => setFilter(word)}
              >
                {word}
              </button>
            ))}
          </div>
          <p id="wardrobe-result-count" className="wardrobe-result-count" role="status" aria-live="polite">
            {hasQuery
              ? `自動提案 ${filteredAutoSuggestions.length} / ${allAutoSuggestions.length}件・お気に入り ${filteredCombinations.length} / ${allCombinations.length}件・登録アイテム ${filteredCostumes.length} / ${costumes.length}件`
              : `自動提案 ${allAutoSuggestions.length}件・お気に入りコーデ ${allCombinations.length}件・登録アイテム ${costumes.length}件`}
          </p>
        </search>
      )}

      {filteredCombinations.length > 0 && (
        <section className="favorite-combinations-section" aria-labelledby="favorite-combinations-heading">
          <div className="wardrobe-section-heading">
            <div>
              <p className="wardrobe-section-kicker">FAVORITES</p>
              <h2 id="favorite-combinations-heading">お気に入りコーデ</h2>
            </div>
            <p>一緒に着る衣装・小物を1つの完成コーデ候補として保存し、イベントへ提出できます。</p>
          </div>
          <ul id="favorite-combination-results" className="favorite-combinations-grid">
            {filteredCombinations.map((entry) => (
              <FavoriteCombinationCard
                key={entry.combination.id}
                entry={entry}
                onEdit={() => {
                  setEditingCombination(entry)
                  setDraftCombination(undefined)
                  setComposerOpen(true)
                }}
                onDelete={() => void handleDeleteCombination(entry)}
              />
            ))}
          </ul>
        </section>
      )}

      {filteredAutoSuggestions.length > 0 && (
        <section className="auto-outfit-suggestions-section" aria-labelledby="auto-outfit-suggestions-heading">
          <div className="wardrobe-section-heading">
            <div>
              <p className="wardrobe-section-kicker">SUGGESTIONS</p>
              <h2 id="auto-outfit-suggestions-heading">登録アイテムからのコーデ提案</h2>
            </div>
            <p>
              保存済みコーデがない衣装も、登録したトップス・ボトムス・小物から完成コーデ候補を作ります。
            </p>
          </div>
          <ul id="auto-outfit-suggestion-results" className="auto-outfit-suggestions-grid">
            {filteredAutoSuggestions.map((suggestion) => (
              <AutoOutfitSuggestionCard
                key={suggestion.costume.id}
                suggestion={suggestion}
                onReview={() => openSuggestedCombination(suggestion)}
              />
            ))}
          </ul>
        </section>
      )}

      {!hasAnyResults ? (
        <div className="wardrobe-empty-state">
          {costumes.length === 0 ? (
            <>
              <p className="wardrobe-empty-title">最初の衣装写真を追加しましょう</p>
              <p>写真を選ぶと、色・トーン・判定できる柄の候補を端末内で入力できます。</p>
              <Link to="/costumes/add" className="wardrobe-empty-cta">写真から衣装を追加</Link>
            </>
          ) : (
            <>
              <p className="wardrobe-empty-title">条件に合う衣装やコーデが見つかりません</p>
              <p>言葉を減らすか、検索条件を解除してもう一度探してください。</p>
              <button type="button" className="wardrobe-empty-cta" onClick={() => setFilter('')}>
                検索を解除する
              </button>
            </>
          )}
        </div>
      ) : filteredCostumes.length > 0 ? (
        <section aria-labelledby="wardrobe-list-heading">
          <div className="wardrobe-section-heading wardrobe-list-heading">
            <div>
              <p className="wardrobe-section-kicker">ITEMS</p>
              <h2 id="wardrobe-list-heading">登録衣装</h2>
            </div>
          </div>
          <ul id="wardrobe-results" className="wardrobe-costumes-grid">
            {filteredCostumes.map((costume, index) => {
              const result = resultById.get(costume.id)
              const colors = normalizeCostumeColors(costume.colors)
              const colorNames = Array.from(new Set(themeColorNamesFrom(costume.colors)))
                .map((color) => labelFor(COLOR_LABELS, color))
              const features = costumeFeatureLabels(costume)
              return (
                <li key={costume.id} className="wardrobe-costume-list-item">
                  <article className="wardrobe-costume-card" aria-labelledby={`costume-${costume.id}`}>
                    <WardrobeImage costume={costume} priority={index === 0} />
                    <div className="wardrobe-costume-info">
                      <h3 id={`costume-${costume.id}`}>{costume.name}</h3>
                      {hasQuery && result && result.matchedLabels.length > 0 && (
                        <div className="wardrobe-matched-labels" aria-label="一致した条件">
                          {result.matchedLabels.slice(0, 4).map((label) => (
                            <span key={label}>{label}</span>
                          ))}
                        </div>
                      )}
                      <dl className="wardrobe-costume-details">
                        {costume.type && (
                          <div>
                            <dt>種類</dt>
                            <dd><span className="wardrobe-detail-tag strong">{labelFor(COSTUME_TYPE_LABELS, costume.type)}</span></dd>
                          </div>
                        )}
                        <div>
                          <dt>色</dt>
                          <dd className="wardrobe-color-detail">
                            <span className="wardrobe-color-swatches" aria-hidden="true">
                              {colors.filter((color) => /^#|^[a-z]+$/i.test(color)).slice(0, 4).map((color) => (
                                <span key={color} style={{ backgroundColor: color }} />
                              ))}
                            </span>
                            <span>{colorNames.join('・') || '指定なし'}</span>
                          </dd>
                        </div>
                        <div>
                          <dt>トーン</dt>
                          <dd><span className="wardrobe-detail-tag">{labelFor(TONE_LABELS, costume.tone)}</span></dd>
                        </div>
                        <div>
                          <dt>柄</dt>
                          <dd><span className="wardrobe-detail-tag">{labelFor(PATTERN_LABELS, costume.pattern)}</span></dd>
                        </div>
                        <div>
                          <dt>季節</dt>
                          <dd className="wardrobe-inline-tags">
                            {(costume.season.length > 0 ? costume.season : ['none']).map((season) => (
                              <span key={season} className="wardrobe-detail-tag">
                                {season === 'none' ? '指定なし' : labelFor(SEASON_LABELS, season)}
                              </span>
                            ))}
                          </dd>
                        </div>
                        {features.length > 0 && (
                          <div>
                            <dt>特徴</dt>
                            <dd className="wardrobe-inline-tags">
                              {features.map((feature) => <span key={feature} className="wardrobe-detail-tag">{feature}</span>)}
                            </dd>
                          </div>
                        )}
                        {(costume.tags ?? []).length > 0 && (
                          <div>
                            <dt>タグ</dt>
                            <dd className="wardrobe-inline-tags">
                              {(costume.tags ?? []).map((tag) => <span key={tag} className="wardrobe-user-tag">#{tag}</span>)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div className="wardrobe-costume-actions">
                      <Link to={`/costumes/${costume.id}`} aria-label={`「${costume.name}」を編集`}>編集</Link>
                      <button type="button" onClick={() => void handleDelete(costume.id)} aria-label={`「${costume.name}」を削除`}>
                        削除
                      </button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
