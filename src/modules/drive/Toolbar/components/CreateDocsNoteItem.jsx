import React, { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { Icon, FileTypeText } from '@linagora/twake-icons'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import ListItemIcon from 'cozy-ui/transpiled/react/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import { useAlert } from 'cozy-ui/transpiled/react/providers/Alert'
import { useI18n } from 'twake-i18n'

import { ROOT_DIR_ID, TRASH_DIR_ID } from '@/constants/config'

const CreateDocsNoteItem = ({ isReadOnly, onClick }) => {
  const { folderId = ROOT_DIR_ID, driveId = undefined } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { showAlert } = useAlert()

  const _folderId = folderId === TRASH_DIR_ID ? ROOT_DIR_ID : folderId

  const handleClick = useCallback(() => {
    if (isReadOnly) {
      showAlert({
        message: t(
          'AddMenu.readOnlyFolder',
          'This is a read-only folder. You cannot perform this action.'
        ),
        severity: 'warning',
        duration: 4000
      })
      onClick()
      return
    }

    navigate(
      driveId
        ? `/docsnote/create/${driveId}/${_folderId}`
        : `/docsnote/create/${_folderId}`
    )
  }, [isReadOnly, showAlert, t, onClick, navigate, driveId, _folderId])

  return (
    <ActionsMenuItem data-testid="create-a-docsnote" onClick={handleClick}>
      <ListItemIcon>
        <Icon icon={FileTypeText} />
      </ListItemIcon>
      <ListItemText primary="Note Docs" />
    </ActionsMenuItem>
  )
}

export default React.memo(CreateDocsNoteItem)
