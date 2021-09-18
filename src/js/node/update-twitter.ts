/*!
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "path"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(customParseFormat)
dayjs.extend(utc)

import {
    AttackerNationShortName,
    currentServerStartDate as serverDate,
    currentServerStartDateTime,
    findNationById,
    findNationByName,
    sortBy,
} from "../common/common"
import { readJson, saveJsonAsync, xz } from "../common/common-file"
import { getCommonPaths } from "../common/common-dir"
import { flagValidity, portBattleCooldown } from "../common/common-var"
import { serverIds } from "../common/servers"

import { PortBattlePerServer } from "../common/gen-json"
import { FlagEntity, FlagsPerNation } from "../common/types"

import { getTweets, runType } from "./get-tweets"
import { baseAPIFilename, cleanName } from "../common/common-node"
import { APIPort } from "api-port"

const flagsMap = new Map<number, Set<FlagEntity>>()
const commonPaths = getCommonPaths()
const APIPortFilename = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${serverDate}.json`)
const portFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-pb.json`)
const flagsFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-flags.json`)

let ports: PortBattlePerServer[] = []
let flagsPerNations: FlagsPerNation[] = []
let tweets: string[] = []
let isPortDataChanged = false

const dateTimeFormat = "YYYY-MM-DD HH:mm"
const dateTimeFormatTwitter = "DD-MM-YYYY HH:mm"

const getTweetTime = (time: string): string => getTweetTimeDayjs(time).format(dateTimeFormat)
const getTweetTimeDayjs = (time: string): dayjs.Dayjs => dayjs.utc(time, dateTimeFormatTwitter)

/**
 * Find port by name of port owning clan
 * @param clanName - Clan name
 * @returns Port data
 */
const findPortByClanName = (clanName: string): PortBattlePerServer | undefined =>
    ports.find((port) => port.capturer === clanName)

/**
 * Try to find nation for a clan name
 * @param clanName - Clan name
 */
const guessNationFromClanName = (clanName: string): AttackerNationShortName => {
    const port = findPortByClanName(clanName)

    return port ? port.nation : "n/a"
}

const getPortIndex = (portName: string): number => ports.findIndex((port) => port.name === portName)

const getCooldownTime = (tweetTime: string | undefined): string =>
    getTimeEstimate(tweetTime, dateTimeFormatTwitter).add(portBattleCooldown, "hour").format(dateTimeFormat)

const getCaptureTime = (tweetTime: string | undefined): string =>
    getTimeEstimate(tweetTime, dateTimeFormat).format(dateTimeFormat)

const getTimeEstimate = (time: string | undefined, format: string | undefined): dayjs.Dayjs => {
    const timeDayjs = dayjs.utc(time, format)
    // Tweets every 5 minutes, get the estimated time at 2.5 minutes
    const timeEstimated = timeDayjs.subtract((5 * 60) / 2, "second")

    return timeEstimated
}

const getActiveTime = (time: dayjs.Dayjs): dayjs.Dayjs => time.add(flagValidity, "days")

const updatePort = (portName: string, updatedPort: PortBattlePerServer): void => {
    const portIndex = getPortIndex(portName)
    const { captured, capturer } = ports[portIndex]

    // Reset to minimal port data
    ports[portIndex] = {
        id: ports[portIndex].id,
        name: ports[portIndex].name,
        nation: ports[portIndex].nation,
    }

    if (captured) {
        ports[portIndex].captured = captured
        ports[portIndex].capturer = capturer
    }

    // Add port data from tweet
    ports[portIndex] = { ...ports[portIndex], ...updatedPort }
}

