import c from 'chalk'
import dayjs from 'dayjs'
import { getConfig } from './config'
import { cTime } from './util/chalk-names'
import { formattedError, log } from './util/util'

interface SendTimes {
  sendTime: dayjs.Dayjs
  sendTimeFormatted: string
}

export const timeRegex = /^((([01]\d)|(2[0-3])):?([0-5]\d))/
const dateFormatString = 'h:mm:ss A [on] ddd[,] MMM D'

export default function getSendTime(): SendTimes {
  const timeMatch = timeRegex.exec(getConfig('time'))
  if (!timeMatch) throw formattedError('Time is not valid.')
  const { delayMinutes, second } = randomDelayMinutes(0, getConfig('maxDelayMinutes'))
  const hour = Number(timeMatch[2])
  const minute = Number(timeMatch[5]) + delayMinutes

  log(c`The random delay is {${cTime} ${delayMinutes}m${second}s}.`)

  const currentTime = dayjs()
  let sendTime = currentTime.hour(hour).minute(minute).second(second)
  if (sendTime.isBefore(currentTime)) sendTime = sendTime.add(1, 'd')
  const sendTimeFormatted = sendTime.format(dateFormatString)

  return { sendTime, sendTimeFormatted }
}

export function getFormattedTime(): string {
  return dayjs().format(dateFormatString)
}

// Min and Max included
function randomDelayMinutes(min: number, max: number) {
  const random = Math.random() < 0.5 ? (1 - Math.random()) * (max - min) + min : Math.random() * (max - min) + min

  const minutes = Math.floor(random * 10) / 10
  const totalSeconds = Math.round(minutes * 60)

  const delayMinutes = Math.floor(minutes)
  const second = totalSeconds - delayMinutes * 60

  return { delayMinutes, second }
}
