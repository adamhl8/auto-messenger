import c from 'chalk'
import dayjs from 'dayjs'
import cron from 'node-cron'
import { OutgoingMessage } from 'ts-messenger-api/dist/lib/types'
import { getConfig } from './config'
import exit from './exit'
import { getApi } from './login'
import { getFormattedTime } from './time'
import { cName, cTime } from './util/chalk-names'
import { formattedError, getRecipientName, log } from './util/util'

let cronJob: cron.ScheduledTask

export function getCronJob(): cron.ScheduledTask {
	return cronJob
}

export default function scheduleMessage(cronExpression: string, message: OutgoingMessage): cron.ScheduledTask {
	const api = getApi()

	async function send() {
		await api.sendMessage(message, getConfig('threadID'))

		log(
			c`\nSent message to {${cName} ${await getRecipientName(
				getConfig('threadID'),
			)}} at {${cTime} ${getFormattedTime()}}.\n`,
		)

		await exit()
	}

	cronJob = cron.schedule(cronExpression, () => {
		void send()
	})

	return cronJob
}

export function buildCronExpression(sendTime: dayjs.Dayjs): string {
	const cronExpression = `${sendTime.second()} ${sendTime.minute()} ${sendTime.hour()} * * *`
	if (!cron.validate(cronExpression)) throw formattedError('cron expression is not valid.')

	return cronExpression
}
