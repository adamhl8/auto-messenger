import c from 'chalk'
import handleConfig, { finishConfig } from './config'
import scheduleMessage, { buildCronExpression } from './cron'
import exit from './exit'
import login from './login'
import getThreads from './threads'
import getSendTime, { getFormattedTime } from './time'
import { cBold, cData, cInfo, cName, cTime } from './util/chalk-names'
import { continuePrompt, getRecipientName, likeSticker, likeStickerAlias, log, welcomeMessage } from './util/util'

async function main() {
  let config = handleConfig()
  log(welcomeMessage)
  await login()
  if (!config.THREAD_ID) await getThreads()
  config = await finishConfig()

  const recipient = await getRecipientName(config.THREAD_ID)
  const logMessage = config.MESSAGE === likeStickerAlias ? '(like/thumbs-up sticker)' : config.MESSAGE
  const { sendTime, sendTimeFormatted } = getSendTime()

  log(
    c`\nIf you continue, the following message will be sent to {${cName} ${recipient}} at {${cTime} ${sendTimeFormatted}}. Current time is {${cTime} ${getFormattedTime()}}.`,
  )
  log(c`{${cData} ${logMessage}}\n`)

  if (!(await continuePrompt('Continue?')).value) await exit()

  log(c`\nMessage will be sent at {${cTime} ${sendTimeFormatted}}.`)
  log(
    c`{${cBold}.${cInfo} Please do not close this window.} It must remain open and you must have an internet connection.`,
  )
  log('...\n')

  const cronExpression = buildCronExpression(sendTime)
  const messageInfo = {
    recipient,
    outgoingMessage: config.MESSAGE === likeStickerAlias ? { sticker: likeSticker } : { body: config.MESSAGE },
  }

  scheduleMessage(cronExpression, messageInfo)
}

void main()
