import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  CommentsExtension,
  DefaultThreadStoreAuth,
  YjsThreadStore
} from '@blocknote/core/comments'
import { ServerBlockNoteEditor } from '@blocknote/server-util'
import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'

import { schema } from './schema.mjs'

const PORT = Number(process.env.PORT || 4603)
// Shared with cozy-stack (collab.<context>.secret): the stack signs the room
// tokens with it, this server signs its calls to the stack with it.
const SECRET = process.env.COLLAB_SECRET
// The instance URL comes from a token signed by the stack; the allowlist is a
// second fence so the secret-bearing calls never leave the expected domain.
const INSTANCE_DOMAIN = process.env.INSTANCE_DOMAIN || '100-86-182-33.nip.io'
const FRAGMENT = 'document-store'
const POLL_MS = Number(process.env.POLL_MS || 5000)

const log = (...args) => console.log(new Date().toISOString(), ...args)
const b64url = buf => Buffer.from(buf).toString('base64url')

export const signJWT = (claims, secret) => {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(claims))
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest()
  return `${head}.${body}.${b64url(sig)}`
}

export const verifyJWT = (token, secret, now = Date.now() / 1000) => {
  const [head, body, sig] = String(token).split('.')
  if (!head || !body || !sig) throw new Error('malformed token')
  if (JSON.parse(Buffer.from(head, 'base64url')).alg !== 'HS256') throw new Error('bad alg')
  const expected = createHmac('sha256', secret).update(`${head}.${body}`).digest()
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error('bad signature')
  const claims = JSON.parse(Buffer.from(body, 'base64url'))
  if (typeof claims.exp !== 'number' || claims.exp < now) throw new Error('expired')
  return claims
}

export const checkInstance = raw => {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad scheme')
  if (!url.hostname.endsWith(`.${INSTANCE_DOMAIN}`)) throw new Error('instance not allowed')
  return url.origin
}

// Room state kept next to the Y.Doc: where the file lives and the revision we
// last read or wrote, to tell our own writes from someone else's.
const rooms = new Map()

