import React from 'react'
import { useParams } from 'react-router-dom'

import { isQueryLoading, useQuery } from 'cozy-client'
import { useSharingContext } from 'cozy-sharing'
import Dialog from 'cozy-ui/transpiled/react/Dialog'

import Oops from '@/components/Error/Oops'
import Loader from '@/components/Loader'
import useHead from '@/components/useHead'
import DocsNoteEditor from '@/modules/views/DocsNote/DocsNoteEditor'
import EditorTitle from '@/modules/views/editor/EditorTitle'
import { RedirectEditor } from '@/modules/views/editor/RedirectEditor'
import { makeEditorFileQuery } from '@/modules/views/editor/queries'

const Editor = ({ fileId, driveId, isPublic, isReadOnly }) => {
  const query = makeEditorFileQuery(fileId, driveId, isPublic)
  const fileQuery = useQuery(query.definition, query.options)
  const file = Array.isArray(fileQuery.data)
    ? fileQuery.data[0]
    : fileQuery.data

  if (isQueryLoading(fileQuery)) return <Loader />
  if (!file) return <Oops />

  return (
    <>
      <EditorTitle
        file={file}
        dataTestId="docsnote-title"
        isPublic={isPublic}
        isReadOnly={isReadOnly}
      />
      <DocsNoteEditor
        key={file._id}
        file={file}
        isPublic={isPublic}
        isReadOnly={isReadOnly}
      />
    </>
  )
}

// A shared-drive member is sent by RedirectEditor to the owner's instance
// (public page + sharecode), so the editor always runs where the file lives.
const DocsNote = ({ isPublic = false, isReadOnly = false }) => {
  const { fileId, driveId } = useParams()
  const { hasWriteAccess } = useSharingContext()
  useHead()

  const readOnly = isPublic ? isReadOnly : !hasWriteAccess(fileId, driveId)

  return (
    <Dialog open={true} fullScreen transitionDuration={0}>
      <RedirectEditor fileId={fileId} driveId={driveId} slug="docsnote">
        <Editor
          fileId={fileId}
          driveId={driveId}
          isPublic={isPublic}
          isReadOnly={readOnly}
        />
      </RedirectEditor>
    </Dialog>
  )
}

export default DocsNote
