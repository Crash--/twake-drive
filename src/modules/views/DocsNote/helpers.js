import { makeEditorFileRoute } from '@/modules/views/editor/helpers'

export const DOCSNOTE_EXTENSION = 'docsnote'
export const DOCSNOTE_MIME = 'application/vnd.twake.docsnote+yjs'

export const isDocsNote = file =>
  Boolean(file?.name?.endsWith(`.${DOCSNOTE_EXTENSION}`))

export const makeDocsNoteFileRoute = (fileId, options) =>
  makeEditorFileRoute('docsnote', fileId, options)
