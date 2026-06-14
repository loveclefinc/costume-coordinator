import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useCostumes } from '../hooks/useCostumes'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import { useCloudSync } from '../hooks/useCloudSync'
import CostumeImageCloudPicker from '../components/CostumeImageCloudPicker'
import ImageColorEyedropper, { type EyedropperTarget } from '../components/ImageColorEyedropper'
import { getCloudImageFolderHelp } from '../cloud/import/cloud-import-help'
import { analyzeImage, compressImage, fileToDataUrl, classifyColorCategory, classifyTone } from '../utils/image-analysis'
import { enrichCostumeColors, normalizePattern, hexToThemeColorName } from '../utils/theme-colors'
import { DRESS_SILHOUETTE_OPTIONS, SILHOUETTE_LABELS, type DressSilhouette } from '../utils/silhouette'
import dressSilhouetteALineIcon from '../generated/costume-icons/dress-silhouette-a-line.png'
import dressSilhouetteMermaidIcon from '../generated/costume-icons/dress-silhouette-mermaid.png'
import dressSilhouettePrincessIcon from '../generated/costume-icons/dress-silhouette-princess.png'
import dressSilhouetteSlenderIcon from '../generated/costume-icons/dress-silhouette-slender.png'
import suitBreastingDoubleIcon from '../generated/costume-icons/suit-breasting-double.png'
import suitBreastingSingleIcon from '../generated/costume-icons/suit-breasting-single.png'
import suitLapelNotchIcon from '../generated/costume-icons/suit-lapel-notch.png'
import suitLapelPeakIcon from '../generated/costume-icons/suit-lapel-peak.png'
import suitLapelShawlIcon from '../generated/costume-icons/suit-lapel-shawl.png'
import suitStyleStandardIcon from '../generated/costume-icons/suit-style-standard.png'
import suitStyleTailcoatIcon from '../generated/costume-icons/suit-style-tailcoat.png'
import suitStyleTuxedoIcon from '../generated/costume-icons/suit-style-tuxedo.png'
import {
  SUIT_BREASTING_LABELS,
  SUIT_BREASTING_OPTIONS,
  SUIT_LAPEL_LABELS,
  SUIT_LAPEL_OPTIONS,
  SUIT_STYLE_LABELS,
  SUIT_STYLE_OPTIONS,
  type SuitBreasting,
  type SuitLapel,
  type SuitStyle,
} from '../utils/suit-attributes'

const COLOR_CATEGORY_LABELS: Record<string, string> = {
  warm: '暖色',
  cool: '寒色',
  neutral: 'ニュートラル',
}

const TONE_LABELS: Record<string, string> = {
  pastel: 'パステル',
  vivid: '鮮やか',
  dark: '濃い',
  neutral: '落ち着いた',
}
import './AddCostume.css'

const SEASON_OPTIONS = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
]

const PATTERN_OPTIONS = [
  { value: 'solid', label: '無地' },
  { value: 'floral', label: '花柄' },
  { value: 'stripe', label: 'ストライプ' },
  { value: 'dot', label: 'ドット' },
  { value: 'check', label: 'チェック' },
  { value: 'geometric', label: '幾何学模様' },
  { value: 'animal', label: 'アニマル柄' },
  { value: 'other', label: 'その他' },
]

const COSTUME_TYPE_OPTIONS = [
  { value: 'dress', label: 'ドレス' },
  { value: 'suit', label: 'スーツ' },
  { value: 'shirt', label: 'ワイシャツ' },
  { value: 'necktie', label: 'ネクタイ' },
  { value: 'bowtie', label: '蝶ネクタイ' },
  { value: 'accessory', label: '小物・アクセサリー' },
  { value: 'other', label: 'その他' },
]

