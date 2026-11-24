import flag from 'cozy-flags'

import type { File } from '@/components/FolderPicker/types'

/**
 * A kind of pointer file an app declares in the `pointers` field of its
 * manifest: a file of this mime type whose `metadata.externalId` is the id of
 * a document of the app. The paths are relative to the client URL of the app.
 */
export interface PointerRoute {
  mime: string
  /** Opens the document; `{externalId}` is replaced */
  open?: string
  /** Creates a document whose pointer goes in a folder; `{instance}` and `{dirId}` are replaced */
  create?: string
}

export interface PointerAppManifest {
  slug: string
  name?: string
  client_url_flag?: string
  pointers?: PointerRoute[]
}

export interface PointerApp {
  app: PointerAppManifest
  route: PointerRoute
}

/** A path of the manifest with its placeholders replaced, each value URL-encoded. */
export const fillRoute = (
  template: string,
  values: Record<string, string>
): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    key in values ? encodeURIComponent(values[key]) : placeholder
  )

/** The app that owns a pointer file, from the mime type of the file. */
export const pointerAppOf = (
  apps: PointerAppManifest[] | null | undefined,
  file?: Partial<File> | null
): PointerApp | null => {
  const metadata = file?.metadata as { externalId?: string } | undefined
  if (!metadata?.externalId || !file?.mime) return null
  for (const app of apps ?? []) {
    const route = app.pointers?.find(p => p.mime === file.mime)
    if (route) return { app, route }
  }
  return null
}

/** The apps that create documents from Drive, one entry per kind of pointer. */
export const creatablePointerApps = (
  apps: PointerAppManifest[] | null | undefined
): PointerApp[] =>
  (apps ?? []).flatMap(app =>
    (app.pointers ?? [])
      .filter(route => route.create)
      .map(route => ({ app, route }))
  )

/**
 * The client URL of an app, without trailing slash: the value of the flag its
 * manifest names, as the stack resolves it. Null when the app is served by the
 * stack, or when the flag is not set.
 */
export const clientURLOf = (app: PointerAppManifest): string | null => {
  const value: unknown = app.client_url_flag ? flag(app.client_url_flag) : null
  return typeof value === 'string' && value !== ''
    ? value.replace(/\/$/, '')
    : null
}
