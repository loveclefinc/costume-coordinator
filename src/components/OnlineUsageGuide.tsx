import { Link } from 'react-router-dom'
import './OnlineUsageGuide.css'

export default function OnlineUsageGuide() {
  return (
    <article className="online-usage-guide">
      <header className="online-usage-guide-header">
        <h1>オンライン提出の使い方</h1>
        <p>
          代表者がイベントを作り、参加者が URL から写真を提出し、代表者が取り込んで最適化する流れです。
        </p>
      </header>

      <section>
        <h2>代表者（主催）</h2>
        <ol>
          <li>
            <strong>イベント管理</strong> → 新しいイベント → <strong>代表者名</strong>を入力 →
            「オンライン提出」をオンにして作成
          </li>
          <li>
            作成直後: <strong>招待 URL</strong>をコピーして参加者へ送る（LINE 等）
          </li>
          <li>
            <strong>管理者トークン</strong>も同時にコピーして安全な場所に保存（別端末・再インストール用）
          </li>
          <li>
            <strong>代表者として写真を提出</strong>から、自分の衣装写真をアップロード（サーバー登録済みのため参加登録は不要）
          </li>
          <li>参加者の提出後、イベント詳細 → <strong>サーバーから提出を取り込む</strong></li>
          <li><strong>最適化</strong>で衣装の組み合わせを決める</li>
        </ol>
      </section>

      <section>
        <h2>参加者</h2>
        <ol>
          <li>代表者から受け取った<strong>招待 URL をそのまま</strong>スマホで開く（リンク全体が必要です）</li>
          <li>表示名を入力して参加登録（代表者は作成時に自動登録済みのため不要）</li>
          <li>衣装名・色などを入力し、写真をアップロード（枚数・容量制限あり）</li>
        </ol>
      </section>

      <section>
        <h2>管理者トークンを失ったとき</h2>
        <ul>
          <li>作成時に表示されたトークンのバックアップがあれば、イベント詳細で「取り込み」時に貼り付け可能</li>
          <li>同じ端末・同じブラウザなら、多くの場合は自動で保存されています</li>
          <li>バックアップも端末もない場合は<strong>再発行できません</strong>。新しいオンラインイベントの作成が必要です</li>
        </ul>
      </section>

      <section>
        <h2>保存期限</h2>
        <p>
          写真はサーバーに一時保存され、期限後に自動削除されます。イベント詳細の
          <strong>+7日延長</strong>で延ばせます（作成から最大14日）。
        </p>
      </section>

      <p className="online-usage-guide-back">
        <Link to="/events">← イベント管理へ</Link>
      </p>
    </article>
  )
}
