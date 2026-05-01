import { useNavigate } from 'react-router-dom'
import './About.css'

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="about-container">
      <div className="about-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <h1 className="about-title">このアプリについて</h1>
      </div>

      <div className="about-content">
        <section className="about-intro">
          <h2>Costume Coordinator とは</h2>
          <p>
            Costume Coordinator は、グループイベント（コンサート、演劇、ダンスパフォーマンスなど）に参加するメンバーの衣装を効率的に管理し、
            イベントのテーマに合わせた最適な衣装の組み合わせを提案するアプリです。
          </p>
        </section>

        <section>
          <h2>主な機能</h2>
          <div className="features-list">
            <div className="feature-item">
              <h3>📅 イベント管理</h3>
              <p>
                イベントの日付、説明、参加者を管理します。
                イベントごとに色味やトーンなどのテーマ設定が可能です。
              </p>
            </div>

            <div className="feature-item">
              <h3>👗 衣装登録</h3>
              <p>
                メンバーの衣装を登録します。色、トーン、柄などの情報を記録して、
                最適な提案に活用します。
              </p>
            </div>

            <div className="feature-item">
              <h3>🎨 テーマ設定</h3>
              <p>
                イベントごとに色を統一するか、バラけさせるかを選択できます。
                パステル系、ビビッド系など、トーンの好みも設定可能です。
              </p>
            </div>

            <div className="feature-item">
              <h3>✨ 最適提案</h3>
              <p>
                イベントのテーマと参加者の希望を考慮して、
                最適な衣装の組み合わせを自動提案します。
              </p>
            </div>

            <div className="feature-item">
              <h3>☁️ クラウド同期</h3>
              <p>
                複数デバイス間でデータを自動同期します。
                シークレットモードでもログインすればデータが復元されます。
              </p>
            </div>

            <div className="feature-item">
              <h3>💾 自動バックアップ</h3>
              <p>
                Dropbox または Google Drive に自動的にバックアップします。
                万が一の時もデータが安全です。
              </p>
            </div>

            <div className="feature-item">
              <h3>📱 QR コード共有</h3>
              <p>
                イベント情報を QR コードで共有できます。
                参加者が QR コードをスキャンするだけで簡単に参加できます。
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2>使い方</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div>
                <h3>アカウント作成</h3>
                <p>メールアドレスでアカウントを作成します。</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div>
                <h3>衣装登録</h3>
                <p>
                  メンバーの衣装を登録します。
                  画像、色、トーン、柄などを入力します。
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div>
                <h3>イベント作成</h3>
                <p>
                  新しいイベントを作成し、テーマ設定を行います。
                  参加者を追加します。
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <div>
                <h3>衣装提案</h3>
                <p>
                  アプリが自動的に最適な衣装の組み合わせを提案します。
                  テーマに合った統一感のある衣装選びができます。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>開発者</h2>
          <p>
            Costume Coordinator は、グループイベントの衣装管理をより簡単に、
            より楽しくするために開発されました。
          </p>
        </section>

        <section className="app-info">
          <p style={{ fontSize: '12px', opacity: 0.7 }}>
            バージョン: 1.0.0
          </p>
          <p style={{ fontSize: '12px', opacity: 0.7 }}>
            最終更新日：2026年5月1日
          </p>
        </section>
      </div>
    </div>
  )
}
