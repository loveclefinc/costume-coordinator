/** data URL を Blob に変換（登録済み衣装画像のサーバーアップロード用） */
export async function dataUrlToBlob(dataUrl: string): Promise<{ blob: Blob; contentType: string }> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return {
    blob,
    contentType: blob.type || 'image/jpeg',
  }
}
