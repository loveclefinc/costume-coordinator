import { useNavigate } from 'react-router-dom'
import PublicLegalFooter from '../components/PublicLegalFooter'
import './PrivacyPolicy.css'

export default function CommercialTransactions() {
  const navigate = useNavigate()

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <h1 className="privacy-policy-title">特定商取引法に基づく表記</h1>
      </div>

      <div className="privacy-policy-content">
        <section>
          <h2>販売について</h2>
          <p>
            Costume Coordinator は、現在、本アプリ内で有料商品の販売、課金、サブスクリプションの提供を行っていません。
            そのため、販売価格、商品代金以外の必要料金、支払方法、引き渡し時期、返品・キャンセル条件は該当しません。
          </p>
        </section>

        <section>
          <h2>サービス名</h2>
          <p>Costume Coordinator</p>
        </section>

        <section>
          <h2>運営者</h2>
          <p>loveclefinc / l-clef</p>
        </section>

        <section>
          <h2>お問い合わせ</h2>
          <p>
            本表記に関するお問い合わせは、GitHub リポジトリ
            （<a href="https://github.com/loveclefinc/costume-coordinator" target="_blank" rel="noopener noreferrer">loveclefinc/costume-coordinator</a>
            ）の Issues よりご連絡ください。
          </p>
        </section>

        <section>
          <h2>今後有料機能を提供する場合</h2>
          <p>
            有料機能、販売、サブスクリプション等を開始する場合は、提供開始前に必要な表示事項を追記し、
            販売条件を確認できる状態にします。
          </p>
        </section>

        <div className="last-updated">
          <p>制定日：2026年6月14日</p>
        </div>
        <PublicLegalFooter />
      </div>
    </div>
  )
}