function pickHexColors(colors: string[]): string[] {
  return normalizeCostumeColors(colors).filter((c) => /^#?[0-9A-Fa-f]{6}$/.test(c.trim()))
}

function patternForForm(pattern: string): string {
  return pattern === 'plain' ? 'solid' : pattern
}

function toggleListValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

const DRESS_SILHOUETTE_HELP: Record<DressSilhouette, string> = {
  a_line: '肩から裾へ自然に広がる形',
  princess: 'ウエストから大きく広がる華やかな形',
  slender: '体のラインに沿う細身の形',
  mermaid: '膝下から裾が広がる形',
}

const SUIT_STYLE_HELP: Record<SuitStyle, string> = {
  tuxedo: '拝絹のあるフォーマルな上着',
  tailcoat: '後ろ裾が長い燕尾服',
  standard: '一般的なジャケット型',
}

const SUIT_BREASTING_HELP: Record<SuitBreasting, string> = {
  single: '前の釦が1列',
  double: '前の釦が2列',
}

const SUIT_LAPEL_HELP: Record<SuitLapel, string> = {
  notch: '切れ込みのある標準的な襟',
  peak: '先端が上向きの格式ある襟',
  shawl: '丸くつながる柔らかな襟',
}

const DRESS_SILHOUETTE_ICON_SRC: Record<DressSilhouette, string> = {
  a_line: dressSilhouetteALineIcon,
  princess: dressSilhouettePrincessIcon,
  slender: dressSilhouetteSlenderIcon,
  mermaid: dressSilhouetteMermaidIcon,
}

const SUIT_STYLE_ICON_SRC: Record<SuitStyle, string> = {
  tuxedo: suitStyleTuxedoIcon,
  tailcoat: suitStyleTailcoatIcon,
  standard: suitStyleStandardIcon,
}

const SUIT_LAPEL_ICON_SRC: Record<SuitLapel, string> = {
  notch: suitLapelNotchIcon,
  peak: suitLapelPeakIcon,
  shawl: suitLapelShawlIcon,
}

const SUIT_BREASTING_ICON_SRC: Record<SuitBreasting, string> = {
  single: suitBreastingSingleIcon,
  double: suitBreastingDoubleIcon,
}

function DressSilhouetteIcon({ value }: { value: DressSilhouette }) {
  return (
    <img
      className="guide-icon-image"
      src={DRESS_SILHOUETTE_ICON_SRC[value]}
      alt={`${SILHOUETTE_LABELS[value]}の図解`}
    />
  )
}

function SuitStyleIcon({ value }: { value: SuitStyle }) {
  return (
    <img
      className="guide-icon-image"
      src={SUIT_STYLE_ICON_SRC[value]}
      alt={`${SUIT_STYLE_LABELS[value]}の図解`}
    />
  )
}

function SuitBreastingIcon({ value }: { value: SuitBreasting }) {
  return (
    <img
      className="guide-icon-image"
      src={SUIT_BREASTING_ICON_SRC[value]}
      alt={`${SUIT_BREASTING_LABELS[value]}の図解`}
    />
  )
}

function SuitLapelIcon({ value }: { value: SuitLapel }) {
  return (
    <img
      className="guide-icon-image"
      src={SUIT_LAPEL_ICON_SRC[value]}
      alt={`${SUIT_LAPEL_LABELS[value]}の図解`}
    />
  )
}

export default function AddCostume() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const { addCostume, updateCostume, getCostume } = useCostumes()
  const { status: cloudStatus } = useCloudSync()
  const cloudConnected = cloudStatus.connected

  const [showCloudPicker, setShowCloudPicker] = useState(false)
  const [name, setName] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null)
  const [wearingPhotos, setWearingPhotos] = useState<string[]>([])
  const [primaryColor, setPrimaryColor] = useState('#FF6B9D')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [colorCategory, setColorCategory] = useState<'warm' | 'cool' | 'neutral'>('neutral')
  const [tone, setTone] = useState<'pastel' | 'vivid' | 'dark' | 'neutral'>('neutral')
  const [pattern, setPattern] = useState('solid')
  const [costumeType, setCostumeType] = useState('dress')
  const [silhouette, setSilhouette] = useState<DressSilhouette>('a_line')
  const [suitStyle, setSuitStyle] = useState<SuitStyle>('tuxedo')
  const [suitBreasting, setSuitBreasting] = useState<SuitBreasting>('single')
  const [suitLapel, setSuitLapel] = useState<SuitLapel>('shawl')
  const [tags, setTags] = useState('')
  const [season, setSeason] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditMode)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [eyedropperTarget, setEyedropperTarget] = useState<EyedropperTarget | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    const loadCostume = async () => {
      try {
        const costume = await getCostume(id)
        if (cancelled) return

        if (!costume) {
          setError('衣装が見つかりません')
          return
        }

        const hexColors = pickHexColors(costume.colors)
        setName(costume.name)
        setImageUri(costume.image || null)
        setWearingPhotos(Array.isArray(costume.wearingPhotos) ? costume.wearingPhotos : [])

        if (hexColors[0]) {
          const primary = hexColors[0].startsWith('#') ? hexColors[0] : `#${hexColors[0]}`
          setPrimaryColor(primary)
          setColorCategory(classifyColorCategory(primary))
        }
        if (hexColors[1]) {
          const secondary = hexColors[1].startsWith('#') ? hexColors[1] : `#${hexColors[1]}`
          setSecondaryColor(secondary)
        }

        setTone((costume.tone as 'pastel' | 'vivid' | 'dark' | 'neutral') || 'neutral')
        setPattern(patternForForm(costume.pattern))
        if (costume.type) setCostumeType(costume.type)
        if (costume.silhouette) setSilhouette(costume.silhouette)
        if (costume.suitStyle) setSuitStyle(costume.suitStyle)
        if (costume.suitBreasting) setSuitBreasting(costume.suitBreasting)
        if (costume.suitLapel) setSuitLapel(costume.suitLapel)
        setSeason(Array.isArray(costume.season) ? costume.season : [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '衣装の読み込みに失敗しました')
        }
      } finally {
        if (!cancelled) setInitialLoading(false)
      }
    }

    void loadCostume()

    return () => {
      cancelled = true
    }
  }, [id, getCostume])

  const applyImageDataUrl = async (dataUrl: string, sourceName?: string) => {
    setLoading(true)
    setError('')
    try {
      setImageUri(dataUrl)

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], sourceName ?? 'image.jpg', { type: blob.type || 'image/jpeg' })
      const compressedBlob = await compressImage(file, 300, 300)
      setThumbnailUri(URL.createObjectURL(compressedBlob))

      setAnalyzing(true)
      const analysis = await analyzeImage(dataUrl)
      setPrimaryColor(analysis.primaryColor)
      if (analysis.secondaryColor) {
        setSecondaryColor(analysis.secondaryColor)
      }
      setColorCategory(analysis.colorCategory)
      setTone(analysis.tone)
      setAnalyzing(false)

      if (sourceName && !name.trim()) {
        setName(sourceName.replace(/\.[^.]+$/, ''))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToDataUrl(file)
      await applyImageDataUrl(dataUrl, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    }
  }

  const handleCloudImageSelect = async (dataUrl: string, fileName: string) => {
    await applyImageDataUrl(dataUrl, fileName)
  }

  const handleAddWearingPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToDataUrl(file)
      setWearingPhotos([...wearingPhotos, dataUrl])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add wearing photo')
    }
  }

  const handleUseMainImageAsWearingPhoto = () => {
    if (!imageUri) return
    setWearingPhotos((current) => (
      current.includes(imageUri) ? current : [...current, imageUri]
    ))
  }

  const handleRemoveWearingPhoto = (index: number) => {
    setWearingPhotos(wearingPhotos.filter((_, i) => i !== index))
  }

  const handleEyedropperPick = (target: EyedropperTarget, color: string) => {
    if (target === 'primary') {
      setPrimaryColor(color)
      setColorCategory(classifyColorCategory(color))
      setTone(classifyTone(color))
    } else {
      setSecondaryColor(color)
    }
    setEyedropperTarget(null)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('衣装名を入力してください')
      return
    }

    if (!imageUri) {
      setError('衣装の画像をアップロードしてください')
      return
    }

    try {
      setLoading(true)
      setError('')

      const colors = enrichCostumeColors([primaryColor, secondaryColor].filter(Boolean))
      const payload = {
        name: name.trim(),
        image: imageUri,
        wearingPhotos,
        colors,
        tone,
        pattern: normalizePattern(pattern),
        season,
        type: costumeType,
        ...(costumeType === 'dress' ? { silhouette } : {}),
        ...(costumeType === 'suit' ? { suitStyle } : {}),
        ...(costumeType === 'suit' && suitStyle === 'standard' ? { suitBreasting } : {}),
        ...(costumeType === 'suit' && suitStyle === 'tuxedo' ? { suitLapel } : {}),
      }

      if (isEditMode && id) {
        await updateCostume(id, payload)
      } else {
        await addCostume(payload)
      }
      navigate('/costumes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save costume')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="add-costume-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="add-costume-page">
      <h1>{isEditMode ? '👗 衣装を編集' : '👗 衣装を追加'}</h1>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* Image Upload Section */}
      <section className="section">
        <h2>📸 衣装の画像</h2>
        <div className="image-upload">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
            id="image-input"
          />
          <label htmlFor="image-input" className="upload-label">
            {imageUri ? '画像を変更' : '画像をアップロード'}
          </label>
        </div>
        <div className="cloud-import-section">
          <button
            type="button"
            className={`cloud-import-button${cloudConnected ? '' : ' cloud-import-button--off'}`}
            disabled={loading || !cloudConnected}
            aria-disabled={loading || !cloudConnected}
            title={
              cloudConnected
                ? 'クラウド上の画像から衣装写真を選ぶ'
                : 'クラウド同期未接続のため利用できません'
            }
            onClick={() => cloudConnected && setShowCloudPicker(true)}
          >
            ☁️ クラウドからインポート
          </button>
          {showCloudPicker && cloudStatus.provider && (
            <CostumeImageCloudPicker
              provider={cloudStatus.provider}
              onClose={() => setShowCloudPicker(false)}
              onSelect={(dataUrl, fileName) => void handleCloudImageSelect(dataUrl, fileName)}
            />
          )}
          {cloudConnected && cloudStatus.provider ? (
            <p className="cloud-import-hint">
              {getCloudImageFolderHelp(cloudStatus.provider)}
            </p>
          ) : (
            <p className="cloud-import-hint">
              クラウド同期に未接続のため利用できません。
              <Link to="/settings">設定</Link>
              から Google Drive または Dropbox を接続してください。
            </p>
          )}
        </div>

        {imageUri && (
          <div className="image-preview">
            <ImageColorEyedropper
              imageUrl={imageUri}
              activeTarget={eyedropperTarget}
              onPick={handleEyedropperPick}
              onCancel={() => setEyedropperTarget(null)}
              disabled={loading}
            />
            {analyzing && <p className="analyzing">色を分析中...</p>}
          </div>
        )}
      </section>

      {/* Basic Info */}
      <section className="section">
        <h2>📝 基本情報</h2>
        <div className="form-group">
          <label>衣装名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 赤いドレス"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>タグ</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例: フォーマル, 春, 赤系（カンマで区切る）"
            disabled={loading}
          />
        </div>
      </section>

      {/* Color Section */}
      <section className="section add-costume-color-section">
        <h2>🎨 色</h2>
        {imageUri && (
          <p className="add-costume-field-hint add-costume-eyedropper-intro">
            自動抽出が合わない場合は、下の「画像から取得」を押して衣装の写真をクリックしてください。
          </p>
        )}
        <div className="add-costume-swatch-row">
          <div className="form-group add-costume-swatch-field">
            <label htmlFor="primary-color-input">主色</label>
            <div className="add-costume-swatch-control">
              <input
                id="primary-color-input"
                type="color"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value)
                  setColorCategory(classifyColorCategory(e.target.value))
                  setTone(classifyTone(e.target.value))
                }}
                disabled={loading}
              />
              <span className="add-costume-color-value">
                {primaryColor}
                {hexToThemeColorName(primaryColor) && (
                  <span className="add-costume-theme-name">
                    {' '}
                    → {hexToThemeColorName(primaryColor)}
                  </span>
                )}
              </span>
            </div>
            {imageUri && (
              <button
                type="button"
                className={`eyedropper-btn${eyedropperTarget === 'primary' ? ' eyedropper-btn--active' : ''}`}
                onClick={() => setEyedropperTarget(
                  eyedropperTarget === 'primary' ? null : 'primary',
                )}
                disabled={loading}
              >
                🎯 画像から取得
              </button>
            )}
          </div>

          <div className="form-group add-costume-swatch-field">
            <label htmlFor="secondary-color-input">副色</label>
            <div className="add-costume-swatch-control">
              <input
                id="secondary-color-input"
                type="color"
                value={secondaryColor || '#ffffff'}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={loading}
              />
              <span className="add-costume-color-value">
                {secondaryColor || 'なし'}
                {secondaryColor && hexToThemeColorName(secondaryColor) && (
                  <span className="add-costume-theme-name">
                    {' '}
                    → {hexToThemeColorName(secondaryColor)}
                  </span>
                )}
              </span>
            </div>
            {imageUri && (
              <button
                type="button"
                className={`eyedropper-btn${eyedropperTarget === 'secondary' ? ' eyedropper-btn--active' : ''}`}
                onClick={() => setEyedropperTarget(
                  eyedropperTarget === 'secondary' ? null : 'secondary',
                )}
                disabled={loading}
              >
                🎯 画像から取得
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="color-category-select">色カテゴリ</label>
          <select
            id="color-category-select"
            value={colorCategory}
            onChange={(e) => setColorCategory(e.target.value as 'warm' | 'cool' | 'neutral')}
            disabled={loading}
          >
            <option value="warm">暖色</option>
            <option value="cool">寒色</option>
            <option value="neutral">ニュートラル</option>
          </select>
          <p className="add-costume-field-hint">
            現在: {COLOR_CATEGORY_LABELS[colorCategory] ?? colorCategory}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="tone-select">トーン</label>
          <select
            id="tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as 'pastel' | 'vivid' | 'dark' | 'neutral')}
            disabled={loading}
          >
            <option value="pastel">パステル</option>
            <option value="vivid">鮮やか</option>
            <option value="dark">濃い</option>
            <option value="neutral">落ち着いた</option>
          </select>
          <p className="add-costume-field-hint">現在: {TONE_LABELS[tone] ?? tone}</p>
        </div>
      </section>

      {/* Costume Type Section */}
      <section className="section">
        <h2>📑 衣装の種類</h2>
        <div className="form-group">
          <label>衣装の種類 *</label>
          <select
            value={costumeType}
            onChange={(e) => setCostumeType(e.target.value)}
            disabled={loading}
          >
            {COSTUME_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {costumeType === 'dress' && (
          <div className="form-group add-costume-attribute-group">
            <div>
              <label htmlFor="silhouette-select">ドレスのシルエット</label>
              <select
                id="silhouette-select"
                value={silhouette}
                onChange={(e) => setSilhouette(e.target.value as DressSilhouette)}
                disabled={loading}
              >
                {DRESS_SILHOUETTE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {SILHOUETTE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="attribute-guide-grid attribute-guide-grid--dress" aria-label="ドレスシルエットの図解">
              {DRESS_SILHOUETTE_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`attribute-guide-card${silhouette === value ? ' attribute-guide-card--active' : ''}`}
                  onClick={() => setSilhouette(value)}
                  disabled={loading}
                  aria-pressed={silhouette === value}
                >
                  <DressSilhouetteIcon value={value} />
                  <span>{SILHOUETTE_LABELS[value]}</span>
                  <small>{DRESS_SILHOUETTE_HELP[value]}</small>
                </button>
              ))}
            </div>
            <p className="add-costume-field-hint">
              色味をバラけさせるイベントでも、ラインを揃えて統一感を出せます。
            </p>
          </div>
        )}

        {costumeType === 'suit' && (
          <>
            <div className="form-group add-costume-attribute-group">
              <div>
                <label htmlFor="suit-style-select">スーツの形式</label>
                <select
                  id="suit-style-select"
                  value={suitStyle}
                  onChange={(e) => setSuitStyle(e.target.value as SuitStyle)}
                  disabled={loading}
                >
                  {SUIT_STYLE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {SUIT_STYLE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="attribute-guide-grid attribute-guide-grid--suit" aria-label="スーツ形式の図解">
                {SUIT_STYLE_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`attribute-guide-card${suitStyle === value ? ' attribute-guide-card--active' : ''}`}
                    onClick={() => setSuitStyle(value)}
                    disabled={loading}
                    aria-pressed={suitStyle === value}
                  >
                    <SuitStyleIcon value={value} />
                    <span>{SUIT_STYLE_LABELS[value]}</span>
                    <small>{SUIT_STYLE_HELP[value]}</small>
                  </button>
                ))}
              </div>
            </div>
            {suitStyle === 'tuxedo' && (
              <div className="form-group add-costume-attribute-group">
                <div>
                  <label htmlFor="suit-lapel-select">ラペル</label>
                  <select
                    id="suit-lapel-select"
                    value={suitLapel}
                    onChange={(e) => setSuitLapel(e.target.value as SuitLapel)}
                    disabled={loading}
                  >
                    {SUIT_LAPEL_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {SUIT_LAPEL_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="attribute-guide-grid attribute-guide-grid--suit" aria-label="タキシードラペルの図解">
                  {SUIT_LAPEL_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`attribute-guide-card${suitLapel === value ? ' attribute-guide-card--active' : ''}`}
                      onClick={() => setSuitLapel(value)}
                      disabled={loading}
                      aria-pressed={suitLapel === value}
                    >
                      <SuitLapelIcon value={value} />
                      <span>{SUIT_LAPEL_LABELS[value]}</span>
                      <small>{SUIT_LAPEL_HELP[value]}</small>
                    </button>
                  ))}
                </div>
                <p className="add-costume-field-hint">
                  タキシードは前釦よりも、ラペルの種類を揃えると見た目の統一感を出しやすくなります。
                </p>
              </div>
            )}

            {suitStyle === 'standard' && (
              <div className="form-group add-costume-attribute-group">
                <div>
                  <label htmlFor="suit-breasting-select">前釦</label>
                  <select
                    id="suit-breasting-select"
                    value={suitBreasting}
                    onChange={(e) => setSuitBreasting(e.target.value as SuitBreasting)}
                    disabled={loading}
                  >
                    {SUIT_BREASTING_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {SUIT_BREASTING_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="attribute-guide-grid attribute-guide-grid--breasting" aria-label="一般スーツ前釦の図解">
                  {SUIT_BREASTING_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`attribute-guide-card${suitBreasting === value ? ' attribute-guide-card--active' : ''}`}
                      onClick={() => setSuitBreasting(value)}
                      disabled={loading}
                      aria-pressed={suitBreasting === value}
                    >
                      <SuitBreastingIcon value={value} />
                      <span>{SUIT_BREASTING_LABELS[value]}</span>
                      <small>{SUIT_BREASTING_HELP[value]}</small>
                    </button>
                  ))}
                </div>
                <p className="add-costume-field-hint">
                  一般スーツ同士で、シングル/ダブルの揃えにも使えます。
                </p>
              </div>
            )}

            {suitStyle === 'tailcoat' && (
              <p className="add-costume-field-hint">
                燕尾は形式そのものが特徴になるため、追加の前釦指定は不要です。
              </p>
            )}
          </>
        )}
      </section>

      {/* Pattern Section */}
      <section className="section">
        <h2>🧵 柄</h2>
        <div className="form-group">
          <label>柄の種類</label>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            disabled={loading}
          >
            {PATTERN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Season Section */}
      <section className="section">
        <h2>🌸 季節</h2>
        <div className="form-group">
          <label>使いやすい季節</label>
          <div className="season-choice-grid" aria-label="使いやすい季節">
            {SEASON_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`season-choice${season.includes(option.value) ? ' season-choice--selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={season.includes(option.value)}
                  onChange={() => setSeason((current) => toggleListValue(current, option.value))}
                  disabled={loading}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="add-costume-field-hint">
            未選択の場合は、季節を限定しない衣装として扱います。
          </p>
        </div>
      </section>

      {/* Wearing Photos Section */}
      <section className="section">
        <h2>👗 着用写真</h2>
        {imageUri && (
          <div className="wearing-photo-main-action">
            <button
              type="button"
              className="secondary-action-button"
              onClick={handleUseMainImageAsWearingPhoto}
              disabled={loading || wearingPhotos.includes(imageUri)}
            >
              {wearingPhotos.includes(imageUri)
                ? '衣装写真を着用写真に追加済み'
                : '衣装写真を着用写真にも追加'}
            </button>
            <p className="add-costume-field-hint">
              衣装写真が着用状態の写真でもある場合に使えます。
            </p>
          </div>
        )}
        <div className="wearing-photo-upload">
          <input
            type="file"
            accept="image/*"
            onChange={handleAddWearingPhoto}
            disabled={loading}
            id="wearing-photo-input"
          />
          <label htmlFor="wearing-photo-input" className="upload-label">
            着用写真を追加
          </label>
        </div>

        {wearingPhotos.length > 0 && (
          <div className="wearing-photos-gallery">
            <h3>着用写真 ({wearingPhotos.length})</h3>
            <div className="photos-grid">
              {wearingPhotos.map((photo, index) => (
                <div key={index} className="photo-item">
                  <img src={photo} alt={`Wearing photo ${index + 1}`} />
                  <button
                    onClick={() => handleRemoveWearingPhoto(index)}
                    className="remove-photo-btn"
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={handleSave}
          disabled={loading || !name.trim() || !imageUri}
          className="save-button"
        >
          {loading ? '保存中...' : isEditMode ? '更新' : '保存'}
        </button>
        <button
          onClick={() => navigate('/costumes')}
          disabled={loading}
          className="cancel-button"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
