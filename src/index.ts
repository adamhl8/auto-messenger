import Api from 'ts-messenger-api/dist/lib/api'
import dotenv from 'dotenv'
import cron from 'node-cron'
import c from 'chalk'
import * as Util from './util.js'

const log = Util.log

const {cError, cWarning, cSuccess, cProperty, cData, cName, cTime, cBold} = Util.chalkNames

const env: Util.envInterface = {
	EMAIL: ``,
	PASSWORD: ``,
	THREAD_ID: ``,
	MESSAGE: ``,
	TIME: ``,
	MAX_DELAY: 0
}

const parsed = dotenv.config().parsed
if (parsed) {
	for (const property in env) {
		if (Object.prototype.hasOwnProperty.call(parsed, property)) {
			env[property] = parsed[property]
		}
	}

	env.TIME = Util.validateTime(env.TIME) === true ? env.TIME : ``
	env.MAX_DELAY = Util.validateDelay(env.MAX_DELAY) === true ? env.MAX_DELAY : 0

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
			log(c`{${cError} ${element}}`)
		}
	}
}

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

let api: Api

while (true) {
	const loginResponses = await Util.prompt(loginPrompts)

	if (loginResponses.email) env.EMAIL = loginResponses.email
	if (loginResponses.password) env.PASSWORD = loginResponses.password

	log(c`{${cWarning} Logging in...}`)
	const login = await Util.fbLogin(
		{
			email: env.EMAIL,
			password: env.PASSWORD
		},
		{logLevel: `silent`}
	).catch((error) => {
		if (error.error && Object.keys(loginResponses).length === 0) throw Util.error(error.error)
		if (error.error) log(c`{${cError} ${error.error}}`)
		else throw error
	})

	if (!login) continue

	api = login
	log(c`Logged in as {${cSuccess} ${env.EMAIL}}`)
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
		message: `Enter your message. Type "like" (without quotes) to send the default like/thumbs-up sticker.`,
		initial: `like`
	},
	{
		type: () => (!env.TIME ? `text` : null),
		name: `time`,
		message: `Enter the time you want the message to be sent (random delay is added on top of this). (Must be in 24h time format. e.g. 0530 or 1730)`,
		validate: (time) => Util.validateTime(time)
	},
	{
		type: () => (!env.MAX_DELAY ? `number` : null),
		name: `delay`,
		message: `Enter the maximum number of minutes for the randomized delay. (Must be less than 60)`,
		initial: 10,
		validate: (delay) => Util.validateDelay(delay)
	}
]

const configResponses = await Util.prompt(configPrompts)

if (configResponses.threadID) env.THREAD_ID = configResponses.threadID
if (configResponses.message) env.MESSAGE = configResponses.message
const logMessage =
	env.MESSAGE === Util.likeStickerAlias ? `like/thumbs-up sticker` : `"${env.MESSAGE}"`
if (configResponses.time) env.TIME = configResponses.time
const timeMatch = Util.timeRegex.exec(env.TIME)
if (configResponses.delay) env.MAX_DELAY = configResponses.delay

if (!timeMatch) throw Util.error(`Time is not valid.`)
const {delayMinutes, second} = Util.randomDelayMinutes(0, env.MAX_DELAY)
const hour = Number(timeMatch[2])
const minute = Number(timeMatch[5]) + delayMinutes

const currentTime = Util.getTime()
let sendTime = currentTime.hour(hour).minute(minute).second(second)
if (sendTime.isBefore(currentTime)) sendTime = sendTime.add(1, `d`)

const sendTimeFormatted = sendTime.format(Util.dateFormatString)

const cronExp = `${sendTime.second()} ${sendTime.minute()} ${sendTime.hour()} * * *`
if (!cron.validate(cronExp)) throw Util.error(`cron expression is not valid.`)

const threadName = (await api.getThreadInfo(env.THREAD_ID)).threadName
if (!threadName) throw Util.error(`Unable to get thread name.`)

log(c`Random delay has been set to {${cTime} ${delayMinutes}m${second}s}.`)
log(
	c`Message will be sent to {${cName} ${threadName}} at {${cTime} ${sendTimeFormatted}}. Current time is {${cTime} ${Util.getFormattedTime()}}.`
)
const listener = await api.listen()

listener.addListener(`message`, (message) => {
	log(message)
})

const sendMessage = cron.schedule(cronExp, async () => {
	const messageObject = env.MESSAGE === `like` ? {sticker: Util.likeSticker} : {body: env.MESSAGE}
	// Await api.sendMessage(messageObject, threadID)

	log(
		c`Sent {${cData} ${logMessage}} to {${cName} ${threadName}} at {${cTime} ${Util.getFormattedTime()}}.`
	)

	await Util.end(sendMessage, api)
})
