import c from 'chalk'
import prompts from 'prompts'
import exit from '../exit'
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

export async function shouldContinue(): Promise<prompts.Answers<'value'>> {
  return await prompts(
    {
      type: 'toggle',
      name: 'value',
      message: 'Continue?',
      initial: true,
      active: 'yes',
      inactive: 'exit',
    },
    promptsCancel,
  )
}
