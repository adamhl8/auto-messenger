import c from 'chalk'
import handleConfig, { finishConfig, getConfig } from './config'
import scheduleMessage, { buildCronExpression } from './cron'
import exit from './exit'
import login from './login'
import getThreads from './threads'
import getSendTime, { getFormattedTime } from './time'
import { cBold, cData, cInfo, cName, cTime } from './util/chalk-names'
import { continuePrompt, getRecipientName, likeSticker, likeStickerAlias, log, welcomeMessage } from './util/util'

async function main() {
	handleConfig()
	log(welcomeMessage)
	await login()
	if (!getConfig('threadID')) await getThreads()
	await finishConfig()

	const recipientName = await getRecipientName(getConfig('threadID'))
	const { sendTime, sendTimeFormatted } = getSendTime()
	const logMessage = getConfig('message') === likeStickerAlias ? '(like/thumbs-up sticker)' : getConfig('message')
	log(
		c`\nIf you continue, the following message will be sent to {${cName} ${recipientName}} at {${cTime} ${sendTimeFormatted}}. Current time is {${cTime} ${getFormattedTime()}}.`,
	)
	log(c`{${cData} ${logMessage}}\n`)

	if (!(await continuePrompt('Continue?')).value) await exit()

	log(c`\nMessage will be sent at {${cTime} ${sendTimeFormatted}}.`)
	log(
		c`{${cBold}.${cInfo} Please do not close this window.} It must remain open and you must have an internet connection.`,
	)
	log('...')

	const cronExpression = buildCronExpression(sendTime)
	const message = getConfig('message') === likeStickerAlias ? { sticker: likeSticker } : { body: getConfig('message') }
	scheduleMessage(cronExpression, message)
}

void main()
