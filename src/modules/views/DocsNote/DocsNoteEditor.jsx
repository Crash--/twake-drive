import { filterSuggestionItems } from '@blocknote/core'
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
  YjsThreadStore
} from '@blocknote/core/comments'
import '@blocknote/core/fonts/inter.css'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import React, { useEffect, useMemo, useState } from 'react'

import { FileTypeText } from '@linagora/twake-icons'
import { useClient } from 'cozy-client'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Empty from 'cozy-ui/transpiled/react/Empty'

import {
  fetchCollabAccess,
  fetchPeople,
  makeAttachmentHandlers
} from '@/modules/views/DocsNote/collab'
import { schema } from '@/modules/views/DocsNote/schema'

const COLORS = ['#e8590c', '#1971c2', '#2f9e44', '#9c36b5', '#c2255c']

// Same fragment name as La Suite Docs, so a Docs Yjs state stays readable.
const FRAGMENT = 'document-store'

// The room token lives one minute: send a fresh one before it expires. When
// the stack refuses (right revoked), the provider reports the denial.
const TOKEN_REFRESH_MS = 30000

// A read-only reader sees the comments but cannot write them: the collab
// server drops every update of a view-mode connection.
class ReadOnlyThreadStoreAuth extends DefaultThreadStoreAuth {
  canCreateThread() {
    return false
  }

  canAddComment() {
    return false
  }
}

const Editor = ({
  provider,
  access,
  people,
  isReadOnly,
  file,
  attachments
}) => {
  const threadStore = useMemo(() => {
    const auth = isReadOnly
      ? new ReadOnlyThreadStoreAuth(access.user, 'comment')
      : new DefaultThreadStoreAuth(access.user, 'editor')
    return new YjsThreadStore(
      access.user,
      provider.document.getMap('threads'),
      auth
    )
  }, [access.user, provider, isReadOnly])

  const editor = useCreateBlockNote({
    schema,
    extensions: [
      CommentsExtension({
        threadStore,
        resolveUsers: async ids =>
          ids.map(id => ({
            id,
            username: people.find(p => p.id === id)?.name || id,
            avatarUrl: ''
          }))
      })
    ],
    collaboration: {
      provider,
      fragment: provider.document.getXmlFragment(FRAGMENT),
      user: {
        name: access.name || 'Invité',
        color: COLORS[access.user.length % COLORS.length]
      }
    },
    uploadFile: attachments.upload,
    resolveFileUrl: attachments.resolve
  })

  const getMentionItems = async query =>
    filterSuggestionItems(
      people.map(person => ({
        title: person.name,
        onItemClick: () =>
          editor.insertInlineContent([
            {
              type: 'mention',
              props: { user: person.id, name: person.name }
            },
            ' '
          ])
      })),
      query
    )

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
        <BlockNoteView editor={editor} editable={!isReadOnly} theme="light">
          <SuggestionMenuController
            triggerCharacter="@"
            getItems={getMentionItems}
          />
        </BlockNoteView>
      </div>
    </div>
  )
}

const DocsNoteEditor = ({ file, isReadOnly = false }) => {
  const client = useClient()
  const [state, setState] = useState({ status: 'connecting' })

  useEffect(() => {
    let provider = null
    let refresh = null
    let cancelled = false
    const deny = () => {
      clearInterval(refresh)
      provider?.destroy()
      if (!cancelled) setState({ status: 'denied' })
    }
    const connect = async () => {
      try {
        const [access, people] = await Promise.all([
          fetchCollabAccess(client, file._id),
          fetchPeople(client, file._id)
        ])
        if (cancelled) return
        provider = new HocuspocusProvider({
          url: access.url,
          name: access.room,
          // A renewed token can change the mode (member made read-only).
          token: async () => {
            const renewed = await fetchCollabAccess(client, file._id)
            setState(prev =>
              prev.status === 'synced' && prev.access.mode !== renewed.mode
                ? { ...prev, access: { ...prev.access, mode: renewed.mode } }
                : prev
            )
            return renewed.token
          },
          onSynced: () =>
            setState({ status: 'synced', provider, access, people }),
          onAuthenticationFailed: deny,
          // The server closes a session whose token was not renewed.
          onClose: ({ event }) => {
            if (event?.code === 4401 || event?.code === 4403) deny()
          }
        })
        refresh = setInterval(() => provider.sendToken(), TOKEN_REFRESH_MS)
      } catch {
        deny()
      }
    }
    connect()
    return () => {
      cancelled = true
      clearInterval(refresh)
      provider?.destroy()
    }
  }, [client, file._id])

  if (state.status === 'denied') {
    return (
      <Empty
        icon={FileTypeText}
        title="Ce document ne peut pas être ouvert"
        text="Votre accès à ce document a été retiré ou refusé."
      />
    )
  }
  if (state.status !== 'synced') return null

  return (
    <Editor
      provider={state.provider}
      access={state.access}
      people={state.people}
      isReadOnly={isReadOnly || state.access.mode !== 'edit'}
      file={file}
      attachments={makeAttachmentHandlers(client, file._id)}
    />
  )
}

export default DocsNoteEditor
