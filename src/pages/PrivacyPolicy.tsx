import { useNavigate } from 'react-router-dom'
import PublicLegalFooter from '../components/PublicLegalFooter'
import './PrivacyPolicy.css'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <h1 className="privacy-policy-title">プライバシーポリシー</h1>
      </div>

      <div className="privacy-policy-content">
        <section>
          <h2>1. 概要</h2>
          <p>
            Costume Coordinator（以下「本アプリ」）は、グループイベントの衣装管理を支援するアプリケーションです。
            本プライバシーポリシーは、本アプリの利用者（以下「ユーザー」）の個人情報の取り扱いについて説明します。
          </p>
        </section>

        <section>
          <h2>2. 収集する情報</h2>
          <p>本アプリは、以下の情報を収集します：</p>
          <ul>
            <li><strong>アカウント情報</strong>：メールアドレス、パスワード（暗号化）</li>
            <li><strong>イベント情報</strong>：イベント名、日付、説明、テーマ設定</li>
            <li><strong>衣装情報</strong>：衣装の画像、色、トーン、柄などの属性</li>
            <li><strong>参加者情報</strong>：イベント参加者の名前、衣装の希望順位</li>
            <li><strong>使用履歴</strong>：衣装の使用日時、イベント参加者</li>
          </ul>
        </section>

        <section>
          <h2>3. 情報の使用目的</h2>
          <p>収集した情報は、以下の目的でのみ使用します：</p>
          <ul>
            <li>本アプリの機能提供（イベント管理、衣装提案など）</li>
            <li>複数デバイス間でのデータ同期</li>
            <li>ユーザーアカウントの管理</li>
            <li>バックアップサービス（Dropbox、Google Drive）の提供</li>
            <li>本アプリの改善と最適化</li>
          </ul>
        </section>

        <section>
          <h2>4. 写真解析とオンライン提出について</h2>
          <p>
            衣装写真から色・トーン・柄の入力候補を作る処理は、ユーザーのブラウザ内で行います。
            この端末内解析のために写真を外部のAIサービスへ送信することはありません。
            入力候補はユーザーが確認・修正でき、解析を使わず手入力することもできます。
          </p>
          <p>
            ユーザーがオンライン提出を利用する場合、Cloudflare Workers が通信とアクセス確認を担い、
            D1 にイベント・参加者・衣装属性などの構造化データ、R2 に提出写真を一時保管します。
            データへのアクセスは、管理用または参加者用のトークン等を確認する Worker 経由に限定します。
          </p>
          <p>
            オンライン提出データは、イベントの保存期限まで（作成から最大14日）一時保管し、
            期限後は定期処理で D1 と R2 から削除します。管理者が期限前にイベントを削除した場合も対象データを削除します。
          </p>
        </section>

        <section>
          <h2>5. 情報の保護</h2>
          <p>
            本アプリは、ユーザーの情報を保護するため、以下の対策を実施しています：
          </p>
          <ul>
            <li>OAuth 2.0 PKCE によるクラウド接続（Client Secret 不使用）</li>
            <li>IndexedDB へのローカル保存と、接続時のみ Google Drive / Dropbox への同期</li>
            <li>HTTPS通信による暗号化</li>
            <li>定期的なセキュリティ監査</li>
          </ul>
        </section>

        <section>
          <h2>6. 第三者との情報共有</h2>
          <p>
            本アプリは、以下の場合を除き、ユーザーの情報を第三者と共有しません：
          </p>
          <ul>
            <li>ユーザーが明示的に同意した場合</li>
            <li>法律により要求された場合</li>
            <li>バックアップサービス（Dropbox、Google Drive）の提供のため</li>
            <li>オンライン提出基盤（Cloudflare）の提供のため</li>
          </ul>
        </section>

        <section>
          <h2>7. バックアップサービスについて</h2>
          <p>
            ユーザーがバックアップサービス（Dropbox または Google Drive）を有効にした場合、
            イベントと衣装データは選択されたサービスにバックアップされます。
            各サービスのプライバシーポリシーに従い、データが保護されます。
          </p>
        </section>

        <section>
          <h2>8. ユーザーの権利</h2>
          <p>ユーザーは、以下の権利を有します：</p>
          <ul>
            <li>自分の個人情報へのアクセス権</li>
            <li>不正確な情報の修正権</li>
            <li>情報の削除権（アカウント削除）</li>
            <li>データのエクスポート権</li>
          </ul>
        </section>

        <section>
          <h2>9. クッキーとローカルストレージ</h2>
          <p>
            本アプリは、ブラウザのローカルストレージを使用して、
            ユーザーの設定情報やセッション情報を保存します。
            ユーザーはブラウザの設定からこれらのデータを削除できます。
          </p>
        </section>

        <section>
          <h2>10. ポリシーの変更</h2>
          <p>
            本プライバシーポリシーは、予告なく変更される場合があります。
            変更があった場合、本アプリ内で通知します。
          </p>
        </section>

        <section>
          <h2>11. お問い合わせ</h2>
          <p>
            本プライバシーポリシーに関するご質問やご不明な点がある場合は、
            本アプリのお問い合わせフォームからご連絡ください。
          </p>
        </section>

        <div className="last-updated">
          <p>最終更新日：2026年7月17日</p>
        </div>
        <PublicLegalFooter />
      </div>
    </div>
  )
}
