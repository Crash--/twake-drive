import flag from 'cozy-flags'

import {
  clientURLOf,
  creatablePointerApps,
  fillRoute,
  pointerAppOf
} from '@/modules/externalApps/pointerApps'

jest.mock('cozy-flags', () => jest.fn())
const flagMock = flag as unknown as jest.Mock

const boards = {
  slug: 'boards',
  name: 'Boards',
  client_url_flag: 'boards.client-url',
  pointers: [
    {
      mime: 'application/vnd.example.board',
      open: '/b/{externalId}/',
      create: '/b/new/?instance={instance}&dir_id={dirId}'
    }
  ]
}
const viewer = {
  slug: 'viewer',
  pointers: [{ mime: 'application/vnd.example.view', open: '/v/{externalId}' }]
}

describe('pointerApps', () => {
  it('finds the app of a pointer by the mime type the manifest declares', () => {
    const file = {
      name: 'Plan',
      mime: 'application/vnd.example.board',
      metadata: { externalId: 'b1' }
    }
    expect(pointerAppOf([viewer, boards], file)?.app.slug).toBe('boards')
    expect(pointerAppOf([viewer, boards], { ...file, metadata: {} })).toBeNull()
    expect(
      pointerAppOf([viewer, boards], { ...file, mime: 'text/plain' })
    ).toBeNull()
    expect(pointerAppOf(null, file)).toBeNull()
  })

  it('fills the paths of the manifest, each value encoded', () => {
    expect(
      fillRoute(boards.pointers[0].create, {
        instance: 'alice.example:8080',
        dirId: 'f 1'
      })
    ).toBe('/b/new/?instance=alice.example%3A8080&dir_id=f%201')
    expect(fillRoute('/b/{externalId}/{other}', { externalId: 'b1' })).toBe(
      '/b/b1/{other}'
    )
  })

  it('lists the apps that create documents', () => {
    expect(creatablePointerApps([viewer, boards]).map(p => p.app.slug)).toEqual(
      ['boards']
    )
  })

  it('reads the client URL from the flag the manifest names', () => {
    flagMock.mockReturnValue('https://boards.example/')
    expect(clientURLOf(boards)).toBe('https://boards.example')
    expect(flagMock).toHaveBeenCalledWith('boards.client-url')

    flagMock.mockReturnValue(null)
    expect(clientURLOf(boards)).toBeNull()
    expect(clientURLOf(viewer)).toBeNull()
  })
})
