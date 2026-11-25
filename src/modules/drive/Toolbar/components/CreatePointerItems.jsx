import React from 'react'

import { useClient } from 'cozy-client'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import ListItemIcon from 'cozy-ui/transpiled/react/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import { useAlert } from 'cozy-ui/transpiled/react/providers/Alert'
import AppIcon from 'cozy-ui-plus/dist/AppIcon'
import { useI18n } from 'twake-i18n'

import { displayedFolderOrRootFolder } from '@/hooks/helpers'
import {
  clientURLOf,
  creatablePointerApps,
  fillRoute
} from '@/modules/externalApps/pointerApps'
import { usePointerApps } from '@/modules/externalApps/usePointerApps'

/**
 * One "create" entry per app whose manifest declares a pointer it creates: the
 * app, at its client URL, creates the document and has its pointer written in
 * the displayed folder.
 */
const CreatePointerItems = ({ displayedFolder, isReadOnly, onClick }) => {
  const client = useClient()
  const { t } = useI18n()
  const { showAlert } = useAlert()
  const { apps } = usePointerApps()

  return creatablePointerApps(apps)
    .map(pointer => ({ ...pointer, baseURL: clientURLOf(pointer.app) }))
    .filter(({ baseURL }) => baseURL)
    .map(({ app, route, baseURL }) => {
      const handleClick = () => {
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
        window.location.href = `${baseURL}${fillRoute(route.create, {
          instance: new URL(client.getStackClient().uri).host,
          dirId: displayedFolderOrRootFolder(displayedFolder)._id
        })}`
      }

      return (
        <ActionsMenuItem
          key={`${app.slug}-${route.mime}`}
          onClick={handleClick}
        >
          <ListItemIcon>
            <AppIcon app={app} className="u-w-1 u-h-1" />
          </ListItemIcon>
          <ListItemText primary={app.name ?? app.slug} />
        </ActionsMenuItem>
      )
    })
}

export default CreatePointerItems
