import c from 'chalk'
import dayjs from 'dayjs'
import cron from 'node-cron'
import { OutgoingMessage } from 'ts-messenger-api/dist/lib/types'
import { getAndSetConfig } from './config'
import exit from './exit'
import { getApi } from './login'
import { getFormattedTime } from './time'
import { cName, cTime } from './util/chalk-names'
import { formattedError, log } from './util/util'

interface messageInfo {
  recipient: string
  outgoingMessage: OutgoingMessage
}

let cronJob: cron.ScheduledTask

export function getCronJob(): cron.ScheduledTask {
  return cronJob
}

export default function scheduleMessage(cronExpression: string, messageInfo: messageInfo): cron.ScheduledTask {
  const config = getAndSetConfig()
  const api = getApi()

  cronJob = cron.schedule(cronExpression, () => {
    api.sendMessage(messageInfo.outgoingMessage, config.THREAD_ID).then(
      async () => {
        log(c`\nSent message to {${cName} ${messageInfo.recipient}} at {${cTime} ${getFormattedTime()}}.\n`)

        await exit()
      },
      (error) => {
        throw formattedError(error)
      },
    )
  })

  return cronJob
}

export function buildCronExpression(sendTime: dayjs.Dayjs): string {
  const cronExpression = `${sendTime.second()} ${sendTime.minute()} ${sendTime.hour()} * * *`
  if (!cron.validate(cronExpression)) throw formattedError('cron expression is not valid.')

  return cronExpression
}
