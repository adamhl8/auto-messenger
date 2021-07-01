import facebookLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import dotenv from 'dotenv'
import cron from 'node-cron'
import prompts, {PromptObject} from 'prompts'

dotenv.config()

// @ts-expect-error
const fbLogin: typeof facebookLogin = facebookLogin.default as Promise<Api | undefined>

const loginPrompts: PromptObject[] = [
	{
		type: () => (!process.env.EMAIL ? 'text' : null),
		name: 'email',
		message: 'Enter your Facebook login email.'
	},
	{
		type: () => (!process.env.PASSWORD ? 'password' : null),
		name: 'password',
		message: 'Enter your password.'
	}
]

let api: Api

while (true) {
	const loginResponses = await prompts(loginPrompts)

	const email = process.env.EMAIL ? process.env.EMAIL : loginResponses.email
	const password = process.env.PASSWORD ? process.env.PASSWORD : loginResponses.password

	const login = await fbLogin({
		email,
		password
	}).catch((error) => {
		if (error.error && process.env.EMAIL && process.env.PASSWORD) throw new Error(error.error)
		if (error.error) console.error(error.error)
		else throw error
	})

	if (!login) continue

	api = login
	console.log(`Logged in as ${email}`)
	break
}

const timeRegex = /^((([01]\d)|(2[0-3])):?([0-5]\d))/

const configPrompts: PromptObject[] = [
	{
		type: () => (!process.env.MESSAGE ? 'text' : null),
		name: 'message',
		message:
			'Enter your message. Type "like" (without quotes) to send the default like/thumbs-up sticker.'
	},
	{
		type: () => (!process.env.TIME ? 'text' : null),
		name: 'time',
		message:
			'Enter the time you want the message to be sent. (Must be in 24h time format. e.g. 0530 or 1730)',
		validate: (time) => (timeRegex.test(time) ? true : 'Not a valid time.')
	},
	{
		type: () => (!process.env.MAX_DELAY ? 'number' : null),
		name: 'delay',
		message: 'Enter the maximum number of minutes for the randomized delay. (Must be less than 60)',
		validate: (delay) => (delay > 0 && delay < 60 ? true : 'Not a valid delay.')
	},
	{
		type: () => (!process.env.THREAD_ID ? 'number' : null),
		name: 'threadID',
		message: 'Enter the thread ID. This is where your message will be sent.'
	}
]

const configResponses = await prompts(configPrompts)

const messageObject = process.env.MESSAGE
	? process.env.MESSAGE === 'like'
		? {sticker: 369_239_263_222_822}
		: {body: process.env.MESSAGE}
	: configResponses.message === 'like'
	? {sticker: 369_239_263_222_822}
	: {body: configResponses.message}

const message =
	Object.values(messageObject)[0] === 369_239_263_222_822
		? 'like/thumbs-up sticker'
		: `"${Object.values(messageObject)[0]}"`

const time = process.env.TIME
	? timeRegex.exec(process.env.TIME)
	: timeRegex.exec(configResponses.time)

const delay = process.env.MAX_DELAY ? process.env.MAX_DELAY : configResponses.delay
const threadID = process.env.THREAD_ID ? process.env.THREAD_ID : configResponses.threadID

if (!time) throw new Error('time is null.')
const {delayMinutes, seconds} = randomDelay(1, delay)
let hour = Number(time[2])
let minute = Number(time[5]) + delayMinutes

if (minute > 59) {
	hour++
	minute -= 60
	if (hour > 23) hour -= 24
}

const sendTime = new Date(0, 0, 1, hour, minute, seconds).toLocaleTimeString()

const thread = (await api.getThreadInfo(threadID)).threadName
if (!thread) throw new Error('Unable to get thread.')

console.log(`Random delay has been set to ${delayMinutes}m${seconds}s.`)
console.log(
	`Message will be sent to "${thread}" at ${sendTime}. Current time is ${new Date().toLocaleString()}.`
)

const listener = await api.listen()

listener.addListener('message', (message) => {
	console.log(message)
})

cron.schedule(`${seconds} ${minute} ${hour} * * *`, async () => {
	// Void api.sendMessage(messageObject, threadID)
	console.log(`Would have sent ${message}`)

	console.log(`Sent ${message} to "${thread}" at ${new Date().toLocaleString()}.`)
})

// Min and Max included
function randomDelay(min: number, max: number) {
	const random =
		Math.random() < 0.5
			? (1 - Math.random()) * (max - min) + min
			: Math.random() * (max - min) + min

	const minutes = Math.floor(random * 10) / 10
	const totalSeconds = Math.round(minutes * 60)

	const delayMinutes = Math.floor(minutes)
	const seconds = totalSeconds - delayMinutes * 60

	return {delayMinutes, seconds}
}
