import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ServerBlockNoteEditor } from '@blocknote/server-util'
import * as Y from 'yjs'

import { checkInstance, replaceContent, signJWT, toMarkdown, verifyJWT } from './server.mjs'

test('jwt round trip, expiry and tampering', () => {
  const exp = Math.floor(Date.now() / 1000) + 60
  const token = signJWT({ sub: 'f1', exp }, 's3cret')
  assert.equal(verifyJWT(token, 's3cret').sub, 'f1')
  assert.throws(() => verifyJWT(token, 'other'))
  assert.throws(() => verifyJWT(signJWT({ sub: 'f1', exp: 1 }, 's3cret'), 's3cret'))
  const [h, , s] = token.split('.')
  const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'f2', exp })).toString('base64url')}.${s}`
  assert.throws(() => verifyJWT(forged, 's3cret'))
})

test('instance allowlist', () => {
  assert.equal(checkInstance('http://alice.100-86-182-33.nip.io:4600'), 'http://alice.100-86-182-33.nip.io:4600')
  assert.throws(() => checkInstance('http://evil.example.com'))
})

test('a restored state replaces the room content', async () => {
  const editor = ServerBlockNoteEditor.create()
  const old = editor.blocksToYDoc([{ type: 'paragraph', content: 'version 1' }], 'document-store')
  const room = editor.blocksToYDoc([{ type: 'paragraph', content: 'version 2' }], 'document-store')
  replaceContent(room, Y.encodeStateAsUpdate(old))
  const md = await toMarkdown(room)
  assert.match(md, /version 1/)
  assert.doesNotMatch(md, /version 2/)
})

test('the export keeps commented text and never touches the room', async () => {
  const editor = ServerBlockNoteEditor.create()
  const room = editor.blocksToYDoc([{ type: 'paragraph', content: 'texte commenté' }], 'document-store')
  const walk = node => (node instanceof Y.XmlText ? [node] : (node.toArray?.() || []).flatMap(walk))
  const [text] = walk(room.getXmlFragment('document-store'))
  text.format(0, 5, { comment: { threadId: 't1', orphan: false } })
  const before = Y.encodeStateVector(room)
  const md = await toMarkdown(room)
  assert.match(md, /texte commenté/)
  assert.deepEqual(Y.encodeStateVector(room), before)
  assert.match(room.getXmlFragment('document-store').toString(), /texte/)
})

test('the export keeps mentions', async () => {
  const { schema } = await import('./schema.mjs')
  const editor = ServerBlockNoteEditor.create({ schema })
  const room = editor.blocksToYDoc([{ type: 'paragraph', content: [{ type: 'text', text: 'pour ', styles: {} }, { type: 'mention', props: { user: 'member:bob', name: 'Bob' } }] }], 'document-store')
  const md = await toMarkdown(room)
  assert.match(md, /pour @Bob/)
})
