import { useNavigate, Link } from 'react-router-dom'
import PublicLegalFooter from '../components/PublicLegalFooter'
import './PrivacyPolicy.css'

export default function TermsOfService() {
  const navigate = useNavigate()

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <h1 className="privacy-policy-title">利用規約</h1>
      </div>

      <div className="privacy-policy-content">
        <section>
          <h2>1. はじめに</h2>
          <p>
            本利用規約（以下「本規約」）は、CostumeCoordinator（以下「本アプリ」）の利用条件を定めるものです。
            本アプリを利用するすべての方（以下「ユーザー」）は、本規約に同意したうえで本アプリを利用するものとします。
          </p>
        </section>

        <section>
          <h2>2. 本アプリについて</h2>
          <p>
            本アプリは、グループイベントにおける衣装の登録・管理・提案を支援する Web アプリケーション（PWA）です。
            衣装データは原則としてユーザーのブラウザ内（IndexedDB）に保存され、ユーザーが選択した場合にのみ
            Google Drive または Dropbox へ同期されます。
          </p>
        </section>

        <section>
          <h2>3. 利用資格</h2>
          <ul>
            <li>本規約に同意できる方</li>
            <li>法令に反せず本アプリを利用できる方</li>
            <li>13 歳未満の方は、保護者の同意を得たうえで利用してください</li>
          </ul>
        </section>

        <section>
          <h2>4. アカウント・データの管理</h2>
          <ul>
            <li>
              本アプリは、メールアドレス・パスワードによる独自アカウント登録を必須としません。
              データは利用中の端末のブラウザに保存されます。
            </li>
            <li>
              ブラウザのデータ削除、端末の変更、プライベートブラウズの利用などにより、
              ローカルデータが失われる場合があります。複数端末での利用にはクラウド同期の利用を推奨します。
            </li>
            <li>
              Google Drive または Dropbox への接続は OAuth 2.0 PKCE により行われ、
              接続の解除は設定画面から行えます。
            </li>
          </ul>
        </section>

        <section>
          <h2>5. 禁止事項</h2>
          <p>ユーザーは、本アプリの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul>
            <li>法令または公序良俗に反する行為</li>
            <li>他人の権利（著作権、肖像権、プライバシー等）を侵害するコンテンツの登録・共有</li>
            <li>本アプリまたは関連サービスの運営を妨害する行為</li>
            <li>不正アクセス、リバースエンジニアリング、過度な API 呼び出しなど技術的妨害</li>
            <li>虚偽の情報の登録、なりすまし</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2>6. ユーザーが登録するコンテンツ</h2>
          <ul>
            <li>
              ユーザーが登録する衣装画像・イベント情報・参加者情報などのコンテンツの権利はユーザーに帰属します。
            </li>
            <li>
              ユーザーは、登録するコンテンツについて必要な権利・同意を有していることを保証するものとします。
            </li>
            <li>
              運営者は、サービス提供・不具合対応・法令遵守のために必要な範囲でコンテンツを取り扱うことがあります。
            </li>
          </ul>
        </section>

        <section>
          <h2>7. 第三者サービス</h2>
          <p>
            本アプリは、Google Drive、Dropbox、Cloudflare など第三者のサービスと連携する場合があります。
            これらのサービスの利用には、各提供者の利用規約・プライバシーポリシーが適用されます。
            連携の有無はユーザーの選択によります。
          </p>
        </section>

        <section>
          <h2>8. 免責事項</h2>
          <ul>
            <li>
              本アプリは現状有姿で提供されます。衣装提案の結果の適合性、完全性、有用性について保証しません。
            </li>
            <li>
              データの消失、同期の遅延・失敗、第三者サービスの障害等により生じた損害について、
              運営者の故意または重過失がある場合を除き、責任を負いません。
            </li>
            <li>
              ユーザーは、重要なデータについて適宜バックアップを行う責任を負います。
            </li>
          </ul>
        </section>

        <section>
          <h2>9. サービスの変更・中断・終了</h2>
          <p>
            運営者は、ユーザーへの事前通知なく、本アプリの内容変更、一時中断、提供終了を行う場合があります。
            ただし、可能な範囲でアプリ内または公開ページで告知します。
          </p>
        </section>

        <section>
          <h2>10. 個人情報の取り扱い</h2>
          <p>
            個人情報の取り扱いについては、
            <Link to="/privacy-policy">プライバシーポリシー</Link>
            に定めるとおりとします。
          </p>
        </section>

        <section>
          <h2>11. 規約の変更</h2>
          <p>
            運営者は、必要に応じて本規約を変更できます。変更後の規約は、本アプリ上に掲示した時点から効力を生じます。
            変更後も本アプリを利用し続けた場合、変更に同意したものとみなします。
          </p>
        </section>

        <section>
          <h2>12. 準拠法・管轄</h2>
          <p>
            本規約は日本法に準拠します。本アプリに関して紛争が生じた場合、運営者の所在地を管轄する裁判所を
            第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        <section>
          <h2>13. お問い合わせ</h2>
          <p>
            本規約に関するお問い合わせは、GitHub リポジトリ
            （<a href="https://github.com/loveclefinc/costume-coordinator" target="_blank" rel="noopener noreferrer">loveclefinc/costume-coordinator</a>
            ）の Issues よりご連絡ください。
          </p>
        </section>

        <div className="last-updated">
          <p>制定日：2026年6月9日</p>
        </div>
        <PublicLegalFooter />
      </div>
    </div>
  )
}
