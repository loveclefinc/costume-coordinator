import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Costume } from '../utils/storage'
import {
  MAX_FAVORITE_COMBINATION_PIECES,
  canBeFavoriteCombinationPiece,
  canOwnFavoriteCombination,
  validateFavoriteCombination,
  type FavoriteCombinationInput,
  type ResolvedFavoriteCombination,
} from '../utils/favorite-combinations'
import { COSTUME_TYPE_LABELS } from '../utils/costume-search'
import './FavoriteCombinationComposer.css'

interface FavoriteCombinationComposerProps {
  wardrobe: Costume[]
  initial?: ResolvedFavoriteCombination
  /** 自動提案を、利用者が確認・改名してから保存するための未保存値。 */
  draft?: FavoriteCombinationInput
  onSave: (input: FavoriteCombinationInput) => Promise<void>
  onCancel: () => void
}

function costumeTypeLabel(costume: Costume): string {
  if (!costume.type) return '衣装'
  return COSTUME_TYPE_LABELS[costume.type] ?? costume.type
}

function CostumePreview({ costume, priority = false }: { costume: Costume; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="favorite-combination-preview-item">
      {costume.image && !failed ? (
        <img
          src={costume.image}
          alt={`${costume.name}の写真`}
          width={180}
          height={180}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="favorite-combination-preview-placeholder" role="img" aria-label={`${costume.name}は写真なし`}>
          写真なし
        </div>
      )}
      <span>{costume.name}</span>
      <small>{costumeTypeLabel(costume)}</small>
    </div>
  )
}

function CostumeOptionImage({ costume }: { costume: Costume }) {
  const [failed, setFailed] = useState(false)

  if (!costume.image || failed) {
    return <span className="favorite-combination-option-placeholder" aria-hidden="true">写真なし</span>
  }

  return (
    <img
      src={costume.image}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

export default function FavoriteCombinationComposer({
  wardrobe,
  initial,
  draft,
  onSave,
  onCancel,
}: FavoriteCombinationComposerProps) {
  const ownerOptions = useMemo(() => wardrobe.filter(canOwnFavoriteCombination), [wardrobe])
  const [name, setName] = useState(initial?.combination.name ?? draft?.name ?? '')
  const [ownerId, setOwnerId] = useState(initial?.owner.id ?? draft?.ownerId ?? ownerOptions[0]?.id ?? '')
  const [pieceIds, setPieceIds] = useState<string[]>(initial?.combination.pieceIds ?? draft?.pieceIds ?? [])
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reviewingSuggestion = Boolean(draft && !initial)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const pieceOptions = wardrobe.filter(
    (costume) => costume.id !== ownerId && canBeFavoriteCombinationPiece(costume),
  )
  const selected = [
    wardrobe.find((costume) => costume.id === ownerId),
    ...pieceIds.map((id) => wardrobe.find((costume) => costume.id === id)),
  ].filter((costume): costume is Costume => Boolean(costume))

  const togglePiece = (id: string) => {
    setErrors([])
    setPieceIds((current) =>
      current.includes(id)
        ? current.filter((pieceId) => pieceId !== id)
        : current.length < MAX_FAVORITE_COMBINATION_PIECES
          ? [...current, id]
          : current,
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = { name, ownerId, pieceIds }
    const validation = validateFavoriteCombination(input, wardrobe)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    setSaving(true)
    setErrors([])
    try {
      await onSave(input)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '組み合わせを保存できませんでした'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="favorite-combination-composer" aria-labelledby="favorite-combination-composer-title">
      <div className="favorite-combination-composer-heading">
        <div>
          <p className="favorite-combination-eyebrow">
            {reviewingSuggestion ? 'COORDINATE REVIEW' : 'MY COORDINATE'}
          </p>
          <h2
            id="favorite-combination-composer-title"
            ref={headingRef}
            tabIndex={-1}
          >
            {initial
              ? 'お気に入りコーデを編集'
              : reviewingSuggestion
                ? '提案を確認してお気に入りに保存'
                : 'お気に入りコーデを作成'}
          </h2>
          <p>
            {reviewingSuggestion
              ? '登録アイテムから作った自動提案です。写真と構成を確認し、名前を整えてから保存してください。'
              : 'スーツ＋シャツ、ブラウス＋スカートなど、いつも一緒に使う衣装と小物をまとめます。'}
          </p>
        </div>
        <button type="button" className="favorite-combination-close" onClick={onCancel} disabled={saving}>
          閉じる
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {errors.length > 0 && (
          <div className="favorite-combination-errors" role="alert">
            <p>入力内容を確認してください</p>
            <ul>
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}

        <div className="favorite-combination-fields">
          <div className="favorite-combination-field">
            <label htmlFor="favorite-combination-name">組み合わせ名</label>
            <input
              id="favorite-combination-name"
              name="combinationName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="例: 演奏会の定番"
              disabled={saving}
              required
            />
          </div>

          <div className="favorite-combination-field">
            <label htmlFor="favorite-combination-owner">ベース衣装</label>
            <select
              id="favorite-combination-owner"
              name="ownerId"
              value={ownerId}
              onChange={(event) => {
                const nextOwnerId = event.target.value
                setOwnerId(nextOwnerId)
                setPieceIds((current) => current.filter((id) => id !== nextOwnerId))
                setErrors([])
              }}
              disabled={saving}
              required
            >
              <option value="">選択してください</option>
              {ownerOptions.map((costume) => (
                <option key={costume.id} value={costume.id}>
                  {costume.name}（{costumeTypeLabel(costume)}）
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="favorite-combination-piece-fieldset">
          <legend>合わせる衣装・小物</legend>
          <p id="favorite-combination-piece-help">
            1〜{MAX_FAVORITE_COMBINATION_PIECES}点を選択できます。上衣・下衣・ネクタイ類は各1点までです。
          </p>
          {pieceOptions.length === 0 ? (
            <p className="favorite-combination-no-options">組み合わせに追加できる衣装がありません。</p>
          ) : (
            <div className="favorite-combination-piece-options" aria-describedby="favorite-combination-piece-help">
              {pieceOptions.map((costume) => {
                const checked = pieceIds.includes(costume.id)
                const disabled = saving || (!checked && pieceIds.length >= MAX_FAVORITE_COMBINATION_PIECES)
                return (
                  <label key={costume.id} className={`favorite-combination-piece-option${checked ? ' selected' : ''}`}>
                    <input
                      type="checkbox"
                      name="pieceIds"
                      value={costume.id}
                      checked={checked}
                      onChange={() => togglePiece(costume.id)}
                      disabled={disabled}
                    />
                    <CostumeOptionImage costume={costume} />
                    <span>
                      <strong>{costume.name}</strong>
                      <small>{costumeTypeLabel(costume)}</small>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>

        {selected.length > 0 && (
          <div className="favorite-combination-live-preview" aria-live="polite">
            <h3>組み合わせプレビュー</h3>
            <div className="favorite-combination-preview-grid">
              {selected.map((costume, index) => (
                <CostumePreview key={costume.id} costume={costume} priority={index === 0} />
              ))}
            </div>
          </div>
        )}

        <div className="favorite-combination-form-actions">
          <button type="button" className="favorite-combination-cancel" onClick={onCancel} disabled={saving}>
            キャンセル
          </button>
          <button type="submit" className="favorite-combination-save" disabled={saving || ownerOptions.length === 0}>
            {saving
              ? '保存中…'
              : initial
                ? '変更を保存'
                : reviewingSuggestion
                  ? 'お気に入りに保存'
                  : '組み合わせを保存'}
          </button>
        </div>
      </form>
    </section>
  )
}
