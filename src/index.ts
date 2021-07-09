import c from 'chalk'
import handleConfig, { finishConfig } from './config'
import scheduleMessage, { buildCronExpression } from './cron'
import exit from './exit'
import login from './login'
import getSendTime, { getFormattedTime } from './time'
import { cBold, cData, cInfo, cName, cTime } from './util/chalk-names'
import { formattedError, likeSticker, likeStickerAlias, log, shouldContinue, welcomeMessage } from './util/util'

async function main() {
  let config = handleConfig()
  log(welcomeMessage)
  const api = await login()
  config = await finishConfig()

  const threadInfo = await api.getThreadInfo(config.THREAD_ID).catch(() => {
    throw formattedError('Unable to get thread info.')
  })
  const userInfo = await api.getUserInfo([threadInfo.threadId])
  const userFullName = userInfo[threadInfo.threadId] ? userInfo[threadInfo.threadId].fullName : 'FULL_NAME'
  const recipient = threadInfo.threadName ? threadInfo.threadName : userFullName
  const logMessage = config.MESSAGE === likeStickerAlias ? '(like/thumbs-up sticker)' : config.MESSAGE
  const { sendTime, sendTimeFormatted } = getSendTime()

  log(
    c`\nIf you continue, the following message will be sent to {${cName} ${recipient}} at {${cTime} ${sendTimeFormatted}}. Current time is {${cTime} ${getFormattedTime()}}.`,
  )
  log(c`{${cData} ${logMessage}}\n`)

  if (!(await shouldContinue())) await exit()

  log(c`\nMessage will be sent at {${cTime} ${sendTimeFormatted}}.`)
  log(
    c`{${cBold}.${cInfo} Please do not close this window.} It must remain open and you must have an internet connection.`,
  )
  log('...')

  const cronExpression = buildCronExpression(sendTime)
  const messageInfo = {
    recipient,
    outgoingMessage: config.MESSAGE === `${likeStickerAlias}` ? { sticker: likeSticker } : { body: config.MESSAGE },
  }
  scheduleMessage(cronExpression, messageInfo)

  const listener = await api.listen()

  listener.addListener('message', (message) => {
    log(message)
  })
}

void main()
