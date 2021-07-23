import c from 'chalk'
import dotenv from 'dotenv'
import * as envfile from 'envfile'
// eslint-disable-next-line unicorn/prefer-node-protocol
import fs from 'fs'
import prompts from 'prompts'
import { cBold, cCaution, cInfo, cProperty } from './util/chalk-names'
import {
  continuePrompt,
  isOfTypeNumber,
  isOfTypeString,
  likeStickerAlias,
  log,
  promptsCancel,
  validateMaxDelayMinutes,
  validateTime,
} from './util/util'

const configFileName = 'config.txt'

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

export default async function handleConfig(): Promise<void> {
  const parsed = dotenv.config({ path: `${configFileName}` }).parsed

  if (parsed) {
    isConfigSet = true

    log(c`{${cInfo} Found ${configFileName}.}`)
    const response = await continuePrompt('Do you want to use the values from your config?', {
      inactive: 'no (manually input settings)',
    })

    if (!response) return

    parseConfig(parsed)
  }

  if (isConfigSet) logConfigInfo()
}

let isConfigSet = false
export function wasConfigSet(): boolean {
  return isConfigSet
}

function parseConfig(parsed: dotenv.DotenvParseOutput) {
  for (const property in config) {
    if (!isConfigKey(property)) continue

    if (Object.prototype.hasOwnProperty.call(parsed, property)) {
      setConfig(property, parsed[property])
    }
  }

  if (validateTime(getConfig('time')) !== true) setConfig('time', '')
  if (validateMaxDelayMinutes(getConfig('maxDelayMinutes')) !== true) setConfig('maxDelayMinutes', 0)
}

function logConfigInfo() {
  log(c`\n{${cBold} Using the following values from ${configFileName}:}\n`)

  const skipped = []

  for (const property in config) {
    if (!isConfigKey(property)) continue
    if (config[property]) log(c`${property}: {${cProperty} ${config[property]}}`)
    else skipped.push(property)
  }

  if (skipped.length > 0)
    log(c`{${cBold} \nThe following values are either missing or invalid (you will be prompted for them):}`)

  for (const element of skipped) log(c`{${cCaution} ${element}}`)

  log('')
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

  log('')

  const response = await continuePrompt(`Do you want to save your config? (Will overwrite ${configFileName}.)`, {
    inactive: 'no',
  })

  if (response) fs.writeFileSync('config.txt', envfile.stringify(config))
}
