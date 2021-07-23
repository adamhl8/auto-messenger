import c from 'chalk'
// eslint-disable-next-line unicorn/prefer-node-protocol
import fs from 'fs'
import prompts from 'prompts'
import fbLogin from 'ts-messenger-api'
import Api from 'ts-messenger-api/dist/lib/api'
import { AppState, LoginCredentials } from 'ts-messenger-api/dist/lib/types'
import { getConfig, setConfig } from './config'
import exit from './exit'
import { cCaution, cError, cInfo, cSuccess } from './util/chalk-names'
import {
  continuePrompt,
  formattedError,
  isOfTypeError,
  isOfTypeString,
  log,
  objectHasPropertyOfType,
  promptsCancel,
} from './util/util'

let api: Api

export function getApi(): Api {
  return api
}

export default async function login(): Promise<void> {
  const appStateLoginResult = await tryAppStateLogin()
  if (appStateLoginResult) api = appStateLoginResult

  while (!api) {
    const loginResult = await tryCredentialLogin()
    if (!loginResult) continue
    api = loginResult

    fs.writeFileSync('app-state.json', JSON.stringify(api.getAppState()))
    log(c`{${cInfo} Saved login session to AppState.}`)
  }

  await api.listen()
  if (!api.isActive() || !api.listener) throw formattedError('Unable to establish connection to Facebook.')
  api.listener.addListener('error', (error) => {
    log(c`{${cError} ${error}}`)
  })

  log(c`Logged in as {${cSuccess} ${getConfig('email')}}\n`)
}

async function tryAppStateLogin() {
  let appState
  try {
    appState = fs.readFileSync('app-state.json')
  } catch {
    return
  }

  log(c`{${cInfo} Found AppState file.}`)

  appState = JSON.parse(appState.toString()) ? (JSON.parse(appState.toString()) as AppState) : undefined
  if (!appState) return log(c`{${cCaution} Failed to parse AppState. Trying email/password login.}`)

  log(c`{${cInfo} Logging in with AppState...}`)

  const appStateLoginResult = await apiLogin({ appState })
  if (!appStateLoginResult) return log(c`{${cCaution} Failed to login with AppState. Trying email/password login.}`)

  return appStateLoginResult
}

let initialEmail = ''

async function tryCredentialLogin() {
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

  return await apiLogin({
    email: getConfig('email'),
    password,
  })
}

let forceLogin = false

async function apiLogin(loginData: LoginCredentials) {
  return await fbLogin(loginData, { logLevel: 'silent', forceLogin }).catch(async (error) => {
    await handleLoginErrors(error)
  })
}

async function handleLoginErrors(error: unknown) {
  let errorMatch = false

  // On invalid email/password, ts-messenger-api throws an object with one key/value pair: { error: 'Wrong username/password.' }
  if (objectHasPropertyOfType<string, string>(error, 'error')) {
    errorMatch = true

    log(c`{${cCaution} Wrong email/password.}`)
    setConfig('email', '')
  }

  // ts-messenger-api throws an Error with a message that starts with 'Error retrieving userID' when Facebook blocks the login due to 2FA or an unrecognized location.
  if (isOfTypeError(error) && error.message.includes('Error retrieving userID')) {
    errorMatch = true

    if (forceLogin) {
      log(
        c`\n{${cCaution} Failed to login. Please check your Facebook security/login settings and disable 2FA if needed.}\n`,
      )
      await exit()
    }

    log(c`{${cCaution} Failed to login. You either have 2FA enabled or are logging in from an unknown location.}\n`)
    log(
      c`{${cInfo} Try again with a force login?}\n{${cCaution} This will automatically approve of any recent logins and continue with the login process.}`,
    )

    if (await continuePrompt('Try a force login on next attempt?')) forceLogin = true
    else await exit()
  }

  if (!errorMatch) log(c`{${cCaution} Failed to login:\n${error}}\n`)

  return errorMatch
}
