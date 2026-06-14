import { Link } from 'react-router-dom'
import { APP_DISPLAY_NAME } from '../constants/app-brand'
import './PublicLegalFooter.css'

type PublicLegalFooterProps = {
  /** welcome などグラデーション背景上では onDark */
  tone?: 'default' | 'onDark'
}

export default function PublicLegalFooter({ tone = 'default' }: PublicLegalFooterProps) {
  return (
    <footer className={`public-legal-footer${tone === 'onDark' ? ' public-legal-footer--on-dark' : ''}`}>
      <p className="public-app-name">{APP_DISPLAY_NAME}</p>
      <p className="public-app-tagline">グループイベントの衣装選択を最適化する Web アプリ</p>
      <nav className="public-legal-nav" aria-label="法的情報">
        <Link to="/terms-of-service">利用規約</Link>
        <Link to="/privacy-policy">プライバシーポリシー</Link>
        <Link to="/commercial-transactions">特定商取引法に基づく表記</Link>
        <Link to="/about">このアプリについて</Link>
      </nav>
    </footer>
  )
}
