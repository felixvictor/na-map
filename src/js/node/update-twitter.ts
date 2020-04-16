/*!
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"
import Twit from "twit"
import xss from "xss"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import utc from "dayjs/plugin/utc.js"

import { findNationByName, findNationByNationShortName, NationShortName } from "../common/common"
import { commonPaths, serverStartDate as serverDate, serverStartDateTime } from "../common/common-dir"
import { fileExists, readJson, readTextFile, saveJsonAsync, saveTextFile } from "../common/common-file"
import { cleanName, simpleStringSort } from "../common/common-node"
import { serverNames } from "../common/common-var"

import { AttackerNationName, PortBattlePerServer } from "../common/gen-json"

dayjs.extend(customParseFormat)
dayjs.extend(utc)

const consumerKey = process.argv[2]
const consumerSecret = process.argv[3]
const accessToken = process.argv[4]
const accessTokenSecret = process.argv[5]
const runType = process.argv[6] ?? "full"

const portFilename = path.resolve(commonPaths.dirGenServer, `${serverNames[0]}-pb.json`)
let ports: PortBattlePerServer[] = []
let Twitter: Twit
let tweets: string[] = []
const refreshDefault = "0"
let refresh = "0"
const queryFrom = "from:zz569k"
let isPortDataChanged = false

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
            .flatMap((status: Twit.Twitter.Status) => cleanName(xss.filterXSS(status.full_text ?? "")))
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
// eslint-disable-next-line @typescript-eslint/camelcase
const getTwitterData = async (query: string, since_id: string = refresh): Promise<void> => {
    // console.log("getTwitterData", "query:", query, "since_id:", since_id, "refresh:", refresh);
    await Twitter.get("search/tweets", {
        count: 100,
        // eslint-disable-next-line @typescript-eslint/camelcase
        include_entities: false,
        q: query,
        // eslint-disable-next-line @typescript-eslint/camelcase
        result_type: "recent",
        // eslint-disable-next-line @typescript-eslint/camelcase
        since_id,
        // eslint-disable-next-line @typescript-eslint/camelcase
        tweet_mode: "extended",
    })
        .catch((error) => {
            throw error.stack
        })
        .then((result) => addTwitterData(result.data as Twit.Twitter.SearchResults))
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
    await getTweetsSince(dayjs.utc(serverStartDateTime).subtract(2, "day"))
}

/**
 * Get tweets since maintenance
 */
const getTweetsSinceMaintenance = async (): Promise<void> => {
    await getTweetsSince(dayjs.utc(serverStartDateTime))
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
        // eslint-disable-next-line @typescript-eslint/camelcase
        consumer_key: consumerKey,
        // eslint-disable-next-line @typescript-eslint/camelcase
        consumer_secret: consumerSecret,
        // eslint-disable-next-line @typescript-eslint/camelcase
        access_token: accessToken,
        // eslint-disable-next-line @typescript-eslint/camelcase
        access_token_secret: accessTokenSecret,
        // eslint-disable-next-line @typescript-eslint/camelcase
        timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
        strictSSL: true, // optional - requires SSL certificates to be valid.
    })

    if (runType.startsWith("full")) {
        await getTweetsFull()
    } else {
        await getTweetsPartial()
    }

    saveRefreshId(refresh)
    // console.log(tweets);
}

/**
 * Find index by port name
 * @param portName - Port name
 * @returns Index
 */
const findPortIndex = (portName: string): number => ports.findIndex((port) => port.name === portName)

/**
 * Port captured
 * @param result - Result from tweet regex
 */
const captured = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[2])

    const port = ports[i]

    console.log("      --- captured", i)
    port.nation = (findNationByName(result[4])?.short as NationShortName) ?? ""
    port.capturer = result[3]
    port.lastPortBattle = dayjs.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm")
    port.attackerNation = ""
    port.attackerClan = ""
    port.attackHostility = 0
    port.portBattle = ""
}

/**
 * Port captured by NPC raiders
 * @param result - Result from tweet regex
 */
const npcCaptured = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[2])
    const port = ports[i]

    console.log("      --- captured by NPC", i)
    port.nation = "NT"
    port.capturer = "RAIDER"
    port.lastPortBattle = dayjs.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm")
    port.attackerNation = ""
    port.attackerClan = ""
    port.attackHostility = 0
    port.portBattle = ""
}

/**
 * Port defended
 * @param result - Result from tweet regex
 */
const defended = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[2])
    const port = ports[i]

    console.log("      --- defended", i)
    port.attackerNation = ""
    port.attackerClan = ""
    port.attackHostility = 0
    port.portBattle = ""
}

/**
 * Hostility increased
 * @param result - Result from tweet regex
 */
const hostilityLevelUp = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[4])
    const port = ports[i]

    console.log("      --- hostilityLevelUp", i)
    port.attackerNation = result[3] as AttackerNationName
    port.attackerClan = result[2].trim()
    port.attackHostility = Number(result[6]) / 100
}

/**
 * Hostility decreased
 * @param result - Result from tweet regex
 */
const hostilityLevelDown = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[4])
    const port = ports[i]

    console.log("      --- hostilityLevelDown", i)
    port.attackerNation = result[3] as AttackerNationName
    port.attackerClan = result[2].trim()
    port.attackHostility = Number(result[6]) / 100
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
    // noinspection UnnecessaryLocalVariableJS
    const nation = port ? findNationByNationShortName(port.nation)?.name ?? "" : "n/a"
    return nation
}

