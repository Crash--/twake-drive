import { useQuery } from 'cozy-client'

import type { PointerAppManifest } from '@/modules/externalApps/pointerApps'
import { buildAppsQuery } from '@/queries'

/** The installed apps, with the pointer files their manifests declare. */
export const usePointerApps = (): {
  apps: PointerAppManifest[]
  loaded: boolean
} => {
  const appsQuery = buildAppsQuery()
  const result = useQuery(appsQuery.definition, appsQuery.options) as {
    data?: PointerAppManifest[] | null
    fetchStatus?: string
    lastFetch?: number | null
  }
  return {
    apps: result.data ?? [],
    // As hasQueryBeenLoaded: loaded once, even while it refreshes
    loaded: result.fetchStatus === 'loaded' || Boolean(result.lastFetch)
  }
}
