import '@blocknote/core/fonts/inter.css'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { useCreateBlockNote } from '@blocknote/react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import React, { useEffect, useState } from 'react'

import { FileTypeText } from '@linagora/twake-icons'
import { useClient } from 'cozy-client'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Empty from 'cozy-ui/transpiled/react/Empty'

import {
  fetchCollabAccess,
  makeAttachmentHandlers
} from '@/modules/views/DocsNote/collab'
import { useEditorAuthor } from '@/modules/views/editor/useEditorAuthor'

const COLORS = ['#e8590c', '#1971c2', '#2f9e44', '#9c36b5', '#c2255c']

// Same fragment name as La Suite Docs, so a Docs Yjs state stays readable.
const FRAGMENT = 'document-store'

const Editor = ({ provider, author, isReadOnly, file, attachments }) => {
  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: provider.document.getXmlFragment(FRAGMENT),
      user: {
        name: author,
        color: COLORS[author.length % COLORS.length]
      }
    },
    uploadFile: attachments.upload,
    resolveFileUrl: attachments.resolve
  })

  const exportMarkdown = () => {
    const markdown = editor.blocksToMarkdownLossy(editor.document)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(
      new Blob([markdown], { type: 'text/markdown' })
    )
    link.download = file.name.replace(/\.docsnote$/, '.md')
    link.click()
  }

  return (
    <div className="u-flex u-flex-column u-flex-grow-1 u-w-100 u-ov-auto">
      <div className="u-flex u-flex-justify-end u-ph-1 u-pt-half">
        <Button
          variant="text"
          label="Exporter en Markdown"
          onClick={exportMarkdown}
        />
      </div>
      <div className="u-mh-auto u-w-100" style={{ maxWidth: 860 }}>
        <BlockNoteView editor={editor} editable={!isReadOnly} theme="light" />
      </div>
    </div>
  )
}

const DocsNoteEditor = ({ file, isPublic = false, isReadOnly = false }) => {
  const client = useClient()
  const { author, isLoading } = useEditorAuthor({ isPublic })
  const [state, setState] = useState({ status: 'connecting' })

  useEffect(() => {
    let provider = null
    let cancelled = false
    const connect = async () => {
      try {
        const access = await fetchCollabAccess(client, file._id)
        if (cancelled) return
        provider = new HocuspocusProvider({
          url: access.url,
          name: access.room,
          // The stack tokens are short-lived: a reconnection asks for a new one.
          token: async () => (await fetchCollabAccess(client, file._id)).token,
          onSynced: () =>
            setState({ status: 'synced', provider, mode: access.mode }),
          onAuthenticationFailed: () => setState({ status: 'denied' })
        })
      } catch {
        if (!cancelled) setState({ status: 'denied' })
      }
    }
    connect()
    return () => {
      cancelled = true
      provider?.destroy()
    }
  }, [client, file._id])

  if (state.status === 'denied') {
    return (
      <Empty
        icon={FileTypeText}
        title="Ce document ne peut pas être ouvert"
        text="La stack ou le serveur de collaboration a refusé l'accès."
      />
    )
  }
  if (state.status !== 'synced' || isLoading) return null

  return (
    <Editor
      provider={state.provider}
      author={author || 'Invité'}
      isReadOnly={isReadOnly || state.mode !== 'edit'}
      file={file}
      attachments={makeAttachmentHandlers(client, file._id)}
    />
  )
}

export default DocsNoteEditor
