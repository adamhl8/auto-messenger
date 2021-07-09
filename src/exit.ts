import c from 'chalk'
import { getCronJob } from './cron'
import { getApi } from './login'
import { cInfo } from './util/chalk-names'
import { log } from './util/util'

export default async function exit(): Promise<void> {
  const api = getApi()
  const cronJob = getCronJob()

  if (cronJob) cronJob.stop()

  if (api) {
    api.stopListening()
    await api.logout()
    log(c`{${cInfo} Logged out.}`)
  }

  log(c`{${cInfo} Exited auto-messenger.}`)
  process.exit(0)
}

process.on('SIGINT', () => {
  void exit()
})
