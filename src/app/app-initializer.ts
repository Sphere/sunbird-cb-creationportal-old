import { LoggerService } from '@ws-widget/utils'
import { InitService } from './services/init.service'
import { DowntimeConfigService } from './services/downtime-config.service'

/** The APP_INITIALIZER factory: reads the downtime config, then starts the app unless a full downtime is on. */
export const appInitializer = (initSvc: InitService, logger: LoggerService, downtimeSvc: DowntimeConfigService) => async () => {
  // Read the downtime config before signing in: during a full downtime Keycloak may
  // itself be down, so the maintenance page is shown instead of a login that cannot
  // complete. load() never throws -- an unreadable config means no downtime.
  await downtimeSvc.load()
  if (downtimeSvc.isBlocking()) {
    logger.info('Full downtime is on; skipping start-up.')
    return
  }
  downtimeSvc.markAppStarted()
  try {
    await initSvc.init()
  } catch (error) {
    logger.error('ERROR DURING APP INITIALIZATION >', error)
  }
}
