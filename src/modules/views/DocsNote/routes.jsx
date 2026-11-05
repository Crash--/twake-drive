import React, { Suspense, lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'

import Loader from '@/components/Loader'
import DocsNoteCreateView from '@/modules/views/DocsNote/Create'

const DocsNoteLazyView = lazy(() => import('@/modules/views/DocsNote'))

const DocsNoteView = props => (
  <Suspense fallback={<Loader />}>
    <DocsNoteLazyView {...props} />
  </Suspense>
)

export const getDocsNoteRoutes = () => (
  <>
    <Route path="docsnote/:fileId" element={<DocsNoteView />} />
    <Route path="docsnote/:driveId/:fileId" element={<DocsNoteView />} />
    <Route path="docsnote/create/:folderId" element={<DocsNoteCreateView />} />
    <Route
      path="docsnote/create/:driveId/:folderId"
      element={<DocsNoteCreateView />}
    />
  </>
)

export const getPublicDocsNoteRoutes = ({
  isReadOnly = false,
  isShared = false,
  data
} = {}) => (
  <>
    <Route
      path="docsnote/:fileId"
      element={<DocsNoteView isPublic={true} isReadOnly={isReadOnly} />}
    />
    {isShared && (
      <Route
        path="/"
        element={<Navigate to={`docsnote/${data.id}`} replace />}
      />
    )}
  </>
)
