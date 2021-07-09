import c from 'chalk'
import prompts from 'prompts'
import fbLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import { getAndSetConfig } from './config'
import { cCaution, cError, cInfo, cSuccess } from './util/chalk-names'
import { formattedError, isOfType, log, promptsCancel } from './util/util'

let api: Api

export function getApi(): Api {
  return api
}

export default async function login(): Promise<Api> {
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

  const config = getAndSetConfig()
  log(c`Logged in as {${cSuccess} ${config.EMAIL}}\n`)

  return api
}

let initialEmail = ''
let initialPassword = ''

async function tryLogin() {
  const config = getAndSetConfig()

  if (!initialEmail) initialEmail = config.EMAIL
  if (!initialPassword) initialPassword = config.PASSWORD

  const loginPrompts: prompts.PromptObject<string>[] = [
    {
      type: !config.EMAIL ? 'text' : undefined,
      name: 'email',
      message: 'Enter your Facebook login email.',
      initial: initialEmail,
    },
    {
      type: !config.PASSWORD ? 'password' : undefined,
      name: 'password',
      message: 'Enter your password.',
      initial: initialPassword,
    },
  ]

  const loginResponses = await prompts(loginPrompts, promptsCancel)

  if (loginResponses.email) config.EMAIL = loginResponses.email as typeof config.EMAIL
  if (loginResponses.password) config.PASSWORD = loginResponses.password as typeof config.PASSWORD

  log(c`{${cInfo} Logging in...}`)
  const loginResult = await fbLogin(
    {
      email: config.EMAIL,
      password: config.PASSWORD,
    },
    { logLevel: 'silent' },
  ).catch((error: unknown) => {
    // On incorrect username/password, ts-messenger-api throws an object with one key/value pair of: error: 'Wrong username/password.'

    if (isOfType<Record<string, string>>(error, 'error')) {
      log(c`{${cCaution} ${error.error}}`)
      config.EMAIL = ''
      config.PASSWORD = ''
    } else throw error
  })

  getAndSetConfig(config)

  return loginResult
}
