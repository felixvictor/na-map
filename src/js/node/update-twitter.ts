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
import Twit from "twit"
import filterXSS from "xss"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(customParseFormat)
dayjs.extend(utc)

import {
    currentServerStartDateTime,
    findNationByName,
    findNationByNationShortName,
    simpleStringSort,
    sortBy,
} from "../common/common"
import { getCommonPaths } from "../common/common-dir"
import { fileExists, readJson, readTextFile, saveJsonAsync, saveTextFile } from "../common/common-file"
import { cleanName } from "../common/common-node"
import { flagValidity, portBattleCooldown } from "../common/common-var"
import { serverIds } from "../common/servers"

import { AttackerNationName, PortBattlePerServer } from "../common/gen-json"
import { FlagEntity, FlagsPerNation } from "../common/types"
const flagsMap = new Map<string, Set<FlagEntity>>()

const commonPaths = getCommonPaths()

const consumerKey = process.argv[2]
const consumerSecret = process.argv[3]
const accessToken = process.argv[4]
const accessTokenSecret = process.argv[5]
const runType = process.argv[6] ?? "full"

const portFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-pb.json`)
let ports: PortBattlePerServer[] = []

const flagsFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-flags.json`)
let flagsPerNations: FlagsPerNation[] = []

let Twitter: Twit
let tweets: string[] = []
const refreshDefault = "0"
let refresh = "0"
const queryFrom = "from:zz569k"
let isPortDataChanged = false

const dateTimeFormat = "YYYY-MM-DD HH:mm"
const dateTimeFormatTwitter = "DD-MM-YYYY HH:mm"

/**
 * Get refresh id, either from file or set default value (0)
 * @returns Refresh id
 */
const getRefreshId = (): string =>
    fileExists(commonPaths.fileTwitterRefreshId)
        ? String(readTextFile(commonPaths.fileTwitterRefreshId))
        : refreshDefault

/**
 * Save refresh id to file
 */
const saveRefreshId = (refresh: string): void => {
    saveTextFile(commonPaths.fileTwitterRefreshId, refresh)
}

/**
 * Add new data to tweets and update refresh id
 */
const addTwitterData = (data: Twit.Twitter.SearchResults): void => {
    tweets.push(
        ...data.statuses
            .flatMap((status: Twit.Twitter.Status) => cleanName(filterXSS(status.full_text ?? "")))
            .sort(simpleStringSort)
    )
    refresh = data.search_metadata.max_id_str ?? ""
    /*
    console.log(
        data.statuses.length,
        tweets.length,
        refresh,
        data.statuses.flatMap(status => cleanName(xss(status.full_text))).sort()
    );
     */
}

/**
 * Load data from twitter
 * @param query - Twitter query
 * @param since_id - Last tweet id
 */
const getTwitterData = async (query: string, since_id: string = refresh): Promise<void> => {
    // console.log("getTwitterData", "query:", query, "since_id:", since_id, "refresh:", refresh);
    await Twitter.get("search/tweets", {
        count: 100,
        include_entities: false,
        q: query,
        result_type: "recent",
        since_id,
        tweet_mode: "extended",
    })
        .catch((error) => {
            throw error.stack
        })
        .then((result) => {
            addTwitterData(result.data as Twit.Twitter.SearchResults)
        })
}

/**
 * Get tweets since sinceDateTime
 * @param sinceDateTime - Start dateTime
 */
const getTweetsSince = async (sinceDateTime: dayjs.Dayjs): Promise<void> => {
    const now = dayjs.utc()

    for (let queryTime = sinceDateTime; queryTime.isBefore(now); queryTime = queryTime.add(1, "hour")) {
        const query = `"[${queryTime.format("DD-MM-YYYY")}+${String(queryTime.hour()).padStart(2, "0")}:"+${queryFrom}`
        // eslint-disable-next-line no-await-in-loop
        await getTwitterData(query, refreshDefault)
    }
}

/**
 * Get all available tweets from the 2 last days
 */
