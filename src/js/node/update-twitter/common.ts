import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import utc from "dayjs/plugin/utc.js"

import {
    currentServerStartDateTime,
    findNationById,
    findNationByName,
    NationFullName,
    NationShortName,
    PortBattleNationShortName,
} from "../../common/common"
import { flagValidity, portBattleCooldown, serverMaintenanceHour } from "../../common/common-var"

dayjs.extend(customParseFormat)
dayjs.extend(utc)

const dateTimeFormat = "YYYY-MM-DD HH:mm"
const dateTimeFormatTwitter = "DD-MM-YYYY HH:mm"

export const getActiveTime = (time: dayjs.Dayjs): string => time.add(flagValidity, "days").format(dateTimeFormat)

export const getCaptureTime = (tweetTime: string | undefined): string =>
    getTimeEstimate(tweetTime, dateTimeFormatTwitter).format(dateTimeFormat)

export const getClanName = (clanNameRegexResult: string) => clanNameRegexResult.trim()

export const getCooldownTime = (tweetTime: string | undefined, nation: PortBattleNationShortName): string =>
    nation === "NT"
        ? getNextServerStartDateTime(tweetTime).format(dateTimeFormat)
        : getTimeEstimate(tweetTime, dateTimeFormatTwitter).add(portBattleCooldown, "hour").format(dateTimeFormat)

export const isDateInFuture = (date: string): boolean => dayjs.utc(date, dateTimeFormat).isAfter(dayjs.utc())

export const getNationIdFromFullName = (nationName: NationFullName): number => findNationByName(nationName)?.id ?? 0

export const getNationShortNameFromId = (nationId: number): NationShortName => findNationById(nationId)?.short ?? "n/a"

export const getNationShortNameFromFullName = (nationName: NationFullName): PortBattleNationShortName =>
    findNationByName(nationName)?.short ?? ""

const getNextServerStartDateTime = (time: string | undefined): dayjs.Dayjs => {
    const timeDayjs = dayjs.utc(time, dateTimeFormatTwitter)
    // Next server start after twitter date
    const nextServerStartDateTime = timeDayjs.add(1, "day").utc().hour(serverMaintenanceHour).minute(0).second(0)

    return nextServerStartDateTime
}

export const getPortBattleTime = (date: string): string => dayjs.utc(date, "D MMM YYYY HH:mm").format(dateTimeFormat)

export const getSinceDateTimeLastSevenDays = (): string => dayjs.utc().subtract(7, "day").toISOString()

export const getSinceDateTimeThisMaintenance = (): string => dayjs.utc(currentServerStartDateTime).toISOString()

export const getTimeEstimate = (time: string | undefined, format: string | undefined): dayjs.Dayjs => {
    const timeDayjs = dayjs.utc(time, format)
    // Tweets every 5 minutes, get the estimated time at 2.5 minutes
    const timeEstimated = timeDayjs.subtract((5 * 60) / 2, "second")

    return timeEstimated
}

export const getTweetTimeFormatted = (time: string): string => getTweetTimeDayjs(time).format(dateTimeFormat)

export const getTweetTimeDayjs = (time: string): dayjs.Dayjs => dayjs.utc(time, dateTimeFormatTwitter)

export const isTweetTimeToday = (tweetTime: string): boolean => {
    const tweetTimeDayjs = getTweetTimeDayjs(tweetTime)

    return tweetTimeDayjs.isAfter(dayjs.utc(currentServerStartDateTime))
}

export const isTweetTimeOneDayAgo = (tweetTime: string): boolean => {
    const tweetTimeDayjs = getTweetTimeDayjs(tweetTime)

    return (
        tweetTimeDayjs.isAfter(dayjs.utc(currentServerStartDateTime).subtract(1, "day")) &&
        tweetTimeDayjs.isBefore(dayjs.utc(currentServerStartDateTime))
    )
}

export const isTweetTimeInLastThreeDays = (tweetTime: string): boolean => {
    const tweetTimeDayjs = getTweetTimeDayjs(tweetTime)

    return (
        tweetTimeDayjs.isAfter(dayjs.utc(currentServerStartDateTime).subtract(3, "day")) &&
        tweetTimeDayjs.isBefore(dayjs.utc(currentServerStartDateTime))
    )
}
