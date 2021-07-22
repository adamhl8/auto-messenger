import c from 'chalk'
import prompts from 'prompts'
import { ThreadID } from 'ts-messenger-api/dist/lib/types/threads'
import exit from '../exit'
import { getApi } from '../login'
import { timeRegex } from '../time'
import { cBold, cError, cInfo, cName } from './chalk-names'

export const log = console.log
export const likeSticker = 369_239_263_222_822
export const likeStickerAlias = 'like'

export const welcomeMessage = c`\n{${cBold}.${cInfo} Welcome to auto-messenger.}
This program allows you to automatically send a message (with a short randomized delay) to another Facebook user/chat group at a chosen time.
You will automatically be logged out once your scheduled message is sent. Simply reopen the program to schedule another message.
For more info/help, please see the GitHub repo: {${cBold}.${cName} https://github.com/adamhl8/auto-messenger}\n`

export function objectHasPropertyOfType<K extends string | number | symbol, V>(
  toBeChecked: unknown,
  key: K,
): toBeChecked is Record<K, V> {
  const isObject = toBeChecked !== null && typeof toBeChecked === 'object' && Array.isArray(toBeChecked) === false

  return isObject ? (toBeChecked as Record<K, V>)[key] !== undefined : false
}

export function isOfTypeNumber(toBeChecked: unknown): toBeChecked is number {
  return typeof toBeChecked === 'number'
}

export function isOfTypeString(toBeChecked: unknown): toBeChecked is string {
  return typeof toBeChecked === 'string'
}

export function isOfTypeError(toBeChecked: unknown): toBeChecked is Error {
  return (
    objectHasPropertyOfType<string, string>(toBeChecked, 'name') &&
    objectHasPropertyOfType<string, string>(toBeChecked, 'message')
  )
}

export function validateTime(time: string): boolean | string {
  return timeRegex.test(time) && time.length === 4 ? true : 'Not a valid time.'
}

export function validateMaxDelayMinutes(maxDelayMinutes: number): boolean | string {
  return maxDelayMinutes >= 0 && maxDelayMinutes < 60 ? true : 'Not a valid delay.'
}

export function formattedError(error: string): Error {
  return new Error(c`{${cError} ${error}}`)
}

export const promptsCancel = { onCancel: async (): Promise<void> => await exit() }

interface continuePromptOptions {
  active?: string
  inactive?: string
}
export async function continuePrompt(
  message: string,
  options?: continuePromptOptions,
): Promise<prompts.Answers<'value'>> {
  return await prompts(
    {
      type: 'toggle',
      name: 'value',
      message,
      initial: true,
      active: options?.active ? options.active : 'yes',
      inactive: options?.inactive ? options.inactive : 'exit',
    },
    promptsCancel,
  )
}

export async function getRecipientName(threadID: ThreadID): Promise<string> {
  const api = getApi()

  /*
	It seems like getThreadInfo() is currently bugged. It throws an error when provided with a valid userID (one-to-one chat).
	Note that I'm using userID to refer to a threadID for a one-to-one chat, while threadID will generally refer to a group chat.
	Looking at the type definition for ThreadInfo, it seems like getThreadInfo() should still return a ThreadInfo object but with some values as null.
	As such, we try to getThreadInfo() first and fallback to getUserInfo().
	*/

  try {
    const threadInfo = await api.getThreadInfo(threadID)
    // threadName *should* be null if getThreadInfo() is provided with a valid userID. Checking it in case ts-messenger-api fixes this bug.
    if (!threadInfo.threadName) throw formattedError('Unable to get thread name.')
    else return threadInfo.threadName
  } catch {
    const userInfo = (await api.getUserInfo([threadID]))[threadID] // getUserInfo() takes an array of userIDs and returns an object of { userID: UserInfo, ... }.
    if (userInfo.fullName) return userInfo.fullName // fullName should always exist on userInfo. Checking it in case of api error.
  }

  throw formattedError('Unable to get recipient name.') // Throwing an error here to satisfy the compiler even though this is technically unreachable.
}
