import React, { useEffect, useState } from 'react'

import { Dialog } from 'cozy-ui/transpiled/react/CozyDialogs'
import Typography from 'cozy-ui/transpiled/react/Typography'
import IntentIframe from 'cozy-ui-plus/dist/Intent/IntentIframe'
import { useI18n } from 'twake-i18n'

import styles from './styles.styl'

/**
 * Sharing a pointer file: the app of the document shares it, through the
 * SHARE intent on the type of the pointer. The intent names the document by
 * its id in the app, never by the file.
 */
// cozy-interapp waits for the `ready` of the service forever: a service that
// never loads would leave an empty dialog
const READY_TIMEOUT = 20000

export const PointerShareDialog = ({ file, onClose }) => {
  const { t } = useI18n()
  // The app does not answer: nothing is changed, the dialog says so (F1)
  const [unavailable, setUnavailable] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready || unavailable) return undefined
    const timer = setTimeout(() => setUnavailable(true), READY_TIMEOUT)
    return () => clearTimeout(timer)
  }, [ready, unavailable])

  return (
    <Dialog
      open
      size="large"
      title={t('Files.share.cta')}
      onClose={onClose}
      content={
        unavailable ? (
          <Typography variant="body1">
            {t(
              'Files.share.unavailable',
              'Sharing is unavailable for the moment. Nothing has been changed.'
            )}
          </Typography>
        ) : (
          <div className={styles['pointer-share-intent']}>
            <IntentIframe
              action="SHARE"
              type={file.mime}
              data={{ externalId: file.metadata.externalId }}
              onCancel={onClose}
              onTerminate={onClose}
              onReadyToUse={() => setReady(true)}
              onError={() => setUnavailable(true)}
            />
          </div>
        )
      }
    />
  )
}
