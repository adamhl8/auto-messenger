import facebookLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import dotenv from 'dotenv'
import cron from 'node-cron'
import prompts, {PromptObject} from 'prompts'

dotenv.config()

// @ts-expect-error
const fbLogin: typeof facebookLogin = facebookLogin.default as Promise<Api | undefined>

const loginQuestions: PromptObject[] = [
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

let responses
let api: Api

while (true) {
	responses = await prompts(loginQuestions)

	const login = await fbLogin({
		email: responses.email,
		password: responses.password
	}).catch((error) => {
		if (error.error) console.error(error.error)
		else throw error
	})

	if (!login) continue

	api = login
	break
}

console.log(`Logged in as ${responses.email}`)

const threadID = process.env.THREAD_ID

if (!threadID) throw new Error('THREAD_ID is undefined.')

const listener = await api.listen()

listener.addListener('message', (message) => {
	console.log(message)
})

const thumbsUpSticker = 369_239_263_222_822

cron.schedule(
	'10 5 * * *',
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
