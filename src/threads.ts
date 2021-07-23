import c from 'chalk'
import prompts from 'prompts'
import { ThreadID } from 'ts-messenger-api/dist/lib/types/threads'
import { getConfig, setConfig, wasConfigSet } from './config'
import { getApi } from './login'
import { cInfo, cName, cProperty } from './util/chalk-names'
import {
  continuePrompt,
  formattedError,
  getRecipientName,
  log,
  objectHasPropertyOfType,
  promptsCancel,
} from './util/util'

export default async function getThreads(): Promise<void> {
  if (wasConfigSet()) log(c`{${cInfo} No thread ID was provided.}`) // We only want to log this if a config.txt is provided but no threadID is set.
  log(c`{${cInfo} In order to send a message, the unique thread ID for the recipient user/group is needed.}`)
  log(
    '\nBy monitoring incoming messages, auto-messenger will build a list of thread IDs. (Have the user/group send a message to you, or simply wait for a message to be sent.)',
  )
  log('You will be able to pick the message recipient by name/group name.\n')

  if (
    !(await continuePrompt('Start monitoring messages to get thread IDs?', {
      inactive: 'no (enter thread ID manually)',
    }))
  )
    return

  const api = getApi()
  if (!api.isActive() || !api.listener) throw formattedError('Unable to establish connection to Facebook.')

  async function handleThreadID(threadID: ThreadID) {
    const recipient = await getRecipientName(threadID)

    if (!choices.some((element) => element.value === `${threadID}`))
      choices.push({
        title: recipient,
        value: `${threadID}`,
      })
  }

  api.listener.addListener('message', (message) => {
    if (objectHasPropertyOfType<string, ThreadID>(message, 'threadId')) void handleThreadID(message.threadId)
  })

  const choices: prompts.Choice[] = [{ title: '-> Refresh <-', value: 'refresh' }]

  const threads: prompts.PromptObject<string> = {
    type: 'select',
    name: 'value',
    message: 'Select a user/group.',
    choices,
    initial: 1,
    hint: 'Use arrow keys. Press Enter to select.',
  }

  const refreshPrompt: prompts.PromptObject<string> = {
    type: 'invisible',
    name: 'value',
    message: 'No threads found yet. Press Enter to refresh.',
  }

  while (!getConfig('threadID')) {
    if (choices.length <= 1) {
      await prompts(refreshPrompt, promptsCancel)
      continue
    }

    const response = await prompts(threads, promptsCancel)
    if (response.value === 'refresh') continue

    setConfig('threadID', Number(response.value))

    log(
      c`{${cInfo} Message will be sent to} {${cName} ${await getRecipientName(
        response.value,
      )}}. Thread ID: {${cProperty} ${getConfig('threadID')}}\n`,
    )
  }

  api.listener.removeAllListeners('message')
}
