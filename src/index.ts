import fbLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import dotenv from 'dotenv'
import cron from 'node-cron'
import c from 'chalk'
import * as Util from './util.js'

export let api: Api
export let cronSendMessage: cron.ScheduledTask

async function run() {
	const log = Util.log

	const {cError, cCaution, cInfo, cSuccess, cProperty, cData, cName, cTime, cBold} = Util.chalkNames

	const env: Util.envInterface = {
		EMAIL: ``,
		PASSWORD: ``,
		THREAD_ID: ``,
		MESSAGE: ``,
		TIME: ``,
		MAX_DELAY_MINUTES: 0
	}

	const parsed = dotenv.config().parsed
	if (parsed) {
		for (const property in env) {
			if (Object.prototype.hasOwnProperty.call(parsed, property)) {
				env[property] = parsed[property]
			}
		}

		env.TIME = Util.validateTime(env.TIME) === true ? env.TIME : ``
		env.MAX_DELAY_MINUTES =
			Util.validateDelay(env.MAX_DELAY_MINUTES) === true ? env.MAX_DELAY_MINUTES : 0

		let envSet = false

		for (const property in env) {
			if (env[property]) {
				envSet = true
				break
			}
		}

		if (envSet) {
			log(c`{${cBold} Using the following values from .env:}`)

			const skipped: string[] = []
			for (const property in env) {
				if (env[property]) {
					if (property === `PASSWORD`) {
						log(c`${property}: {${cProperty} ${`*`.repeat(env[property].length)}}`)
						continue
					}

					log(c`${property}: {${cProperty} ${env[property]}}`)
				} else skipped.push(property)
			}

			if (skipped.length > 0)
				log(
					c`{${cBold} \nThe following values are either missing or invalid (you will be prompted for them):}`
				)
			for (const element of skipped) {
				log(c`{${cCaution} ${element}}`)
			}
		}
	}

	log(Util.welcomeMessage)

	const loginPrompts: Util.promptObject = [
		{
			type: () => (!env.EMAIL ? `text` : null),
			name: `email`,
			message: `Enter your Facebook login email.`
		},
		{
			type: () => (!env.PASSWORD ? `password` : null),
			name: `password`,
			message: `Enter your password.`
		}
	]

	while (true) {
		const loginResponses = await Util.prompt(loginPrompts)

		if (loginResponses.email) env.EMAIL = loginResponses.email
		if (loginResponses.password) env.PASSWORD = loginResponses.password

		log(c`\n{${cInfo} Logging in...}`)
		const login = await fbLogin(
			{
				email: env.EMAIL,
				password: env.PASSWORD
			},
			{logLevel: `silent`}
		).catch((error) => {
			if (error.error && Object.keys(loginResponses).length === 0) throw Util.error(error.error)
			if (error.error) log(c`{${cCaution} ${error.error}}`)
			else throw error
		})

		if (!login) continue

		api = login
		log(c`Logged in as {${cSuccess} ${env.EMAIL}}\n`)
		break
	}

	const configPrompts: Util.promptObject = [
		{
			type: () => (!env.THREAD_ID ? `number` : null),
			name: `threadID`,
			message: `Enter the thread ID. This is where your message will be sent.`
		},
		{
			type: () => (!env.MESSAGE ? `text` : null),
			name: `message`,
			message: `Enter your message. Type "${Util.likeStickerAlias}" (without quotes) to send the default like/thumbs-up sticker.`,
			initial: `${Util.likeStickerAlias}`
		},
		{
			type: () => (!env.TIME ? `text` : null),
			name: `time`,
			message: `Enter the time you want the message to be sent (random delay is added on top of this).\nMust be in 24h time format. e.g. 0530, 1730, etc.`,
			validate: (time) => Util.validateTime(time)
		},
		{
			type: () => (!env.MAX_DELAY_MINUTES ? `number` : null),
			name: `delay`,
			message: `Enter the maximum number of minutes for the randomized delay. (Must be less than 60)`,
			initial: 10,
			validate: (delay) => Util.validateDelay(delay)
		}
	]

	const configResponses = await Util.prompt(configPrompts)

	if (configResponses.threadID) env.THREAD_ID = configResponses.threadID
	if (configResponses.message) env.MESSAGE = configResponses.message
	if (configResponses.time) env.TIME = configResponses.time
	if (configResponses.delay) env.MAX_DELAY_MINUTES = configResponses.delay

	const timeMatch = Util.timeRegex.exec(env.TIME)
	if (!timeMatch) throw Util.error(`Time is not valid.`)
	const {delayMinutes, second} = Util.randomDelayMinutes(0, env.MAX_DELAY_MINUTES)
	const hour = Number(timeMatch[2])
	const minute = Number(timeMatch[5]) + delayMinutes

	const currentTime = Util.getTime()
	let sendTime = currentTime.hour(hour).minute(minute).second(second)
	if (sendTime.isBefore(currentTime)) sendTime = sendTime.add(1, `d`)
	const sendTimeFormatted = sendTime.format(Util.dateFormatString)

	const cronExp = `${sendTime.second()} ${sendTime.minute()} ${sendTime.hour()} * * *`
	if (!cron.validate(cronExp)) throw Util.error(`cron expression is not valid.`)

	const threadInfo = await api.getThreadInfo(env.THREAD_ID).catch((error) => {
		throw Util.error(`Unable to get thread info.`)
	})
	const threadName = threadInfo.threadName
	const logMessage =
		env.MESSAGE === Util.likeStickerAlias ? `(like/thumbs-up sticker)` : env.MESSAGE

	log(c`The random delay is {${cTime} ${delayMinutes}m${second}s}.`)
	log(
		c`\nThe following message will be sent to {${cName} ${threadName}} at {${cTime} ${sendTimeFormatted}}. Current time is {${cTime} ${Util.getFormattedTime()}}.`
	)
	log(c`{${cData} ${logMessage}}\n`)

	const confirm = await Util.prompt({
		type: 'toggle',
		name: 'value',
		message: 'Continue?',
		initial: true,
		active: 'yes',
		inactive: 'exit'
	})

	if (!confirm.value) Util.exit()

	log(c`\nMessage will be sent at {${cTime} ${sendTimeFormatted}}.`)
	log(
		c`{${cBold}.${cInfo} Please do not close this window.} It must remain open and you must have an internet connection.`
	)
	log(`...`)

	const listener = await api.listen()

	listener.addListener(`message`, (message) => {
		log(message)
	})

	const messageObject =
		env.MESSAGE === `${Util.likeStickerAlias}` ? {sticker: Util.likeSticker} : {body: env.MESSAGE}

	cronSendMessage = cron.schedule(cronExp, async () => {
		// Await api.sendMessage(messageObject, env.THREAD_ID)

		log(c`\nSent message to {${cName} ${threadName}} at {${cTime} ${Util.getFormattedTime()}}.\n`)

		await Util.exit()
	})
}

run()
