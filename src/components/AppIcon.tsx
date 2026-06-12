import { resolveAppPath } from '../constants/app-brand'
import './AppIcon.css'

const ICON_ASSETS = {
  sm: '/icon-64.png',
  md: '/apple-touch-icon.png',
  lg: '/icon-192.png',
} as const

const ICON_PX = {
  sm: 32,
  md: 56,
  lg: 80,
} as const

export type AppIconSize = keyof typeof ICON_ASSETS

type AppIconProps = {
  size?: AppIconSize
  className?: string
}

export default function AppIcon({ size = 'sm', className }: AppIconProps) {
  const px = ICON_PX[size]

  return (
    <img
      src={resolveAppPath(ICON_ASSETS[size])}
      alt=""
      width={px}
      height={px}
      className={['app-icon', `app-icon--${size}`, className].filter(Boolean).join(' ')}
      decoding="async"
    />
  )
}
