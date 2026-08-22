export interface UploadPersistenceSteps {
  putObject: () => Promise<void>
  insertRecord: () => Promise<void>
  deleteObject: () => Promise<void>
}

/**
 * R2 と D1 を疑似トランザクションとして扱う。
 * R2 保存後に D1 記録が失敗した場合は、同じ R2 object を補償削除して孤児化を防ぐ。
 */
export async function persistUploadWithRollback(steps: UploadPersistenceSteps): Promise<void> {
  await steps.putObject()
  try {
    await steps.insertRecord()
  } catch (error) {
    try {
      await steps.deleteObject()
    } catch {
      // 元の D1 エラーを優先して上位へ返す。削除失敗は次回の保守監査対象。
    }
    throw error
  }
}
