# Ensemble AI — Build Week提出動画

OpenAI Build Week 2026の提出用デモ動画を、実際のローカルPWA画面とプライバシーに配慮した合成衣装画像から再生成するための記録です。完成版は日本語ナレーション、焼き込み英語字幕、1280×720、2分23.96秒です。

生成物はサイズが大きいためGitへコミットしません。シーン定義、ナレーション・字幕生成、Canvas動画レンダラー、ローカル保存サーバー、合成衣装画像の生成コードだけを追跡します。

## 完成ファイル

ローカルの`build-week-video-output/`に次を生成します。

| ファイル | 用途 |
| --- | --- |
| `ensemble-ai-build-week-ja-en.mp4` | YouTube / Devpost提出用。H.264 High、AAC、1280×720、30fps |
| `ensemble-ai-build-week-ja-en.webm` | ブラウザで作成する中間録画。VP9 / Opus |
| `ensemble-ai-en.srt` | 日本語ナレーションの完全英訳。YouTubeへ追加する英語字幕トラック |
| `narration-ja.txt` | 日本語ナレーション原稿 |
| `narration.wav` | macOS音声合成で作る日本語ナレーション |
| `timeline.json` | 実測した音声長を含むシーン時間 |

`build-week-video-output/`は`.gitignore`対象です。公開リポジトリ、Cloudflare、公開アプリへ動画素材や認証情報を送る処理はありません。

## 動画で示す事実

- Build Week前: 単品衣装登録・検索、イベント招待、オンライン提出、決定的なグループ割り当て
- Build Week追加・強化: 確認可能な写真入力、お気に入り完成コーデ、自動コーデ提案、複数構成品の提出・結果表示
- 実演結果: ドレス、スーツ＋ワイシャツ＋ネクタイ、ブラウス＋スカート＋ブローチを3人へ1組ずつ割り当て
- 最終決定: GPTではなく既存の決定的最適化エンジン
- GPT-5.6 Sol: PM、製品・プライバシー・セキュリティ判断、レビュー
- GPT-5.6 Luna: React / TypeScript / Worker実装
- Codex: リポジトリ監査、編集、テスト、ビルド、ブラウザ確認、文書化、Git追跡
- 公開アプリの実行時: OpenAI API、APIキー、モデル推論、従量トークン費用なし

アプリ実行時にGPT-5.6が写真を解析したとは説明しません。写真属性候補と自動コーデ提案は端末内の決定的処理です。

## 再生成環境

- macOS（`say`、`Kyoko`音声、`afconvert`）
- Python 3.9以上と、固定した`Pillow==11.3.0`
- Node.jsと、Canvas `captureStream` / MediaRecorderのVP9・Opusに対応するChrome系ブラウザ
- FFmpeg。完成版ではnpmの`ffmpeg-static@5.2.0`が提供するバイナリを使用

依存物をリポジトリ外の一時ディレクトリへ用意します。

```bash
python3 -m venv /private/tmp/ensemble-ai-video-venv
/private/tmp/ensemble-ai-video-venv/bin/pip install \
  --requirement tools/build-week-video/requirements.txt

npm install \
  --prefix /private/tmp/ensemble-ai-video-ffmpeg \
  ffmpeg-static@5.2.0
```

FFmpegの実体は`/private/tmp/ensemble-ai-video-ffmpeg/node_modules/ffmpeg-static/ffmpeg`です。システムに互換FFmpegがある場合は、そのパスへ置き換えられます。

## 安全なデモ素材

合成衣装画像は人物、実在イベント、ロゴ、位置情報、外部素材を含みません。

```bash
/private/tmp/ensemble-ai-video-venv/bin/python \
  tools/generate-build-week-demo-assets.py \
  /private/tmp/ensemble-ai-demo-assets
```

このスクリプトはPillowを使用します。生成されるのはネイビースーツ、白シャツ、ボルドーネクタイ、アイボリーブラウス、ネイビースカート、ゴールドブローチ、青いAラインドレスのPNGです。

ローカルPWAへこの7点を登録し、実際のUIで次の画面を1280×720で撮影して`/private/tmp/ensemble-ai-video/raw/`へ置きます。

```text
photo-upload-empty.png
photo-upload-analyzed.png
photo-review-fields.png
manual-review.png
auto-suggestions.png
favorite-review.png
favorite-saved.png
final-results.png
harmony-score.png
```

