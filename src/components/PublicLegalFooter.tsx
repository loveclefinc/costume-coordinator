import { Link } from 'react-router-dom'
import './PublicLegalFooter.css'

export default function PublicLegalFooter() {
  return (
    <footer className="public-legal-footer">
      <p className="public-app-name">CostumeCoordinator</p>
      <p className="public-app-tagline">グループイベントの衣装選択を最適化する Web アプリ</p>
      <nav className="public-legal-nav" aria-label="法的情報">
        <Link to="/terms-of-service">利用規約</Link>
        <Link to="/privacy-policy">プライバシーポリシー</Link>
        <Link to="/about">このアプリについて</Link>
      </nav>
    </footer>
  )
}
