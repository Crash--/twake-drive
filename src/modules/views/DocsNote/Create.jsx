import React, { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { useClient } from 'cozy-client'
import { uploadFileWithConflictStrategy } from 'cozy-client/dist/models/file'
import Dialog, { DialogContent } from 'cozy-ui/transpiled/react/Dialog'
import Spinner from 'cozy-ui/transpiled/react/Spinner'

import Oops from '@/components/Error/Oops'
import logger from '@/lib/logger'
import {
  DOCSNOTE_EXTENSION,
  DOCSNOTE_MIME,
  makeDocsNoteFileRoute
} from '@/modules/views/DocsNote/helpers'

// An empty body is a valid empty Yjs document: the collab server seeds nothing
// and BlockNote starts from a blank page.
const Create = () => {
  const { folderId, driveId = undefined } = useParams()
  const client = useClient()
  const [state, setState] = useState({ status: 'pending', fileId: null })

  useEffect(() => {
    let cancelled = false
    const create = async () => {
      try {
        const { data } = await uploadFileWithConflictStrategy(client, '', {
          name: `Note Docs.${DOCSNOTE_EXTENSION}`,
          dirId: folderId,
          conflictStrategy: 'rename',
          driveId,
          contentType: DOCSNOTE_MIME
        })
        if (!cancelled) setState({ status: 'loaded', fileId: data.id })
      } catch (error) {
        logger.error(`Creating Docs note failed: ${error}`)
        if (!cancelled) setState({ status: 'error', fileId: null })
      }
    }
    create()
    return () => {
      cancelled = true
    }
  }, [client, folderId, driveId])

  if (state.status === 'error') return <Oops />

  if (state.status === 'loaded') {
    const url = makeDocsNoteFileRoute(state.fileId, {
      driveId,
      fromPathname: driveId
        ? `/shareddrive/${driveId}/${folderId}`
        : `/folder/${folderId}`
    })
    return <Navigate to={url} replace />
  }

  return (
    <Dialog open={true} fullScreen transitionDuration={0}>
      <DialogContent className="u-flex u-flex-column u-flex-items-center u-flex-justify-center">
        <Spinner size="xxlarge" middle={true} />
      </DialogContent>
    </Dialog>
  )
}

export default React.memo(Create)
