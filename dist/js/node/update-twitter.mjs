/*!
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import Twit from "twit";
import filterXSS from "xss";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import { findNationByName, findNationByNationShortName } from "../common/common";
import { commonPaths, serverStartDateTime } from "../common/common-dir";
import { fileExists, readJson, readTextFile, saveJsonAsync, saveTextFile } from "../common/common-file";
import { cleanName, simpleStringSort } from "../common/common-node";
import { flagValidity, portBattleCooldown } from "../common/common-var";
import { serverIds } from "../common/servers";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
const consumerKey = process.argv[2];
const consumerSecret = process.argv[3];
const accessToken = process.argv[4];
const accessTokenSecret = process.argv[5];
const runType = process.argv[6] ?? "full";
const portFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-pb.json`);
let ports = [];
let Twitter;
let tweets = [];
const refreshDefault = "0";
let refresh = "0";
const queryFrom = "from:zz569k";
let isPortDataChanged = false;
const dateTimeFormat = "YYYY-MM-DD HH:mm";
const dateTimeFormatTwitter = "DD-MM-YYYY HH:mm";
const getRefreshId = () => fileExists(commonPaths.fileTwitterRefreshId)
    ? String(readTextFile(commonPaths.fileTwitterRefreshId))
    : refreshDefault;
const saveRefreshId = (refresh) => {
    saveTextFile(commonPaths.fileTwitterRefreshId, refresh);
};
const addTwitterData = (data) => {
    tweets.push(...data.statuses
        .flatMap((status) => cleanName(filterXSS(status.full_text ?? "")))
        .sort(simpleStringSort));
    refresh = data.search_metadata.max_id_str ?? "";
};
const getTwitterData = async (query, since_id = refresh) => {
    await Twitter.get("search/tweets", {
        count: 100,
        include_entities: false,
        q: query,
        result_type: "recent",
        since_id,
        tweet_mode: "extended",
    })
        .catch((error) => {
        throw error.stack;
    })
        .then((result) => addTwitterData(result.data));
};
const getTweetsSince = async (sinceDateTime) => {
    const now = dayjs.utc();
    for (let queryTime = sinceDateTime; queryTime.isBefore(now); queryTime = queryTime.add(1, "hour")) {
        const query = `"[${queryTime.format("DD-MM-YYYY")}+${String(queryTime.hour()).padStart(2, "0")}:"+${queryFrom}`;
        await getTwitterData(query, refreshDefault);
    }
};
const getTweetsFull = async () => {
    await getTweetsSince(dayjs.utc(serverStartDateTime).subtract(2, "day"));
};
const getTweetsSinceMaintenance = async () => {
    await getTweetsSince(dayjs.utc(serverStartDateTime));
};
const getTweetsSinceRefresh = async () => {
    await getTwitterData(queryFrom);
};
const getTweetsPartial = async () => {
    if (refresh === refreshDefault) {
        await getTweetsSinceMaintenance();
    }
    else {
        await getTweetsSinceRefresh();
    }
};
const getTweets = async () => {
    tweets = [];
    refresh = getRefreshId();
    Twitter = new Twit({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token: accessToken,
        access_token_secret: accessTokenSecret,
        timeout_ms: 60 * 1000,
        strictSSL: true,
    });
    if (runType.startsWith("full")) {
        await getTweetsFull();
    }
    else {
        await getTweetsPartial();
    }
    saveRefreshId(refresh);
};
const findPortByClanName = (clanName) => ports.find((port) => port.capturer === clanName);
const guessNationFromClanName = (clanName) => {
    const port = findPortByClanName(clanName);
    return port ? findNationByNationShortName(port.nation)?.name ?? "" : "n/a";
};
const getPortIndex = (portName) => ports.findIndex((port) => port.name === portName);
const getPortBattleTime = (portName) => {
    const portIndex = getPortIndex(portName);
    const portBattleTime = ports[portIndex].portBattle;
    return portBattleTime;
};
const getCooldownTime = (tweetTime) => {
    const tweetTimeDayjs = dayjs.utc(tweetTime, dateTimeFormatTwitter);
    const portBattleEndTimeEstimated = tweetTimeDayjs.subtract((5 * 60) / 2, "second");
    return portBattleEndTimeEstimated.add(portBattleCooldown, "hour").format(dateTimeFormat);
};
const getActiveTime = (time) => dayjs.utc(time, dateTimeFormat).add(flagValidity, "hour").format(dateTimeFormat);
const updatePort = (portName, updatedPort) => {
    const portIndex = getPortIndex(portName);
    const { captured, capturer } = ports[portIndex];
    ports[portIndex] = {
        id: ports[portIndex].id,
        name: ports[portIndex].name,
        nation: ports[portIndex].nation,
    };
    if (captured) {
        ports[portIndex].captured = captured;
        ports[portIndex].capturer = capturer;
    }
    ports[portIndex] = { ...ports[portIndex], ...updatedPort };
};
const portCaptured = (result, nation, capturer) => {
    const portName = result[2];
    const portBattleTime = getPortBattleTime(portName);
    const cooldownTime = getCooldownTime(result[1]);
    console.log("      --- captured", portName);
    const updatedPort = {
        nation,
        capturer,
        captured: portBattleTime,
        cooldownTime,
    };
    updatePort(portName, updatedPort);
};
const captured = (result) => {
    const nation = findNationByName(result[4])?.short ?? "";
    const capturer = result[3].trim();
    portCaptured(result, nation, capturer);
};
const npcCaptured = (result) => {
    const nation = "NT";
    const capturer = "RAIDER";
    portCaptured(result, nation, capturer);
};
const defended = (result) => {
    const portName = result[2];
    const cooldownTime = getCooldownTime(result[1]);
    console.log("      --- defended", portName);
    const updatedPort = {
        cooldownTime,
    };
    updatePort(portName, updatedPort);
};
const hostilityLevelUp = (result) => {
    const portName = result[4];
    console.log("      --- hostilityLevelUp", portName);
    const updatedPort = {
        attackerNation: result[3],
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    };
    updatePort(portName, updatedPort);
};
const hostilityLevelDown = (result) => {
    const portName = result[4];
    console.log("      --- hostilityLevelDown", portName);
    const updatedPort = {
        attackerNation: result[3],
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    };
    updatePort(portName, updatedPort);
};
const portBattleScheduled = (result) => {
    const portName = result[2];
    const clanName = result[6].trim();
    console.log("      --- portBattleScheduled", portName);
    const updatedPort = {
        attackerNation: result[7] ? result[7] : guessNationFromClanName(clanName),
        attackerClan: clanName,
        attackHostility: 1,
        portBattle: dayjs.utc(result[4], "D MMM YYYY HH:mm").format(dateTimeFormat),
    };
    updatePort(portName, updatedPort);
};
const npcPortBattleScheduled = (result) => {
    const portName = result[2];
    console.log("      --- npcPortBattleScheduled", portName);
    const updatedPort = {
        attackerNation: "Neutral",
        attackerClan: "RAIDER",
        attackHostility: 1,
        portBattle: dayjs.utc(result[3], "D MMM YYYY HH:mm").format(dateTimeFormat),
    };
    updatePort(portName, updatedPort);
};
const cooledOff = (result) => {
    const portName = result[2];
    console.log("      --- cooledOff", portName);
    const updatedPort = {};
    updatePort(portName, updatedPort);
};
const flagAcquired = (result) => {
    const nation = result[2];
    const numberOfFlags = Number(result[3]);
    const tweetTime = dayjs.utc(result[1], dateTimeFormatTwitter).format(dateTimeFormat);
    const active = getActiveTime(tweetTime);
    console.log("      --- conquest flag", numberOfFlags, nation, active);
};
const portR = "[A-zÀ-ÿ’ -]+";
const portHashR = "[A-zÀ-ÿ]+";
const nationR = "[A-zÀ-ÿ -]+";
const clanR = "[\\w ]+";
const defenderR = "[\\w ]+";
const timeR = "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}";
const pbTimeR = "\\d{1,2} \\w{3} \\d{4} \\d{2}:\\d{2}";
const percentageR = "\\d*\\.?\\d";
const capturedRegex = new RegExp(`\\[(${timeR}) UTC\\] (${portR}) captured by (${clanR}) ?\\(?(${nationR})?\\)?\\. Previous owner: (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`, "u");
const npcCapturedRegex = new RegExp(`\\[(${timeR}) UTC\\] NPC Raiders captured port (${portR}) \\((${nationR})\\)`, "u");
const defendedRegex = new RegExp(`\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR})( \\(${nationR}\\))? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`, "u");
const npcDefendedRegex = new RegExp(`\\[(${timeR}) UTC\\] NPC Raiders failed to capture port (${portR}) \\((${nationR})\\)`, "u");
const hostilityLevelUpRegex = new RegExp(`\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) increased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`, "u");
const hostilityLevelDownRegex = new RegExp(`\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) decreased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`, "u");
const portBattleRegex = new RegExp(`\\[(${timeR}) UTC\\] The port battle for (${portR}) \\((${nationR})\\) is scheduled for (${pbTimeR}) UTC\\. Defender: (${defenderR})\\. Attacker: (${clanR}) ?\\(?(${nationR})?\\)?\\. BR: \\d+ #PBCaribbean #PBCaribbean${portHashR} #NavalAction`, "u");
const npcPortBattleRegex = new RegExp(`\\[(${timeR}) UTC\\] NPC port battle for port (${portR})(?: \\(${nationR}\\)) will be started at (${pbTimeR}) UTC`, "u");
const rumorRegex = new RegExp(`\\[(${timeR}) UTC\\] Rumour has it that a great storm has destroyed a large fleet in the West Indies`, "u");
const gainHostilityRegex = new RegExp(`\\[(${timeR}) UTC\\] The port (${portR}) \\((${nationR})\\) can gain hostility`, "u");
const acquireFlagRegex = new RegExp(`\\[(${timeR}) UTC\\] (${nationR}) got (\\d+) conquest flag\\(s\\)`, "u");
const checkDateRegex = new RegExp(`\\[(${timeR}) UTC\\]`, "u");
const updatePorts = async () => {
    let result;
    for (const tweet of tweets) {
        console.log("\ntweet", tweet);
        result = checkDateRegex.exec(tweet);
        if (!result) {
            return;
        }
        if ((result = capturedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            captured(result);
        }
        else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            npcCaptured(result);
        }
        else if ((result = defendedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            defended(result);
        }
        else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            defended(result);
        }
        else if ((result = hostilityLevelUpRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            hostilityLevelUp(result);
        }
        else if ((result = hostilityLevelDownRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            hostilityLevelDown(result);
        }
        else if ((result = portBattleRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            portBattleScheduled(result);
        }
        else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            npcPortBattleScheduled(result);
        }
        else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
            isPortDataChanged = true;
            cooledOff(result);
        }
        else if ((result = acquireFlagRegex.exec(tweet)) !== null) {
            flagAcquired(result);
        }
        else if ((result = rumorRegex.exec(tweet)) === null) {
            console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`);
        }
        else {
        }
    }
    if (isPortDataChanged) {
        await saveJsonAsync(portFilename, ports);
    }
};
const updateTwitter = async () => {
    ports = readJson(portFilename);
    await getTweets();
    await updatePorts();
    if (runType.startsWith("partial")) {
        process.exitCode = Number(!isPortDataChanged);
    }
};
void updateTwitter();
//# sourceMappingURL=update-twitter.js.map