import { describe, it, expect } from 'vitest'
import { buildClientReportHtml } from '../src/utils/client-costume-report'

describe('client costume report', () => {
  it('includes event name and participant costume images', () => {
    const html = buildClientReportHtml(
      { name: '春のコンサート', eventDate: '2024-05-15' },
      [
        {
          participantName: '太郎',
          costumeName: '赤いドレス',
          costumeImage: 'data:image/jpeg;base64,abc',
          colors: ['#ff0000'],
          tone: 'vivid',
          pattern: 'solid',
        },
      ],
    )

    expect(html).toContain('春のコンサート')
    expect(html).toContain('太郎')
    expect(html).toContain('赤いドレス')
    expect(html).toContain('data:image/jpeg;base64,abc')
    expect(html).toContain('衣装コーディネート提案')
  })

  it('shows placeholder when costume image is missing', () => {
    const html = buildClientReportHtml(
      { name: 'Test', eventDate: '2024-01-01' },
      [{ participantName: '花子', costumeName: '青スーツ', colors: [] }],
    )

    expect(html).toContain('写真なし')
    expect(html).toContain('花子')
  })
})
