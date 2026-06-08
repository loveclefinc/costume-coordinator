import type { CloudProvider } from '../types'

/** クラウドから画像インポート時にユーザーへ表示するフォルダ案内 */
export function getCloudImageFolderHelp(provider: CloudProvider): string {
  if (provider === 'dropbox') {
    return 'Dropbox の「アプリ」→「CostumeCoordinator」フォルダに画像を置くと、ここから選べます。Dropbox 全体の写真は表示されません。'
  }
  return 'Google Drive の「CostumeCoordinator」フォルダに画像を置くと、ここから選べます。'
}

export function getCloudImageFolderSteps(provider: CloudProvider): string[] {
  if (provider === 'dropbox') {
    return [
      'Dropbox アプリまたは dropbox.com を開く',
      '左メニューの「アプリ」を開く',
      '「CostumeCoordinator」フォルダに衣装の画像をアップロード',
      'この画面で画像を選択する',
    ]
  }
  return [
    'Google Drive を開く',
    '「CostumeCoordinator」フォルダを開く（なければ同期後に自動作成されます）',
    '衣装の画像をフォルダにアップロード',
    'この画面で画像を選択する',
  ]
}
