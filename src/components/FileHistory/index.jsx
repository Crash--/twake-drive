import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useClient, useQuery } from 'cozy-client'

import { HistoryModal } from './HistoryModal'
import { getDriveFileVersions } from './helpers'

import {
  buildFileOrFolderByIdQuery,
  buildFileVersionsQuery,
  buildSharedDriveFileOrFolderByIdQuery
} from '@/queries'

// A member of a shared drive has no copy of the versions: the drive route
// returns them from the owner's instance.
const useDriveFileVersions = (driveId, fileId) => {
  const client = useClient()
  const [state, setState] = useState({ data: [], fetchStatus: 'loading' })
  useEffect(() => {
    if (!driveId) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await client
          .getStackClient()
          .fetchJSON('GET', `/sharings/drives/${driveId}/${fileId}`)
        if (!cancelled) {
          setState({ data: getDriveFileVersions(res), fetchStatus: 'loaded' })
        }
      } catch {
        if (!cancelled) setState({ data: [], fetchStatus: 'error' })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [client, driveId, fileId])
  return state
}

const FileHistory = () => {
  const { fileId, driveId } = useParams()

  const fileQuery = driveId
    ? buildSharedDriveFileOrFolderByIdQuery({ fileId, driveId })
    : buildFileOrFolderByIdQuery(fileId)
  const { data: file, fetchStatus: fileFetchStatus } = useQuery(
    fileQuery.definition,
    fileQuery.options
  )

  const revisionsQuery = buildFileVersionsQuery(driveId ? null : fileId)
  const localRevisions = useQuery(
    revisionsQuery.definition,
    revisionsQuery.options
  )
  const driveRevisions = useDriveFileVersions(driveId, fileId)
  const revisions = driveId ? driveRevisions.data : localRevisions.data
  const revisionsFetchStatus = driveId
    ? driveRevisions.fetchStatus
    : localRevisions.fetchStatus

  if (fileFetchStatus !== 'loaded') return null

  return (
    <HistoryModal
      file={file}
      revisions={revisions}
      revisionsFetchStatus={revisionsFetchStatus}
    />
  )
}

export default FileHistory
