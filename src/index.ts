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
		type: 'text',
		name: 'email',
		message: 'Enter your Facebook login email.'
	},
	{
		type: 'password',
		name: 'password',
		message: 'Enter your password.'
	}
]

let loginResponses
let api: Api

while (true) {
	loginResponses = await prompts(loginPrompts)

	const login = await fbLogin({
		email: loginResponses.email,
		password: loginResponses.password
	}).catch((error) => {
		if (error.error) console.error(error.error)
		else throw error
	})

	if (!login) continue

	api = login
	break
}

console.log(`Logged in as ${loginResponses.email}`)

let threadID = process.env.THREAD_ID

const timeRegex = /^((([01]\d)|(2[0-3])):?([0-5]\d))/

const configPrompts: PromptObject[] = [
	{
		type: 'text',
		name: 'message',
		message:
			'Enter your message. Type "like" (without quotes) to send the default like/thumbs-up sticker.'
	},
	{
		type: 'text',
		name: 'time',
		message:
			'Enter the time you want the message to be sent. (Must be in 24h time format. e.g. 0530 or 1730)',
		validate: (time) => (timeRegex.test(time) ? true : 'Not a valid time.')
	},
	{
		type: 'number',
		name: 'delay',
		message: 'Enter the maximum number of minutes for the randomized delay. (Must be less than 60)',
		validate: (delay) => (delay > 0 && delay < 60 ? true : 'Not a valid delay.')
	},
	{
		type: () => (!threadID ? 'number' : null),
		name: 'threadID',
		message: 'Enter the thread ID. This is where your message will be sent.'
	}
]

const configResponses = await prompts(configPrompts)

const message =
	configResponses.message === 'like'
		? {sticker: 369_239_263_222_822}
		: {body: configResponses.message}

const time = timeRegex.exec(configResponses.time)
if (!time) throw new Error('time is null.')

const hour = Number(time[2])
const minute = Number(time[5])
const sleepms = randomDelay(1, configResponses.delay)
if (!threadID) threadID = configResponses.threadID

if (!threadID) throw new Error('THREAD_ID is undefined.')

const thread = (await api.getThreadInfo(threadID)).threadName
if (!thread) throw new Error('Unable to get thread.')

const baseSendTime = new Date(0, 0, 1, hour, minute)
const sendTime = new Date(baseSendTime.getTime() + sleepms).toLocaleTimeString()

console.log(
	`Message will be sent to "${thread}" at ${sendTime}. Current time is ${new Date().toLocaleString()}.`
)

const listener = await api.listen()

listener.addListener('message', (message) => {
	console.log(message)
})

cron.schedule(`${minute} ${hour} * * *`, async () => {
	await sleep(sleepms)

	if (!threadID) throw new Error('THREAD_ID is undefined.')

	void api.sendMessage(message, threadID)

	console.log(`Sent message to "${thread}" at ${new Date().toLocaleString()}`)
})

// Min and Max included
function randomDelay(min: number, max: number) {
	const random =
		Math.random() < 0.5
			? (1 - Math.random()) * (max - min) + min
			: Math.random() * (max - min) + min
	const sleepMinutes = Math.floor(random * 10) / 10
	const ms = Math.round(sleepMinutes * 60_000)

	const totalSeconds = Math.round(sleepMinutes * 60)
	const minutes = Math.floor(sleepMinutes)
	const seconds = totalSeconds - minutes * 60

	console.log(`Random delay has been set to ${minutes}m${seconds}s (${ms}ms).`)
	return ms
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
