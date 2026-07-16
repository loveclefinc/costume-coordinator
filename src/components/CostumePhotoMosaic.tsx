import { useEffect, useMemo, useState } from 'react'
import type { Costume } from '../utils/storage'
import './CostumePhotoMosaic.css'

interface CostumePhotoMosaicProps {
  costume: Pick<
    Costume,
    'id' | 'name' | 'image' | 'wearingPhotos' | 'componentCostumeIds' | 'componentCostumeNames'
  >
  className?: string
  priority?: boolean
  compact?: boolean
  showItemNames?: boolean
}

interface MosaicItem {
  image?: string
  name: string
}

function buildMosaicItems(costume: CostumePhotoMosaicProps['costume']): MosaicItem[] {
  const componentNames = (costume.componentCostumeNames ?? []).filter(Boolean)
  const componentCount = Math.max(
    componentNames.length,
    costume.componentCostumeIds?.length ?? 0,
  )
  const isCompleteOutfit = componentCount > 1

  if (!isCompleteOutfit) {
    return [{ image: costume.image || undefined, name: costume.name }]
  }

  const images = [costume.image, ...(costume.wearingPhotos ?? [])]
  return Array.from({ length: Math.min(Math.max(componentCount, 1), 5) }, (_, index) => ({
    image: images[index] || undefined,
    name: componentNames[index] || `構成アイテム ${index + 1}`,
  }))
}

export default function CostumePhotoMosaic({
  costume,
  className = '',
  priority = false,
  compact = false,
  showItemNames = true,
}: CostumePhotoMosaicProps) {
  const items = useMemo(() => buildMosaicItems(costume), [costume])
  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set())
  const isCompleteOutfit = items.length > 1

  useEffect(() => {
    setFailedImages(new Set())
  }, [costume.id, costume.image, costume.wearingPhotos])

  const classes = [
    'costume-photo-mosaic',
    isCompleteOutfit ? 'costume-photo-mosaic--outfit' : 'costume-photo-mosaic--single',
    compact ? 'costume-photo-mosaic--compact' : '',
    `costume-photo-mosaic--count-${Math.min(items.length, 5)}`,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      aria-label={isCompleteOutfit ? `${costume.name}の構成アイテム` : undefined}
    >
      {items.map((item, index) => {
        const imageFailed = failedImages.has(index)
        const showName = isCompleteOutfit && showItemNames

        return (
          <div className="costume-photo-mosaic__item" key={`${item.name}-${index}`}>
            {item.image && !imageFailed ? (
              <img
                src={item.image}
                alt={`${item.name}の写真`}
                width={480}
                height={360}
                loading={priority && index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={priority && index === 0 ? 'high' : undefined}
                onError={() => {
                  setFailedImages((current) => new Set(current).add(index))
                }}
              />
            ) : (
              <div
                className="costume-photo-mosaic__placeholder"
                role="img"
                aria-label={`${item.name}は写真なし`}
              >
                <span aria-hidden="true">◇</span>
                <small>写真なし</small>
              </div>
            )}
            {showName && <span className="costume-photo-mosaic__name">{item.name}</span>}
          </div>
        )
      })}
    </div>
  )
}
