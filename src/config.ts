import c from 'chalk'
import dotenv from 'dotenv'
import prompts from 'prompts'
import { cBold, cCaution, cProperty } from './util/chalk-names'
import {
  isOfTypeNumber,
  isOfTypeString,
  likeStickerAlias,
  log,
  promptsCancel,
  validateMaxDelayMinutes,
  validateTime,
} from './util/util'

interface ConfigOptions {
  email: string
  threadID: number
  message: string
  time: string
  maxDelayMinutes: number
}

const config: ConfigOptions = {
  email: '',
  threadID: 0,
  message: '',
  time: '',
  maxDelayMinutes: 0,
}

export function getConfig<K extends keyof ConfigOptions>(key: K): ConfigOptions[K] {
  return config[key]
}

export function setConfig<K extends keyof ConfigOptions, V extends ConfigOptions[K]>(key: K, value: V): void {
  config[key] = value
}

function isConfigKey(key: string): key is keyof ConfigOptions {
  return Object.keys(config).includes(key)
}

export function isConfigSet(): boolean {
  for (const property in config) {
    if (!isConfigKey(property)) continue

    if (config[property]) return true
  }

  return false
}

let configWasInitialized = false
export function wasConfigInitialized(): boolean {
  return configWasInitialized
}

export default function handleConfig(): void {
  const parsed = dotenv.config({ path: 'config.txt' }).parsed

  if (parsed) {
    for (const property in config) {
      if (!isConfigKey(property)) continue

      if (Object.prototype.hasOwnProperty.call(parsed, property)) setConfig(property, parsed[property])
    }
  }

  if (validateTime(getConfig('time')) !== true) setConfig('time', '')
  if (validateMaxDelayMinutes(getConfig('maxDelayMinutes')) !== true) setConfig('maxDelayMinutes', 0)

  if (isConfigSet()) {
    configWasInitialized = true
    logConfigInfo()
  }
}

export async function finishConfig(): Promise<void> {
  const configPrompts: prompts.PromptObject<string>[] = [
    {
      type: !getConfig('threadID') ? 'number' : undefined,
      name: 'threadID',
      message: 'Enter the thread ID. Your message will be sent to this user/group.',
    },
    {
      type: !getConfig('message') ? 'text' : undefined,
      name: 'message',
      message: `Enter your message. Type "${likeStickerAlias}" (without quotes) to send the default like/thumbs-up sticker.`,
      initial: `${likeStickerAlias}`,
    },
    {
      type: !getConfig('time') ? 'text' : undefined,
      name: 'time',
      message:
        'Enter the time you want the message to be sent (random delay is added on top of this).\nMust be in 24h time format. e.g. 0530, 1730, etc.',
      validate: (time) => validateTime(time),
    },
    {
      type: !getConfig('maxDelayMinutes') ? 'number' : undefined,
      name: 'maxDelayMinutes',
      message: 'Enter the maximum number of minutes for the randomized delay. (Must be less than 60)',
      initial: 10,
      validate: (maxDelayMinutes) => validateMaxDelayMinutes(maxDelayMinutes),
    },
  ]

  const configResponses = await prompts(configPrompts, promptsCancel)

  if (configResponses.threadID && isOfTypeNumber(configResponses.threadID))
    setConfig('threadID', configResponses.threadID)
  if (configResponses.message && isOfTypeString(configResponses.message)) setConfig('message', configResponses.message)
  if (configResponses.time && isOfTypeString(configResponses.time)) setConfig('time', configResponses.time)
  if (configResponses.maxDelayMinutes && isOfTypeNumber(configResponses.maxDelayMinutes))
    setConfig('maxDelayMinutes', configResponses.maxDelayMinutes)
}

function logConfigInfo() {
  log(c`\n{${cBold} Using the following values from config.txt:}`)

  const skipped = []

  for (const property in config) {
    if (!isConfigKey(property)) continue
    if (config[property]) log(c`${property}: {${cProperty} ${config[property]}}`)
    else skipped.push(property)
  }

  if (skipped.length > 0)
    log(c`{${cBold} \nThe following values are either missing or invalid (you will be prompted for them):}`)

  for (const element of skipped) log(c`{${cCaution} ${element}}`)
}
