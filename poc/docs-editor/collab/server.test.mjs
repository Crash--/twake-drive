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