const callStack = async (room, init = {}) => {
  const now = Math.floor(Date.now() / 1000)
  const token = signJWT({ iss: room.domain, sub: room.fileId, aud: ['cozy-stack'], iat: now, exp: now + 60 }, SECRET)
  return fetch(`${room.instance}/editor/collab/${encodeURIComponent(room.fileId)}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers }
  })
}

const readFile = async room => {
  const res = await callStack(room)
  if (!res.ok) throw new Error(`load ${room.fileId}: ${res.status}`)
  return { bytes: new Uint8Array(await res.arrayBuffer()), rev: res.headers.get('x-cozy-rev') }
}

// A restored version (or any write that is not ours) replaces the content of
// the room: merging it would keep everything, since the newer state already
// contains the older operations.
export const replaceContent = (doc, bytes) => {
  const incoming = new Y.Doc()
  if (bytes.length > 0) Y.applyUpdate(incoming, bytes)
  const target = doc.getXmlFragment(FRAGMENT)
  const source = incoming.getXmlFragment(FRAGMENT)
  doc.transact(() => {
    target.delete(0, target.length)
    target.insert(0, source.toArray().map(node => node.clone()))
  })
}

const storeWith = async (save, room, document, documentName) => {
  let res = await save()
  if (res.status === 412) {
    const { bytes, rev } = await readFile(room)
    replaceContent(document, bytes)
    room.rev = rev
    log('external change on store, replaced', documentName)
    res = await save()
  }
  if (!res.ok) throw new Error(`store ${documentName}: ${res.status}`)
  room.rev = (await res.json()).rev
  log('store', documentName, 'rev', room.rev)
}

// The export editor must know every mark the browsers write (comments): when
// y-prosemirror cannot build a node with its schema, it deletes that node
// from the Y.Doc. The conversion also runs on a copy, never on the room.
const editor = ServerBlockNoteEditor.create({
  schema,
  extensions: [
    CommentsExtension({
      threadStore: new YjsThreadStore('export', new Y.Doc().getMap('threads'), new DefaultThreadStoreAuth('export', 'comment')),
      resolveUsers: async () => []
    })
  ]
})
// shortcut: images keep their cozy-attachment:// URL in the export, which only
// the editor can resolve; rewrite them to a stack URL for a real preview.
export const toMarkdown = doc => {
  const copy = new Y.Doc()
  Y.applyUpdate(copy, Y.encodeStateAsUpdate(doc))
  return editor.blocksToMarkdownLossy(editor.yDocToBlocks(copy, FRAGMENT))
}

// A room token lives one minute; the editor sends a fresh one before that.
// A connection whose token was not renewed (right revoked, or a client that
// does not play along) is closed by the sweep.
const sessions = new Map()

const checkRoomToken = (token, documentName) => {
  const claims = verifyJWT(token, SECRET)
  if (!claims.aud?.includes('collab')) throw new Error('bad audience')
  if (documentName !== `${claims.iss}/${claims.sub}`) throw new Error('room mismatch')
  const instance = checkInstance(claims.instance)
  if (new URL(instance).host !== claims.iss) throw new Error('issuer mismatch')
  return { claims, instance }
}

const server = new Server({
  port: PORT,
  address: '0.0.0.0',
  debounce: 3000,
  maxDebounce: 15000,

  async onAuthenticate({ token, documentName, connectionConfig }) {
    const { claims, instance } = checkRoomToken(token, documentName)
    connectionConfig.readOnly = claims.mode !== 'edit'
    if (!rooms.has(documentName)) rooms.set(documentName, { instance, domain: claims.iss, fileId: claims.sub, rev: null })
    log('auth', documentName, claims.mode, claims.user)
    return { exp: claims.exp, user: claims.user }
  },

  async connected({ connection, context, documentName, socketId }) {
    sessions.set(`${socketId}/${documentName}`, { connection, exp: context.exp, user: context.user, documentName })
  },

  async onTokenSync({ token, connection, documentName, socketId }) {
    const { claims } = checkRoomToken(token, documentName)
    const session = sessions.get(`${socketId}/${documentName}`)
    if (session) session.exp = claims.exp
    connection.readOnly = claims.mode !== 'edit'
  },

  async onDisconnect({ documentName, socketId }) {
    sessions.delete(`${socketId}/${documentName}`)
  },

  async onLoadDocument({ document, documentName }) {
    const room = rooms.get(documentName)
    const { bytes, rev } = await readFile(room)
    if (bytes.length > 0) Y.applyUpdate(document, bytes)
    room.rev = rev
    room.doc = document
    log('load', documentName, `${bytes.length} bytes`, 'rev', rev)
    return document
  },

  async onStoreDocument({ document, documentName }) {
    const room = rooms.get(documentName)
    const save = async () =>
      callStack(room, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'If-Match': room.rev || '' },
        body: JSON.stringify({
          content: Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64'),
          markdown: await toMarkdown(document)
        })
      })
    room.saving = true
    try {
      await storeWith(save, room, document, documentName)
    } catch (error) {
      // Hocuspocus rethrows hook errors as unhandled rejections; the next
      // change retries the save.
      log('store failed', documentName, error.message)
    } finally {
      room.saving = false
    }
  },

  async afterUnloadDocument({ documentName }) {
    rooms.delete(documentName)
    log('unload', documentName)
  }
})

// shortcut: polling the revision of every open room; a stack event (realtime
// or webhook) to the collab server would avoid it.
const poll = async () => {
  for (const [name, room] of rooms) {
    if (!room.doc || !room.rev || room.saving) continue
    try {
      const res = await callStack(room, { method: 'HEAD' })
      const rev = res.headers.get('x-cozy-rev')
      if (res.ok && rev && rev !== room.rev) {
        const file = await readFile(room)
        replaceContent(room.doc, file.bytes)
        room.rev = file.rev
        log('external change, replaced', name, 'rev', file.rev)
      }
    } catch (error) {
      log('poll failed', name, error.message)
    }
  }
}

const sweep = () => {
  const now = Date.now() / 1000
  for (const [key, session] of sessions) {
    if (session.exp < now) {
      sessions.delete(key)
      session.connection.close({ code: 4401, reason: 'token expired' })
      log('closed, token expired', session.documentName, session.user)
    }
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!SECRET) throw new Error('COLLAB_SECRET is required')
  setInterval(poll, POLL_MS)
  setInterval(sweep, 5000)
  server.listen().then(() => log(`collab listening on ${PORT}`))
}
