import prompts from 'prompts'
import dayjs from 'dayjs'
import c from 'chalk'

export const log = console.log
export const timeRegex = /^((([01]\d)|(2[0-3])):?([0-5]\d))/
export const dateFormatString = `h:mm:ss A [on] ddd[,] MMM D`
export const likeSticker = 369_239_263_222_822
export const likeStickerAlias = `like`

export const chalkNames = {
	cError: `bold.red`,
	cCaution: `red`,
	cInfo: `hex('#FFA500')`,
	cSuccess: `green`,
	cProperty: `cyan`,
	cData: `blue`,
	cName: `magenta`,
	cTime: `yellow`,
	cBold: `bold`
}

export const welcomeMessage = c`\n{${chalkNames.cBold}.${chalkNames.cInfo} Welcome to auto-messenger.}
This program allows you to automatically send a message (with a short randomized delay) to another Facebook user/chat group at a chosen time.
You will automatically be logged out once your scheduled message is sent. Simply reopen the program to schedule another message.
For more info/help, please see the GitHub repo: {${chalkNames.cBold}.${chalkNames.cName} https://github.com/adamhl8/auto-messenger}\n`

export interface envInterface {
	[key: string]: string | number
	EMAIL: string
	PASSWORD: string
	THREAD_ID: string
	MESSAGE: string
	TIME: string
	MAX_DELAY_MINUTES: number
}

export function validateTime(time: string) {
	return timeRegex.test(time) ? true : `Not a valid time.`
}

export function validateDelay(delay: number) {
	return delay >= 0 && delay < 60 ? true : `Not a valid delay.`
}

export type promptObject = prompts.PromptObject | prompts.PromptObject[]
export async function prompt(questions: promptObject, options?: prompts.Options | undefined) {
	if (options) options.onCancel = () => process.exit(0)
	return await prompts(questions, options)
}

// Min and Max included
export function randomDelayMinutes(min: number, max: number) {
	const random =
		Math.random() < 0.5
			? (1 - Math.random()) * (max - min) + min
			: Math.random() * (max - min) + min

	const minutes = Math.floor(random * 10) / 10
	const totalSeconds = Math.round(minutes * 60)

	const delayMinutes = Math.floor(minutes)
	const second = totalSeconds - delayMinutes * 60

	return {delayMinutes, second}
}

export function getTime() {
	return dayjs()
}

export function getFormattedTime() {
	return dayjs().format(dateFormatString)
}

export async function exit() {
	const {api, cronSendMessage} = await import('./index.js')

	if (cronSendMessage) cronSendMessage.stop()

	if (api) {
		api.stopListening()
		await api.logout()
		log(c`{${chalkNames.cInfo} Logged out.}`)
	}

	await exitPrompt()
	process.exit(0)
}

async function exitPrompt() {
	await prompt({
		type: `text`,
		name: `value`,
		message: `Press enter to exit.`
	})
}

export function error(error: string) {
	return new Error(c`{${chalkNames.cError} ${error}}`)
}

process.on('uncaughtException', async (error) => {
	log(c`{${chalkNames.cError} ${error}}`)
	await exit()
})

process.on(`SIGINT`, async () => {
	await exit()
})
