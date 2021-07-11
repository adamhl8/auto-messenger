import c from 'chalk'
import prompts from 'prompts'
import fbLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import { getConfig, setConfig } from './config'
import { cCaution, cError, cInfo, cSuccess } from './util/chalk-names'
import { formattedError, isOfTypeString, log, objectHasPropertyOfType, promptsCancel } from './util/util'

let api: Api

export function getApi(): Api {
	return api
}

export default async function login(): Promise<void> {
	while (!api) {
		const loginResult = await tryLogin()
		if (!loginResult) continue
		api = loginResult
	}

	await api.listen()
	if (!api.isActive() || !api.listener) throw formattedError('Unable to establish connection to Facebook.')
	api.listener.addListener('error', (error) => {
		log(c`{${cError} ${error}}`)
	})

	log(c`Logged in as {${cSuccess} ${getConfig('email')}}\n`)
}

let initialEmail = ''

async function tryLogin() {
	if (!initialEmail) initialEmail = getConfig('email')

	const loginPrompts: prompts.PromptObject<string>[] = [
		{
			type: !getConfig('email') ? 'text' : undefined,
			name: 'email',
			message: 'Enter your Facebook login email.',
			initial: initialEmail,
		},
		{
			type: 'password',
			name: 'password',
			message: 'Enter your Facebook password.',
		},
	]

	const loginResponses = await prompts(loginPrompts, promptsCancel)

	if (loginResponses.email && isOfTypeString(loginResponses.email)) setConfig('email', loginResponses.email)
	let password = ''
	if (loginResponses.password && isOfTypeString(loginResponses.password)) password = loginResponses.password

	log(c`{${cInfo} Logging in...}`)
	return await fbLogin(
		{
			email: getConfig('email'),
			password,
		},
		{ logLevel: 'silent' },
	).catch((error) => {
		// On invalid username/password, ts-messenger-api throws an object with one key/value pair: { error: 'Wrong username/password.' }
		if (objectHasPropertyOfType<string, string>(error, 'error')) {
			log(c`{${cCaution} ${error.error}}`)
			setConfig('email', '')
		} else throw error
	})
}
