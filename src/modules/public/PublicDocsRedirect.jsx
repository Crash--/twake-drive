import PropTypes from 'prop-types'
import React, { useEffect } from 'react'

import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

// A La Suite Docs pointer opened from a share link: hand the visitor over to Docs with
// the sharecode, so that Docs asks this instance for the document with it.
const PublicDocsRedirect = ({ file }) => {
  const { t } = useI18n()
  const metadataUrl = file.metadata?.docs_url
  // A copy names its source until it is rewritten under its own id: never open the source.
  const pending = file.metadata?.externalId !== file.id
  const sharecode = new URLSearchParams(window.location.search).get('sharecode')
  const openable = !pending && metadataUrl && sharecode

  useEffect(() => {
    if (!openable) return
    const url = new URL(`/docs/${file.id}/`, metadataUrl)
    url.searchParams.set('sharecode', sharecode)
    window.location.replace(url.toString())
  }, [file.id, metadataUrl, openable, sharecode])

  if (!openable) {
    return (
      <Typography className="u-ta-center u-mt-2">
        {pending
          ? t(
              'error.docs_pending',
              'This document is being prepared, try again in a moment.'
            )
          : t('error.open_file', 'This file cannot be opened.')}
      </Typography>
    )
  }
  return <Spinner size="xxlarge" middle noMargin />
}

PublicDocsRedirect.propTypes = {
  file: PropTypes.object.isRequired
}

export { PublicDocsRedirect }
