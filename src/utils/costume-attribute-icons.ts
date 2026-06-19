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
import type { DressSilhouette } from './silhouette'
import type { SuitBreasting, SuitLapel, SuitStyle } from './suit-attributes'

export const DRESS_SILHOUETTE_ICON_SRC: Record<DressSilhouette, string> = {
  a_line: dressSilhouetteALineIcon,
  princess: dressSilhouettePrincessIcon,
  slender: dressSilhouetteSlenderIcon,
  mermaid: dressSilhouetteMermaidIcon,
}

export const SUIT_STYLE_ICON_SRC: Record<SuitStyle, string> = {
  tuxedo: suitStyleTuxedoIcon,
  tailcoat: suitStyleTailcoatIcon,
  standard: suitStyleStandardIcon,
}

export const SUIT_LAPEL_ICON_SRC: Record<SuitLapel, string> = {
  notch: suitLapelNotchIcon,
  peak: suitLapelPeakIcon,
  shawl: suitLapelShawlIcon,
}

export const SUIT_BREASTING_ICON_SRC: Record<SuitBreasting, string> = {
  single: suitBreastingSingleIcon,
  double: suitBreastingDoubleIcon,
}
