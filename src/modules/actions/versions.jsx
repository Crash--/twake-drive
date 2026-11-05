import { Icon, History } from '@linagora/twake-icons'
import React, { forwardRef } from 'react'

import { isDocs, isFile } from 'cozy-client/dist/models/file'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import ListItemIcon from 'cozy-ui/transpiled/react/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'

import { navigateToModal } from '@/modules/actions/helpers'

const makeComponent = (label, icon) => {
  const Component = forwardRef((props, ref) => {
    return (
      <ActionsMenuItem {...props} ref={ref}>
        <ListItemIcon>
          <Icon icon={icon} />
        </ListItemIcon>
        <ListItemText primary={label} />
      </ActionsMenuItem>
    )
  })
  Component.displayName = 'Versions'

  return Component
}

export const versions = ({ t, navigate, pathname }) => {
  const label = t('SelectionBar.history')
  const icon = History

  return {
    name: 'history',
    label,
    icon,
    allowInfectedFiles: false,
    displayCondition: selection => {
      // A Docs pointer's history lives in Docs: the file only holds an export.
      return (
        selection.length === 1 && isFile(selection[0]) && !isDocs(selection[0])
      )
    },
    action: files => {
      return navigateToModal({ navigate, pathname, files, path: 'revision' })
    },
    Component: makeComponent(label, icon)
  }
}
