import { render, screen } from '@testing-library/react'
import React from 'react'

import useBreakpoints from 'cozy-ui/transpiled/react/providers/Breakpoints'

import PublicToolbarByLink from './PublicToolbarByLink'

jest.mock('cozy-client', () => ({ useClient: jest.fn() }))
jest.mock('cozy-sharing', () => ({
  createCozySharingLink: {},
  useSharingInfos: () => ({})
}))
jest.mock('cozy-ui/transpiled/react/ActionsMenu/Actions', () => ({
  makeActions: () => []
}))
jest.mock('cozy-ui/transpiled/react/providers/Alert', () => ({
  useAlert: () => ({ showAlert: jest.fn() })
}))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => jest.fn())
jest.mock('twake-i18n', () => ({ useI18n: () => ({ t: key => key }) }))
jest.mock('@/components/Bar', () => ({
  BarRightOnMobile: ({ children }) => <div>{children}</div>
}))
jest.mock('@/hooks', () => ({
  useDisplayedFolder: () => ({ displayedFolder: { id: 'folder-1' } })
}))
jest.mock('@/modules/actions', () => ({}))
jest.mock('@/modules/drive/AddMenu/AddMenuProvider', () => ({ children }) => (
  <>{children}</>
))
jest.mock('@/modules/drive/Toolbar/components/AddButton', () => () => null)
jest.mock('@/modules/drive/Toolbar/components/ViewSwitcher', () => () => null)
jest.mock('@/modules/public/PublicToolbarMoreMenu', () => () => null)
jest.mock('@/modules/selection/SelectionProvider', () => ({
  useSelectionContext: () => ({})
}))
jest.mock('@/modules/upload/UploadButton', () => ({
  UploadButton: ({ isDirectory, displayedFolder, onUploaded }) =>
    isDirectory ? (
      <button data-testid="upload-folder" onClick={onUploaded}>
        {displayedFolder.id}
      </button>
    ) : null
}))

describe('PublicToolbarByLink folder upload entry', () => {
  const setup = props =>
    render(
      <PublicToolbarByLink
        files={[]}
        refreshFolderContent={jest.fn()}
        {...props}
      />
    )

  beforeEach(() => {
    useBreakpoints.mockReturnValue({ isMobile: false })
  })

  it('targets the shared folder with write access', () => {
    setup({ hasWriteAccess: true })

    expect(screen.getByTestId('upload-folder')).toHaveTextContent('folder-1')
  })

  it('is absent without write access', () => {
    setup({ hasWriteAccess: false })

    expect(screen.queryByTestId('upload-folder')).toBe(null)
  })

  it('is absent on a mobile viewport', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })
    setup({ hasWriteAccess: true })

    expect(screen.queryByTestId('upload-folder')).toBe(null)
  })
})
