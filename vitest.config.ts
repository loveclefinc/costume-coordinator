import { defineConfig } from 'vitest/config'

/** 公開リポジトリに含めないレガシー・内部テスト（ローカルに残っていても実行しない） */
const EXCLUDED_TESTS = [
  'tests/auth.logout.test.ts',
  'tests/supabase-credentials.test.ts',
  'tests/firebase-sync.test.ts',
  'tests/participant-sync.test.ts',
  'tests/data-migration.test.ts',
  'tests/costume-statistics.test.ts',
  'tests/image-recognition.test.ts',
  'tests/event-history.test.ts',
  'tests/i18n.test.ts',
  'tests/offline-sync.test.ts',
  'tests/advanced-recommendation.test.ts',
]

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [...EXCLUDED_TESTS, 'node_modules', 'dist'],
  },
})
