import facebookLogin from 'ts-messenger-api'
import dotenv from 'dotenv'
import cron from 'node-cron'

dotenv.config()

// @ts-expect-error
const login: typeof facebookLogin = facebookLogin.default as Promise<Api | undefined>

const api = await login({
	email: process.env.EMAIL,
	password: process.env.PASSWORD
})

if (!api) throw new Error('API failed to initialize.')

console.log(`Logged in as ${process.env.EMAIL}`)

const listener = await api.listen()

listener.addListener('message', (message) => {
	console.log(message)
})

const thumbsUpSticker = 369_239_263_222_822
const threadID = process.env.THREAD_ID

if (!threadID) throw new Error('THREAD_ID is undefined.')

cron.schedule(
	'25 5 * * *',
	async () => {
		await randomSleepMinutes(1, 10, 2)

		void api.sendMessage({sticker: thumbsUpSticker}, threadID)

		const date = new Date().toLocaleString()
		console.log(`Sent message at ${date}`)
	},
	{
		timezone: 'Europe/Berlin'
	}
)

// Min and Max included
async function randomSleepMinutes(min: number, max: number, decimalPlaces: number) {
	const random =
		Math.random() < 0.5
			? (1 - Math.random()) * (max - min) + min
			: Math.random() * (max - min) + min
	const power = 10 ** decimalPlaces
	const sleepDuration = Math.floor(random * power) / power
	const ms = sleepDuration * 60_000

	const totalSeconds = ms / 1000
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds - minutes * 60

	console.log(`Random sleep duration is ${minutes}m${seconds}s (${ms}ms)`)
	return new Promise((resolve) => setTimeout(resolve, ms))
}