/**
 * Port battle scheduled
 * @param result - Result from tweet regex
 */
const portBattleScheduled = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[2])
    const port = ports[i]
    const clanName = result[6].trim()

    console.log("      --- portBattleScheduled", i)
    if (result[7]) {
        port.attackerNation = result[7] as AttackerNationName
    } else {
        port.attackerNation = guessNationFromClanName(clanName)
    }

    port.attackerClan = clanName
    port.attackHostility = 1
    port.portBattle = dayjs.utc(result[4], "D MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm")
}

/**
 * NPC port battle scheduled
 * @param result - Result from tweet regex
 */
const npcPortBattleScheduled = (result: RegExpExecArray): void => {
    const i = findPortIndex(result[2])
    const port = ports[i]

    console.log("      --- npcPortBattleScheduled", i)
    port.attackerNation = "Neutral"
    port.attackerClan = "NPC"
    port.attackHostility = 1
    port.portBattle = dayjs.utc(result[3], "D MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm")
}

const portR = "[A-zÀ-ÿ’ -]+"
const portHashR = "[A-zÀ-ÿ]+"
const nationR = "[A-zÀ-ÿ -]+"
const clanR = "[\\w ]+"
const defenderR = "[\\w ]+"
const timeR = "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}"
const pbTimeR = "\\d{1,2} \\w{3} \\d{4} \\d{2}:\\d{2}"
const percentageR = "\\d*\\.?\\d"

// noinspection RegExpRedundantEscape
const capturedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] (${portR}) captured by (${clanR}) ?\\(?(${nationR})?\\)?\\. Previous owner: (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
    "u"
)
// noinspection RegExpRedundantEscape
const npcCapturedRegex = new RegExp(`\\[(${timeR}) UTC\\] NPC Raiders captured port (${portR}) \\((${nationR})\\)`, "u")
// noinspection RegExpRedundantEscape
const defendedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR})( \\(${nationR}\\))? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
    "u"
)
// noinspection RegExpRedundantEscape
const npcDefendedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC Raiders failed to capture port (${portR}) \\((${nationR})\\)`,
    "u"
)
// noinspection RegExpRedundantEscape
const hostilityLevelUpRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) increased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
    "u"
)
// noinspection RegExpRedundantEscape
const hostilityLevelDownRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) decreased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
    "u"
)
// noinspection RegExpRedundantEscape
const portBattleRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The port battle for (${portR}) \\((${nationR})\\) is scheduled for (${pbTimeR}) UTC\\. Defender: (${defenderR})\\. Attacker: (${clanR}) ?\\(?(${nationR})?\\)?\\. BR: \\d+ #PBCaribbean #PBCaribbean${portHashR} #NavalAction`,
    "u"
)
// noinspection RegExpRedundantEscape
const npcPortBattleRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC port battle for port (${portR})(?: \\(${nationR}\\)) will be started at (${pbTimeR}) UTC`,
    "u"
)
// noinspection RegExpRedundantEscape
const rumorRegex = new RegExp(
    `\\[(${timeR}) UTC\\] Rumour has it that a great storm has destroyed a large fleet in the West Indies`,
    "u"
)
// noinspection RegExpRedundantEscape
const gainHostilityRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The port (${portR}) \\((${nationR})\\) can gain hostility`,
    "u"
)
// noinspection RegExpRedundantEscape
const checkDateRegex = new RegExp(`\\[(${timeR}) UTC\\]`, "u")

/**
 * Update port data from tweets
 */
const updatePorts = async (): Promise<void> => {
    let result
    let tweetTime

    for (const tweet of tweets) {
        console.log("\ntweet", tweet)
        result = checkDateRegex.exec(tweet)
        if (!result) {
            return
        }

        tweetTime = dayjs.utc(result[1], "DD-MM-YYYY HH:mm")

        if (tweetTime.isAfter(serverDate)) {
            // noinspection AssignmentResultUsedJS,IfStatementWithTooManyBranchesJS
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
                // noop
            } else if ((result = rumorRegex.exec(tweet)) === null) {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`)
            } else {
                // noop
            }
        } else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(1, "day"))) {
            // Add scheduled port battles (only if battle is in the future)
            if ((result = portBattleRegex.exec(tweet)) !== null) {
                if (dayjs.utc().isBefore(dayjs.utc(result[4], "D MMM YYYY HH:mm"))) {
                    isPortDataChanged = true
                    portBattleScheduled(result)
                }
            } else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
                isPortDataChanged = true
                npcPortBattleScheduled(result)
            } else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true
                defended(result)
            }
        } else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(2, "day"))) {
            // Add scheduled NPC raids (only if battle is in the future)
            if (
                (result = npcPortBattleRegex.exec(tweet)) !== null &&
                dayjs.utc().isBefore(dayjs.utc(result[4], "D MMM YYYY HH:mm"))
            ) {
                isPortDataChanged = true
                npcPortBattleScheduled(result)
            }
        }
    }

    if (isPortDataChanged) {
        await saveJsonAsync(portFilename, ports)
    }
}

const updateTwitter = async (): Promise<void> => {
    ports = readJson(portFilename)
    await getTweets()
    await updatePorts()
    if (runType.startsWith("partial")) {
        process.exitCode = Number(!isPortDataChanged)
    }
}

updateTwitter()