const getTweetsFull = async (): Promise<void> => {
    await getTweetsSince(dayjs.utc(currentServerStartDateTime).subtract(2, "day"))
}

/**
 * Get tweets since maintenance
 */
const getTweetsSinceMaintenance = async (): Promise<void> => {
    await getTweetsSince(dayjs.utc(currentServerStartDateTime))
}

/**
 * Get tweets since last refresh id
 */
const getTweetsSinceRefresh = async (): Promise<void> => {
    await getTwitterData(queryFrom)
}

/**
 * Get partial data since maintenance or later based on refresh id
 */
const getTweetsPartial = async (): Promise<void> => {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (refresh === refreshDefault) {
        await getTweetsSinceMaintenance()
    } else {
        await getTweetsSinceRefresh()
    }
}

/**
 * Get tweets
 */
const getTweets = async (): Promise<void> => {
    tweets = []
    refresh = getRefreshId()
    Twitter = new Twit({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token: accessToken,
        access_token_secret: accessTokenSecret,
        timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
        strictSSL: true, // optional - requires SSL certificates to be valid.
    })

    // eslint-disable-next-line unicorn/prefer-ternary
    if (runType.startsWith("full")) {
        await getTweetsFull()
    } else {
        await getTweetsPartial()
    }

    saveRefreshId(refresh)
    // console.log(tweets);
}

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
const guessNationFromClanName = (clanName: string): AttackerNationName => {
    const port = findPortByClanName(clanName)

    return port ? findNationByNationShortName(port.nation)?.name ?? "" : "n/a"
}

const getPortIndex = (portName: string): number => ports.findIndex((port) => port.name === portName)

const getPortBattleTime = (portName: string): string | undefined => {
    const portIndex = getPortIndex(portName)
    const portBattleTime = ports[portIndex].portBattle

    return portBattleTime
}

