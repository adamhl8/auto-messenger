import c from 'chalk'
import prompts from 'prompts'
import { getAndSetConfig } from './config'
import exit from './exit'
import { getApi } from './login'
import { cInfo, cName, cProperty } from './util/chalk-names'
import { continuePrompt, formattedError, getRecipientName, isOfType, log, promptsCancel } from './util/util'

export default async function getThreads(): Promise<void> {
  log(c`{${cInfo} No thread ID was provided.}`)
  log('Currently the only way to get thread IDs is to monitor incoming messages.')
  log(
    'auto-messenger will build a list of thread IDs from incoming messages that are sent after you continue. (Have the person/group send a message to you.)',
  )

  if (!(await continuePrompt('Start monitoring messages to get thread IDs?')).value) await exit()

  const api = getApi()
  if (!api.isActive() || !api.listener) throw formattedError('Unable to establish connection to Facebook.')

  api.listener.addListener('message', (message) => {
    if (!isOfType<Record<string, number>>(message, 'threadId')) return

    getRecipientName(message.threadId).then(
      (recipient) => {
        if (!choices.some((element) => element.value === `${message.threadId}`))
          choices.push({
            title: recipient,
            value: `${message.threadId}`,
          })
      },
      (error) => {
        throw error
      },
    )
  })

  const choices: prompts.Choice[] = [{ title: '-> Refresh <-', value: 'refresh' }]

  const threads: prompts.PromptObject<string> = {
    type: 'select',
    name: 'value',
    message: 'Select a user/thread.',
    choices,
    initial: 1,
    hint: 'Use arrow keys. Press enter to select.',
  }

  const refreshPrompt: prompts.PromptObject<string> = {
    type: 'invisible',
    name: 'value',
    message: 'No threads found yet. Press enter to refresh.',
  }

  const config = getAndSetConfig()
  while (!config.THREAD_ID) {
    if (choices.length <= 1) {
      await prompts(refreshPrompt, promptsCancel)
      continue
    }

    const response = await prompts(threads, promptsCancel)
    if (response.value === 'refresh') continue
    if (isOfType<Record<string, string>>(response, 'value')) config.THREAD_ID = Number(response.value)

    log(
      c`{${cInfo} Message will be sent to} {${cName} ${await getRecipientName(response.value)}}. {${cProperty} ${
        config.THREAD_ID
      }}\n`,
    )
  }

  getAndSetConfig(config)

  api.listener.removeAllListeners('message')
}