const cooldownOn = (result: RegExpExecArray): void => {
    const portName = result[2]
    const cooldownTime = getCooldownTime(result[1])

    console.log("      --- cooldown on", portName)

    const updatedPort = {
        cooldownTime,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Port captured
 * @param result - Result from tweet regex
 * @param nation - Nation
 * @param capturer - Capturing clan
 */
const portCaptured = (result: RegExpExecArray, nation: string, capturer: string): void => {
    const portName = result[2]
    const tweetTime = getTweetTime(result[1])
    const captured = getCaptureTime(tweetTime)

    console.log("      --- captured", portName)

    const updatedPort = {
        nation,
        capturer,
        captured,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
    cooldownOn(result)
}

/**
 * Port captured
 */
const captured = (result: RegExpExecArray): void => {
    const nation = findNationByName(result[4])?.short ?? ""
    const capturer = result[3].trim()

    portCaptured(result, nation, capturer)
}

/**
 * Port captured by NPC raiders
 */
const npcCaptured = (result: RegExpExecArray): void => {
    const nation = "NT"
    const capturer = "RAIDER"

    portCaptured(result, nation, capturer)
}

/**
 * Hostility increased
 * @param result - Result from tweet regex
 */
const hostilityLevelUp = (result: RegExpExecArray): void => {
    const portName = result[4]
    console.log("      --- hostilityLevelUp", portName)

    const updatedPort = {
        attackerNation: findNationByName(result[3])?.short,
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Hostility decreased
 */
const hostilityLevelDown = (result: RegExpExecArray): void => {
    const portName = result[4]
    console.log("      --- hostilityLevelDown", portName)

    const updatedPort = {
        attackerNation: findNationByName(result[3])?.short,
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Port battle scheduled
 */
const portBattleScheduled = (result: RegExpExecArray): void => {
    const portName = result[2]
    const clanName = result[6].trim()
    console.log("      --- portBattleScheduled", portName)

    const updatedPort = {
        attackerNation: result[7] ? findNationByName(result[7])?.short : guessNationFromClanName(clanName),
        attackerClan: clanName,
        attackHostility: 1,
        portBattle: dayjs.utc(result[4], "D MMM YYYY HH:mm").format(dateTimeFormat),
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * NPC port battle scheduled
 */
const npcPortBattleScheduled = (result: RegExpExecArray): void => {
    const portName = result[2]
    console.log("      --- npcPortBattleScheduled", portName)

    const updatedPort = {
        attackerNation: "NT",
        attackerClan: "RAIDER",
        attackHostility: 1,
        portBattle: dayjs.utc(result[3], "D MMM YYYY HH:mm").format(dateTimeFormat),
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Port can be attacked again
 */
const cooledOff = (result: RegExpExecArray): void => {
    const portName = result[2]
    console.log("      --- cooledOff", portName)

    const updatedPort = {} as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * A nation acquired one or more conquest flags
 */
const flagAcquired = (result: RegExpExecArray): void => {
    const nationName = result[2]
    const nationId = findNationByName(nationName)?.id ?? 0
    const numberOfFlags = Number(result[3])
    const tweetTimeDayjs = getTweetTimeDayjs(result[1])
    const active = getActiveTime(tweetTimeDayjs).format(dateTimeFormat)

    console.log("      --- conquest flag", numberOfFlags, nationName, active)

    const flag = { expire: active, number: numberOfFlags }
    const flagsSet = flagsMap.get(nationId) ?? new Set<FlagEntity>()
    flagsSet.add(flag)
    flagsMap.set(nationId, flagsSet)
}

const cleanExpiredAndDoubleEntries = (flagSet: Set<FlagEntity>): Map<string, number> => {
    const now = dayjs.utc()
    const cleanedFlags = new Map<string, number>()

    for (const flag of flagSet) {
        const expire = dayjs.utc(flag.expire, dateTimeFormat)

        if (expire.isAfter(now)) {
            cleanedFlags.set(flag.expire, flag.number)
        }
    }

    return cleanedFlags
}

const cleanFlags = (): FlagsPerNation[] => {
    const cleanedFlagsPerNation = [] as FlagsPerNation[]

    for (const [nation, flagSet] of flagsMap) {
        const cleanedFlags = cleanExpiredAndDoubleEntries(flagSet)

        if (cleanedFlags.size > 0) {
            // Map to FlagEntity[]
            const flags = (
                [...cleanedFlags].map(([expire, number]) => ({
                    expire,
                    number,
                })) as FlagEntity[]
            ).sort(sortBy(["expire"]))

            cleanedFlagsPerNation.push({
                nation,
                flags,
            })
        }
    }

    return cleanedFlagsPerNation.sort(sortBy(["nation"]))
}

const initFlags = (): void => {
    for (const flagsPerNation of flagsPerNations) {
        const flagsSet = new Set<FlagEntity>()
        for (const flag of flagsPerNation.flags) {
            flagsSet.add(flag)
        }

        flagsMap.set(flagsPerNation.nation, flagsSet)
    }
}

const updateFlags = async (): Promise<void> => {
    const cleanedFlagsPerNation = cleanFlags()

    await saveJsonAsync(flagsFilename, cleanedFlagsPerNation)
}

const portR = "[A-zÀ-ÿ’ -]+"
const portHashR = "[A-zÀ-ÿ]+"
const nationR = "[A-zÀ-ÿ -]+"
const clanR = "[\\w ]+"
const defenderR = "[\\w ]+"
const timeR = "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}"
const pbTimeR = "\\d{1,2} \\w{3} \\d{4} \\d{2}:\\d{2}"
const percentageR = "\\d*\\.?\\d"

const capturedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] (${portR}) captured by (${clanR}) ?\\(?(${nationR})?\\)?\\. Previous owner: (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
    "u"
)
const npcCapturedRegex = new RegExp(`\\[(${timeR}) UTC\\] NPC Raiders captured port (${portR}) \\((${nationR})\\)`, "u")
const defendedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR})( \\(${nationR}\\))? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
    "u"
)
const npcDefendedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC Raiders failed to capture port (${portR}) \\((${nationR})\\)`,
    "u"
)
const hostilityLevelUpRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) increased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
    "u"
)
const hostilityLevelDownRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) decreased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
    "u"
)
const portBattleRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The port battle for (${portR}) \\((${nationR})\\) is scheduled for (${pbTimeR}) UTC\\. Defender: (${defenderR})\\. Attacker: (${clanR}) ?\\(?(${nationR})?\\)?\\. BR: \\d+ #PBCaribbean #PBCaribbean${portHashR} #NavalAction`,
    "u"
)
const npcPortBattleRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC port battle for port (${portR})(?: \\(${nationR}\\)) will be started at (${pbTimeR}) UTC`,
    "u"
)
const rumorRegex = new RegExp(
    `\\[(${timeR}) UTC\\] Rumour has it that a great storm has destroyed a large fleet in the West Indies`,
    "u"
)
const gainHostilityRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The port (${portR}) \\((${nationR})\\) can gain hostility`,
    "u"
)
const acquireFlagRegex = new RegExp(`\\[(${timeR}) UTC\\] (${nationR}) got (\\d+) conquest flag\\(s\\)`, "u")
const checkDateRegex = new RegExp(`\\[(${timeR}) UTC\\]`, "u")

const checkFlags = (tweet: string): void => {
    let result: RegExpExecArray | null

    if ((result = acquireFlagRegex.exec(tweet)) !== null) {
        flagAcquired(result)
    }
}

const checkCooldown = (tweet: string): void => {
    let result: RegExpExecArray | null
    isPortDataChanged = true

    if ((result = capturedRegex.exec(tweet)) !== null) {
        cooldownOn(result)
    } else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
        cooldownOn(result)
    } else if ((result = defendedRegex.exec(tweet)) !== null) {
        cooldownOn(result)
        // eslint-disable-next-line no-negated-condition
    } else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
        cooldownOn(result)
    } else {
        isPortDataChanged = false
    }
}

const checkPBAndRaid = (tweet: string): void => {
    let result: RegExpExecArray | null
    isPortDataChanged = true

    if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
        npcPortBattleScheduled(result)
    } else if ((result = portBattleRegex.exec(tweet)) !== null) {
        portBattleScheduled(result)
        // eslint-disable-next-line no-negated-condition
    } else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
        cooledOff(result)
    } else {
        isPortDataChanged = false
    }
}

const checkPort = (tweet: string): boolean => {
    let result: RegExpExecArray | null
    let matched = true
    isPortDataChanged = true

    if ((result = capturedRegex.exec(tweet)) !== null) {
        captured(result)
    } else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
        npcCaptured(result)
    } else if ((result = defendedRegex.exec(tweet)) !== null) {
        cooldownOn(result)
    } else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
        cooldownOn(result)
    } else if ((result = hostilityLevelUpRegex.exec(tweet)) !== null) {
        hostilityLevelUp(result)
    } else if ((result = hostilityLevelDownRegex.exec(tweet)) !== null) {
        hostilityLevelDown(result)
    } else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
        npcPortBattleScheduled(result)
    } else if ((result = portBattleRegex.exec(tweet)) !== null) {
        portBattleScheduled(result)
    } else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
        cooledOff(result)
        // eslint-disable-next-line no-negated-condition
    } else if (rumorRegex.exec(tweet) !== null) {
        // noop
    } else {
        isPortDataChanged = false
        matched = false
    }

    return matched
}

