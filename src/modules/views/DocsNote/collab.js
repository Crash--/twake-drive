// The stack decides who may join the room and in which mode, and signs a
// short token that the collaboration server checks.
export const fetchCollabAccess = (client, fileId) =>
  client
    .getStackClient()
    .fetchJSON('GET', `/editor/${encodeURIComponent(fileId)}/collab`)

const SCHEME = 'cozy-attachment://'

// Images are files of the stack, served with the rights of the note. The
// document keeps a stable cozy-attachment:// reference, resolved at render
// time with the caller's own token.
export const makeAttachmentHandlers = (client, noteId) => {
  const stackClient = client.getStackClient()
  const base = `/editor/${encodeURIComponent(noteId)}/attachments`
  return {
    upload: async file => {
      const { id } = await stackClient.fetchJSON(
        'POST',
        `${base}?Name=${encodeURIComponent(file.name)}`,
        file,
        { headers: { 'Content-Type': file.type } }
      )
      return `${SCHEME}${id}`
    },
    resolve: async url => {
      if (!url.startsWith(SCHEME)) return url
      const res = await stackClient.fetch(
        'GET',
        `${base}/${encodeURIComponent(url.slice(SCHEME.length))}`
      )
      return URL.createObjectURL(await res.blob())
    }
  }
}

// Who can read the note (owner and members of the sharings containing it),
// for mentions and comment authors.
export const fetchPeople = (client, fileId) =>
  client
    .getStackClient()
    .fetchJSON('GET', `/editor/${encodeURIComponent(fileId)}/people`)
