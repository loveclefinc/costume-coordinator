export interface UploadPersistenceSteps {
  putObject: () => Promise<void>
  insertRecord: () => Promise<void>
  deleteObject: () => Promise<void>
}

/**
 * R2 と D1 を疑似トランザクションとして扱う。
 * R2 保存後に D1 記録が失敗した場合は、同じ R2 object だけを補償削除して孤児化を防ぐ。
 */
export async function persistUploadWithRollback(steps: UploadPersistenceSteps): Promise<void> {
  await steps.putObject()
  try {
    await steps.insertRecord()
  } catch (error) {
    try {
      await steps.deleteObject()
    } catch (rollbackError) {
      console.error('R2 rollback failed after D1 insert failure', rollbackError)
    }
    throw error
  }
}