const getCooldownTime = (tweetTime: string | undefined): string => {
    const tweetTimeDayjs = dayjs.utc(tweetTime, dateTimeFormatTwitter)
    // Tweets every 5 minutes, get the estimated time at 2.5 minutes
    const portBattleEndTimeEstimated = tweetTimeDayjs.subtract((5 * 60) / 2, "second")

    return portBattleEndTimeEstimated.add(portBattleCooldown, "hour").format(dateTimeFormat)
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

/**
 * Port captured
 * @param result - Result from tweet regex
 * @param nation - Nation
 * @param capturer - Capturing clan
 */
const portCaptured = (result: RegExpExecArray, nation: string, capturer: string): void => {
    const portName = result[2]
    const portBattleTime = getPortBattleTime(portName)
    const cooldownTime = getCooldownTime(result[1])

    console.log("      --- captured", portName)

    const updatedPort = {
        nation,
        capturer,
        captured: portBattleTime,
        cooldownTime,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Port captured
 * @param result - Result from tweet regex
 */
const captured = (result: RegExpExecArray): void => {
    const nation = findNationByName(result[4])?.short ?? ""
    const capturer = result[3].trim()

    portCaptured(result, nation, capturer)
}

/**
 * Port captured by NPC raiders
 * @param result - Result from tweet regex
 */
const npcCaptured = (result: RegExpExecArray): void => {
    const nation = "NT"
    const capturer = "RAIDER"

    portCaptured(result, nation, capturer)
}

/**
 * Port defended
 * @param result - Result from tweet regex
 */
const defended = (result: RegExpExecArray): void => {
    const portName = result[2]
    const cooldownTime = getCooldownTime(result[1])

    console.log("      --- defended", portName)

    const updatedPort = {
        cooldownTime,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Hostility increased
 * @param result - Result from tweet regex
 */
const hostilityLevelUp = (result: RegExpExecArray): void => {
    const portName = result[4]
    console.log("      --- hostilityLevelUp", portName)

    const updatedPort = {
        attackerNation: result[3]!,
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Hostility decreased
 * @param result - Result from tweet regex
 */
const hostilityLevelDown = (result: RegExpExecArray): void => {
    const portName = result[4]
    console.log("      --- hostilityLevelDown", portName)

    const updatedPort = {
        attackerNation: result[3]!,
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Port battle scheduled
 * @param result - Result from tweet regex
 */
const portBattleScheduled = (result: RegExpExecArray): void => {
    const portName = result[2]
    const clanName = result[6].trim()
    console.log("      --- portBattleScheduled", portName)

    const updatedPort = {
        attackerNation: result[7] ? result[7]! : guessNationFromClanName(clanName),
        attackerClan: clanName,
        attackHostility: 1,
        portBattle: dayjs.utc(result[4], "D MMM YYYY HH:mm").format(dateTimeFormat),
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * NPC port battle scheduled
 * @param result - Result from tweet regex
 */
const npcPortBattleScheduled = (result: RegExpExecArray): void => {
    const portName = result[2]
    console.log("      --- npcPortBattleScheduled", portName)

    const updatedPort = {
        attackerNation: "Neutral",
        attackerClan: "RAIDER",
        attackHostility: 1,
        portBattle: dayjs.utc(result[3], "D MMM YYYY HH:mm").format(dateTimeFormat),
    } as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * Port can be attacked again
 * @param result - Result from tweet regex
 */
const cooledOff = (result: RegExpExecArray): void => {
    const portName = result[2]
    console.log("      --- cooledOff", portName)

    const updatedPort = {} as PortBattlePerServer

    updatePort(portName, updatedPort)
}

/**
 * A nation acquired one or more conquest flags
 * @param result - Result from tweet regex
 */
const flagAcquired = (result: RegExpExecArray): void => {
    const nation = result[2]
    const numberOfFlags = Number(result[3])
    const tweetTime = dayjs.utc(result[1], dateTimeFormatTwitter)
    const active = getActiveTime(tweetTime).format(dateTimeFormat)

    console.log("      --- conquest flag", numberOfFlags, nation, active)

    const flag = { expire: active, number: numberOfFlags }
    const flagsSet = flagsMap.get(nation) ?? new Set<FlagEntity>()
    flagsSet.add(flag)
    flagsMap.set(nation, flagsSet)
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

        if (cleanedFlags.size) {
            // Map to FlagEntity[]
            const flags = ([...cleanedFlags].map(([expire, number]) => ({
                expire,
                number,
            })) as FlagEntity[]).sort(sortBy(["expire"]))

            cleanedFlagsPerNation.push({
                nation,
                flags,
            })
        }
    }

    return cleanedFlagsPerNation
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

/**
 * Update port data from tweets
 */
const updatePorts = async (): Promise<void> => {
    let result

    for (const tweet of tweets) {
        console.log("\ntweet", tweet)
        result = checkDateRegex.exec(tweet)
        if (!result) {
            return
        }

        if ((result = capturedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            captured(result)
        } else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            npcCaptured(result)
        } else if ((result = defendedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            defended(result)
        } else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            defended(result)
        } else if ((result = hostilityLevelUpRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            hostilityLevelUp(result)
        } else if ((result = hostilityLevelDownRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            hostilityLevelDown(result)
        } else if ((result = portBattleRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            portBattleScheduled(result)
        } else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            npcPortBattleScheduled(result)
        } else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
            isPortDataChanged = true
            cooledOff(result)
        } else if ((result = acquireFlagRegex.exec(tweet)) !== null) {
            flagAcquired(result)
        } else if ((result = rumorRegex.exec(tweet)) === null) {
            console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`)
        } else {
            // noop
        }
    }

    if (isPortDataChanged) {
        await saveJsonAsync(portFilename, ports)
    }
}

const updateTwitter = async (): Promise<void> => {
    ports = readJson(portFilename)
    flagsPerNations = readJson(flagsFilename)

    initFlags()
    await getTweets()
    await updatePorts()
    await updateFlags()
    if (runType.startsWith("partial")) {
        process.exitCode = Number(!isPortDataChanged)
    }
}

void updateTwitter()
