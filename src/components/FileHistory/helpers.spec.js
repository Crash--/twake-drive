import { getDriveFileVersions } from './helpers'

describe('getDriveFileVersions', () => {
  it('keeps the versions of the included documents, newest first', () => {
    const response = {
      data: { id: 'f1', type: 'io.cozy.files' },
      included: [
        {
          id: 'f1/1-a',
          type: 'io.cozy.files.versions',
          attributes: { updated_at: '2026-11-05T10:00:00Z', size: '0' }
        },
        { id: 'd1', type: 'io.cozy.files', attributes: {} },
        {
          id: 'f1/3-b',
          type: 'io.cozy.files.versions',
          attributes: { updated_at: '2026-11-05T11:00:00Z', size: '12' }
        }
      ]
    }
    expect(getDriveFileVersions(response).map(v => v.id)).toEqual([
      'f1/3-b',
      'f1/1-a'
    ])
  })

  it('returns no version without a response', () => {
    expect(getDriveFileVersions(null)).toEqual([])
  })
})
