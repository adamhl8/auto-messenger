import c from 'chalk'
import prompts from 'prompts'
import { ThreadID, ThreadInfo } from 'ts-messenger-api/dist/lib/types/threads'
import { UserInfo } from 'ts-messenger-api/dist/lib/types/users'
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

export function isOfType<T>(toBeChecked: unknown, propertyToCheckFor: keyof T): toBeChecked is T {
  return (toBeChecked as T)[propertyToCheckFor] !== undefined
}

export function validateTime(time: string): boolean | string {
  return timeRegex.test(time) ? true : 'Not a valid time.'
}

export function validateDelay(delay: number): boolean | string {
  return delay >= 0 && delay < 60 ? true : 'Not a valid delay.'
}

export function formattedError(error: string): Error {
  return new Error(c`{${cError} ${error}}`)
}

export const promptsCancel = { onCancel: async (): Promise<void> => await exit() }

interface continuePromptOptions {
  active: string
  inactive: string
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
      active: options ? options.active : 'yes',
      inactive: options ? options.inactive : 'exit',
    },
    promptsCancel,
  )
}

export async function getRecipientName(threadID: ThreadID): Promise<string> {
  const api = getApi()

  let recipient

  try {
    recipient = await api.getThreadInfo(threadID)
  } catch {
    try {
      recipient = (await api.getUserInfo([threadID]))[threadID]
    } catch {
      throw formattedError('Unable to get recipient.')
    }
  }

  let recipientName

  if (isOfType<ThreadInfo>(recipient, 'threadName')) recipientName = recipient.threadName
  if (isOfType<UserInfo>(recipient, 'fullName')) recipientName = recipient.fullName
  if (!recipientName) throw formattedError('Unable to get recipient name.')

  return recipientName
}
