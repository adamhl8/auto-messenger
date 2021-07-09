import c from 'chalk'
import dotenv from 'dotenv'
import prompts from 'prompts'
import { cBold, cCaution, cProperty } from './util/chalk-names'
import { likeStickerAlias, log, promptsCancel, validateDelay, validateTime } from './util/util'

export interface configInterface {
  [key: string]: string | number
  EMAIL: string
  PASSWORD: string
  THREAD_ID: string
  MESSAGE: string
  TIME: string
  MAX_DELAY_MINUTES: number
}

let config: configInterface = {
  EMAIL: '',
  PASSWORD: '',
  THREAD_ID: '',
  MESSAGE: '',
  TIME: '',
  MAX_DELAY_MINUTES: 0,
}

export function getAndSetConfig(updatedConfig?: configInterface): configInterface {
  if (updatedConfig) config = updatedConfig

  return config
}

export default function handleConfig(): configInterface {
  const parsed = dotenv.config().parsed

  if (parsed) {
    for (const property in config) {
      if (Object.prototype.hasOwnProperty.call(parsed, property)) {
        config[property] = parsed[property]
      }
    }

    config.TIME = validateTime(config.TIME) === true ? config.TIME : ''
    config.MAX_DELAY_MINUTES = validateDelay(config.MAX_DELAY_MINUTES) === true ? config.MAX_DELAY_MINUTES : 0

    for (const property in config) {
      if (config[property]) {
        logConfigInfo()
        break
      }
    }
  }

  return config
}

export async function finishConfig(): Promise<configInterface> {
  const configPrompts: prompts.PromptObject<string>[] = [
    {
      type: !config.THREAD_ID ? 'number' : undefined,
      name: 'threadID',
      message: 'Enter the thread ID. This is where your message will be sent.',
    },
    {
      type: !config.MESSAGE ? 'text' : undefined,
      name: 'message',
      message: `Enter your message. Type "${likeStickerAlias}" (without quotes) to send the default like/thumbs-up sticker.`,
      initial: `${likeStickerAlias}`,
    },
    {
      type: !config.TIME ? 'text' : undefined,
      name: 'time',
      message:
        'Enter the time you want the message to be sent (random delay is added on top of this).\nMust be in 24h time format. e.g. 0530, 1730, etc.',
      validate: (time: string) => validateTime(time),
    },
    {
      type: !config.MAX_DELAY_MINUTES ? 'number' : undefined,
      name: 'delay',
      message: 'Enter the maximum number of minutes for the randomized delay. (Must be less than 60)',
      initial: 10,
      validate: (delay: number) => validateDelay(delay),
    },
  ]

  const configResponses = await prompts(configPrompts, promptsCancel)

  if (configResponses.threadID) config.THREAD_ID = configResponses.threadID as typeof config.THREAD_ID
  if (configResponses.message) config.MESSAGE = configResponses.message as typeof config.MESSAGE
  if (configResponses.time) config.TIME = configResponses.time as typeof config.TIME
  if (configResponses.delay) config.MAX_DELAY_MINUTES = configResponses.delay as typeof config.MAX_DELAY_MINUTES

  return config
}

function logConfigInfo() {
  log(c`{${cBold} Using the following values from .env:}`)

  const skipped: string[] = []

  for (const property in config) {
    if (config[property]) {
      if (property === 'PASSWORD') {
        log(c`${property}: {${cProperty} ${'*'.repeat(config[property].length)}}`)
        continue
      }

      log(c`${property}: {${cProperty} ${config[property]}}`)
    } else skipped.push(property)
  }

  if (skipped.length > 0) {
    log(c`{${cBold} \nThe following values are either missing or invalid (you will be prompted for them):}`)
  }
  for (const element of skipped) {
    log(c`{${cCaution} ${element}}`)
  }
}