動画作成時のデモではブラウザの「この端末だけ」を選び、IndexedDB内の専用データだけを使用しました。公開Worker、D1、R2、本番利用者データ、OpenAI APIには接続していません。

## 再生成手順

### 1. ナレーション、タイムライン、SRTを作る

macOSの`Kyoko`音声と`afconvert`を使います。別音声を使う場合も、`timeline.json`は実測音声長から再計算されます。

```bash
/private/tmp/ensemble-ai-video-venv/bin/python \
  tools/build-week-video/build_narration.py \
  --scenes tools/build-week-video/scenes.json \
  --output build-week-video-output \
  --voice Kyoko \
  --rate 205
```

### 2. ブラウザでWebMを録画する

```bash
node tools/build-week-video/render-server.mjs \
  --assets /private/tmp/ensemble-ai-video/raw \
  --build build-week-video-output
```

`http://127.0.0.1:4175/`をChrome系ブラウザで開き、`Render submission video`を押します。ナレーションの実時間だけレンダリングし、完了後にWebMをローカル保存します。

### 3. YouTube向けMP4へ変換する

```bash
/private/tmp/ensemble-ai-video-ffmpeg/node_modules/ffmpeg-static/ffmpeg \
  -hide_banner -y -fflags +genpts \
  -i build-week-video-output/ensemble-ai-build-week-ja-en.webm \
  -map 0:v:0 -map 0:a:0 \
  -vf fps=30,format=yuv420p \
  -c:v libx264 -preset medium -crf 19 \
  -c:a aac -b:a 160k -ar 48000 \
  -af aresample=async=1:first_pts=0,volume=7dB \
  -movflags +faststart -shortest \
  build-week-video-output/ensemble-ai-build-week-ja-en.mp4
```

### 4. 再生とメディア情報を検証する

`http://127.0.0.1:4175/verify.html`はMP4を、`?format=webm`は中間WebMを読み込みます。映像だけを自動再生してフレーム進行を確認する場合は`?autoplay=1`を使います。

```bash
/private/tmp/ensemble-ai-video-ffmpeg/node_modules/ffmpeg-static/ffmpeg \
  -hide_banner \
  -i build-week-video-output/ensemble-ai-build-week-ja-en.mp4 \
  -f null -
```

2026-07-18に完成版を全編デコードし、次を確認しました。

- 長さ: 00:02:23.96（3分未満）
- 映像: H.264 High、yuv420p、1280×720、30fps
- 音声: AAC LC、48kHz、stereo、157kb/s
- 全4318フレームをエラーなくデコード
- ナレーション音量: -15.28 LUFS、true peak -1.87dBFS
- 日本語ナレーションと焼き込み英語字幕をブラウザで再生確認

## YouTube / Devpost提出

推奨タイトル:

```text
Ensemble AI — OpenAI Build Week 2026 Demo
```

推奨説明:

```text
Ensemble AI extends Costume Coordinator to turn real wardrobes into complete, explainable group outfit assignments.

Built during OpenAI Build Week 2026 with GPT-5.6 Sol, GPT-5.6 Luna, and Codex. Runtime photo attributes and outfit proposals are processed deterministically on device; no OpenAI API key or per-use token cost is required.

Repository: https://github.com/loveclefinc/costume-coordinator
```

`Demo: https://dress.l-clef.com/`は、Build Week版を本番公開し、公開URLでスモークテストが終わった後だけ追加します。旧公開版のまま提出説明へ載せません。

1. `ensemble-ai-build-week-ja-en.mp4`をYouTubeへ公開設定でアップロードする。
2. 映像には読みやすい英語要約を焼き込み済み。日本語ナレーションの完全英訳である`ensemble-ai-en.srt`も英語字幕トラックとして追加する。
3. YouTube URLをDevpostのDemo videoへ登録する。
4. 動画説明、Devpost本文、READMEで、GPT-5.6とCodexは開発工程に使用し、実行時APIではないことを統一する。
5. URLに招待トークンや管理者トークンがないこと、実在利用者の写真がないことを公開前に再確認する。

YouTubeへのアップロードとDevpostへのURL登録は、所有者アカウントで公開操作を行う工程です。このリポジトリの生成ツールは外部サービスへアップロードしません。
