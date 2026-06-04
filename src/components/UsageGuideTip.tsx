import type { ReactNode } from 'react'
import './UsageGuideTip.css'

interface UsageGuideTipProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function UsageGuideTip({ title, children, defaultOpen = false }: UsageGuideTipProps) {
  return (
    <details className="usage-guide-tip" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="usage-guide-tip-body">{children}</div>
    </details>
  )
}