/**
 * Update port data from tweets
 */
const updatePorts = async (): Promise<void> => {
    for (const tweet of tweets) {
        console.log("\ntweet", tweet)
        const result = checkDateRegex.exec(tweet)

        if (!result) {
            return
        }

        const tweetTime = getTweetTimeDayjs(result[1])

        checkFlags(tweet)

        if (
            tweetTime.isAfter(dayjs.utc(currentServerStartDateTime).subtract(3, "day")) &&
            tweetTime.isBefore(dayjs.utc(currentServerStartDateTime))
        ) {
            checkCooldown(tweet)
        }

        if (
            tweetTime.isAfter(dayjs.utc(currentServerStartDateTime).subtract(1, "day")) &&
            tweetTime.isBefore(dayjs.utc(currentServerStartDateTime))
        ) {
            checkPBAndRaid(tweet)
        } else if (tweetTime.isAfter(dayjs.utc(currentServerStartDateTime))) {
            const matched = checkPort(tweet)
            if (!matched && acquireFlagRegex.exec(tweet) === null) {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`)
            }
        }
    }

    if (isPortDataChanged) {
        await saveJsonAsync(portFilename, ports)
    }
}

const getAPIPortData = (): APIPort[] => {
    xz("unxz", `${APIPortFilename}.xz`)
    const apiPorts: APIPort[] = readJson(APIPortFilename)
    xz("xz", APIPortFilename)

    return apiPorts
}

const getPortMaintenanceDefaults = (): void => {
    const apiPorts: APIPort[] = getAPIPortData()
    const currentPorts: PortBattlePerServer[] = readJson(portFilename)

    const getCaptureDate = (portId: number): string | undefined => {
        const index = currentPorts.findIndex((port) => port.id === portId)

        return currentPorts[index].captured
    }

    ports = apiPorts.map(
        (apiPort): PortBattlePerServer => ({
            id: Number(apiPort.Id),
            name: cleanName(apiPort.Name),
            nation: findNationById(apiPort.Nation).short,
            capturer: apiPort.Capturer as string,
            captured: getCaptureDate(Number(apiPort.Id)),
        })
    )
}

const getPortCurrent = (): void => {
    ports = readJson(portFilename)
}

const updateTwitter = async (): Promise<void> => {
    flagsPerNations = readJson(flagsFilename)

    if (runType.startsWith("full")) {
        getPortMaintenanceDefaults()
    } else {
        getPortCurrent()
    }

    initFlags()

    tweets = await getTweets()
    await updatePorts()
    await updateFlags()
}

void updateTwitter()
