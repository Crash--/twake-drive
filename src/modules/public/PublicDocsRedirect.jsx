import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'

import { useClient } from 'cozy-client'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

// A La Suite Docs pointer opened from a share link: hand the visitor over to Docs with
// the sharecode, so that Docs asks this instance for the document with it.
const PublicDocsRedirect = ({ file }) => {
  const client = useClient()
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const redirect = async () => {
      const sharecode = new URLSearchParams(window.location.search).get(
        'sharecode'
      )
      const res = await client
        .collection('io.cozy.files')
        .fetchFileContentById(file.id)
      const match = (await res.text()).match(/^URL=(.+)$/m)
      if (!match || !sharecode) throw new Error('not a Docs pointer')
      const url = new URL(match[1].trim())
      url.searchParams.set('sharecode', sharecode)
      window.location.replace(url.toString())
    }
    redirect().catch(() => setFailed(true))
  }, [client, file.id])

  if (failed) {
    return (
      <Typography className="u-ta-center u-mt-2">
        {t('error.open_file', 'This file cannot be opened.')}
      </Typography>
    )
  }
  return <Spinner size="xxlarge" middle noMargin />
}

PublicDocsRedirect.propTypes = {
  file: PropTypes.object.isRequired
}

export { PublicDocsRedirect }
