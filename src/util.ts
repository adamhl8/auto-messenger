import facebookLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import prompts from 'prompts'
import cron from 'node-cron'
import dayjs from 'dayjs'
import c from 'chalk'

export const log = console.log
export const timeRegex = /^((([01]\d)|(2[0-3])):?([0-5]\d))/
export const dateFormatString = `h:mm:ss A [on] ddd[,] MMM D`
export const likeSticker = 369_239_263_222_822
export const likeStickerAlias = `like`

export const chalkNames = {
	cError: `red`,
	cWarning: `hex('#FFA500')`,
	cSuccess: `green`,
	cProperty: `cyan`,
	cData: `blue`,
	cName: `magenta`,
	cTime: `yellow`,
	cBold: `bold`
}

export interface envInterface {
	[key: string]: string | number
	EMAIL: string
	PASSWORD: string
	THREAD_ID: string
	MESSAGE: string
	TIME: string
	MAX_DELAY: number
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
	const responses = await prompts(questions, options)
	return responses
}

// @ts-expect-error
export const fbLogin: typeof facebookLogin = facebookLogin.default as Promise<Api | undefined>

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

export function error(message: string) {
	return new Error(c.bold.red(message))
}

export async function end(cron: cron.ScheduledTask, api: Api) {
	cron.stop()
	api.stopListening()
	await api.logout()
	log(c`{${chalkNames.cWarning} Logged out.}`)
	process.exit(0)
}

process.on(`SIGINT`, () => {
	process.exit(0)
})
