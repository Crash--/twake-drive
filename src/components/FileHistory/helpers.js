/**
 * Reads the old versions of a shared-drive file from the drive route response
 * (`GET /sharings/drives/:id/:file-id`), which includes them, newest first.
 * The member's own io.cozy.files.versions database does not hold them: they
 * live on the owner's instance.
 *
 * @param {object|null} response - JSON:API response of the drive file route
 * @returns {object[]} io.cozy.files.versions-like documents
 */
export const getDriveFileVersions = response =>
  (response?.included || [])
    .filter(doc => doc.type === 'io.cozy.files.versions')
    .map(doc => ({ ...doc.attributes, _id: doc.id, id: doc.id }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
