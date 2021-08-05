/*!
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
import { currentServerStartDate as serverDate, currentServerStartDateTime, findNationById, findNationByName, sortBy, } from "../common/common";
import { readJson, saveJsonAsync, xz } from "../common/common-file";
import { getCommonPaths } from "../common/common-dir";
import { flagValidity, portBattleCooldown } from "../common/common-var";
import { serverIds } from "../common/servers";
import { getTweets, runType } from "./get-tweets";
import { baseAPIFilename, cleanName } from "../common/common-node";
const flagsMap = new Map();
const commonPaths = getCommonPaths();
const APIPortFilename = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${serverDate}.json`);
const portFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-pb.json`);
const flagsFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-flags.json`);
let ports = [];
let flagsPerNations = [];
let tweets = [];
let isPortDataChanged = false;
const dateTimeFormat = "YYYY-MM-DD HH:mm";
const dateTimeFormatTwitter = "DD-MM-YYYY HH:mm";
const getTweetTime = (time) => getTweetTimeDayjs(time).format(dateTimeFormat);
const getTweetTimeDayjs = (time) => dayjs.utc(time, dateTimeFormatTwitter);
const findPortByClanName = (clanName) => ports.find((port) => port.capturer === clanName);
const guessNationFromClanName = (clanName) => {
    const port = findPortByClanName(clanName);
    return port ? port.nation : "n/a";
};
const getPortIndex = (portName) => ports.findIndex((port) => port.name === portName);
const getCooldownTime = (tweetTime) => getTimeEstimate(tweetTime, dateTimeFormatTwitter).add(portBattleCooldown, "hour").format(dateTimeFormat);
const getCaptureTime = (tweetTime) => getTimeEstimate(tweetTime, dateTimeFormat).format(dateTimeFormat);
const getTimeEstimate = (time, format) => {
    const timeDayjs = dayjs.utc(time, format);
    const timeEstimated = timeDayjs.subtract((5 * 60) / 2, "second");
    return timeEstimated;
};
const getActiveTime = (time) => time.add(flagValidity, "days");
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
const cooldownOn = (result) => {
    const portName = result[2];
    const cooldownTime = getCooldownTime(result[1]);
    console.log("      --- cooldown on", portName);
    const updatedPort = {
        cooldownTime,
    };
    updatePort(portName, updatedPort);
};
const portCaptured = (result, nation, capturer) => {
    const portName = result[2];
    const tweetTime = getTweetTime(result[1]);
    const captured = getCaptureTime(tweetTime);
    console.log("      --- captured", portName);
    const updatedPort = {
        nation,
        capturer,
        captured,
    };
    updatePort(portName, updatedPort);
    cooldownOn(result);
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
const hostilityLevelUp = (result) => {
    const portName = result[4];
    console.log("      --- hostilityLevelUp", portName);
    const updatedPort = {
        attackerNation: findNationByName(result[3])?.short,
        attackerClan: result[2].trim(),
        attackHostility: Number(result[6]) / 100,
    };
    updatePort(portName, updatedPort);
};
const hostilityLevelDown = (result) => {
    const portName = result[4];
    console.log("      --- hostilityLevelDown", portName);
    const updatedPort = {
        attackerNation: findNationByName(result[3])?.short,
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
        attackerNation: result[7] ? findNationByName(result[7])?.short : guessNationFromClanName(clanName),
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
        attackerNation: "NT",
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
    const nationName = result[2];
    const nationId = findNationByName(nationName)?.id ?? 0;
    const numberOfFlags = Number(result[3]);
    const tweetTimeDayjs = getTweetTimeDayjs(result[1]);
    const active = getActiveTime(tweetTimeDayjs).format(dateTimeFormat);
    console.log("      --- conquest flag", numberOfFlags, nationName, active);
    const flag = { expire: active, number: numberOfFlags };
    const flagsSet = flagsMap.get(nationId) ?? new Set();
    flagsSet.add(flag);
    flagsMap.set(nationId, flagsSet);
};
const cleanExpiredAndDoubleEntries = (flagSet) => {
    const now = dayjs.utc();
    const cleanedFlags = new Map();
    for (const flag of flagSet) {
        const expire = dayjs.utc(flag.expire, dateTimeFormat);
        if (expire.isAfter(now)) {
            cleanedFlags.set(flag.expire, flag.number);
        }
    }
    return cleanedFlags;
};
const cleanFlags = () => {
    const cleanedFlagsPerNation = [];
    for (const [nation, flagSet] of flagsMap) {
        const cleanedFlags = cleanExpiredAndDoubleEntries(flagSet);
        if (cleanedFlags.size > 0) {
            const flags = [...cleanedFlags].map(([expire, number]) => ({
                expire,
                number,
            })).sort(sortBy(["expire"]));
            cleanedFlagsPerNation.push({
                nation,
                flags,
            });
        }
    }
    return cleanedFlagsPerNation;
};
const initFlags = () => {
    for (const flagsPerNation of flagsPerNations) {
        const flagsSet = new Set();
        for (const flag of flagsPerNation.flags) {
            flagsSet.add(flag);
        }
        flagsMap.set(flagsPerNation.nation, flagsSet);
    }
};
const updateFlags = async () => {
    const cleanedFlagsPerNation = cleanFlags();
    await saveJsonAsync(flagsFilename, cleanedFlagsPerNation);
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
const checkFlags = (tweet) => {
    let result;
    if ((result = acquireFlagRegex.exec(tweet)) !== null) {
        flagAcquired(result);
    }
};
const checkCooldown = (tweet) => {
    let result;
    isPortDataChanged = true;
    if ((result = capturedRegex.exec(tweet)) !== null) {
        cooldownOn(result);
    }
    else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
        cooldownOn(result);
    }
    else if ((result = defendedRegex.exec(tweet)) !== null) {
        cooldownOn(result);
    }
    else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
        cooldownOn(result);
    }
    else {
        isPortDataChanged = false;
    }
};
const checkPBAndRaid = (tweet) => {
    let result;
    isPortDataChanged = true;
    if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
        npcPortBattleScheduled(result);
    }
    else if ((result = portBattleRegex.exec(tweet)) !== null) {
        portBattleScheduled(result);
    }
    else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
        cooledOff(result);
    }
    else {
        isPortDataChanged = false;
    }
};
const checkPort = (tweet) => {
    let result;
    let matched = true;
    isPortDataChanged = true;
    if ((result = capturedRegex.exec(tweet)) !== null) {
        captured(result);
    }
    else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
        npcCaptured(result);
    }
    else if ((result = defendedRegex.exec(tweet)) !== null) {
        cooldownOn(result);
    }
    else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
        cooldownOn(result);
    }
    else if ((result = hostilityLevelUpRegex.exec(tweet)) !== null) {
        hostilityLevelUp(result);
    }
    else if ((result = hostilityLevelDownRegex.exec(tweet)) !== null) {
        hostilityLevelDown(result);
    }
    else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
        npcPortBattleScheduled(result);
    }
    else if ((result = portBattleRegex.exec(tweet)) !== null) {
        portBattleScheduled(result);
    }
    else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
        cooledOff(result);
    }
    else if (rumorRegex.exec(tweet) !== null) {
    }
    else {
        isPortDataChanged = false;
        matched = false;
    }
    return matched;
};
const updatePorts = async () => {
    for (const tweet of tweets) {
        console.log("\ntweet", tweet);
        const result = checkDateRegex.exec(tweet);
        if (!result) {
            return;
        }
        const tweetTime = getTweetTimeDayjs(result[1]);
        checkFlags(tweet);
        if (tweetTime.isAfter(dayjs.utc(currentServerStartDateTime).subtract(3, "day")) &&
            tweetTime.isBefore(dayjs.utc(currentServerStartDateTime))) {
            checkCooldown(tweet);
        }
        if (tweetTime.isAfter(dayjs.utc(currentServerStartDateTime).subtract(1, "day")) &&
            tweetTime.isBefore(dayjs.utc(currentServerStartDateTime))) {
            checkPBAndRaid(tweet);
        }
        else if (tweetTime.isAfter(dayjs.utc(currentServerStartDateTime))) {
            const matched = checkPort(tweet);
            if (!matched && acquireFlagRegex.exec(tweet) === null) {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`);
            }
        }
    }
    if (isPortDataChanged) {
        await saveJsonAsync(portFilename, ports);
    }
};
const getAPIPortData = () => {
    xz("unxz", `${APIPortFilename}.xz`);
    const apiPorts = readJson(APIPortFilename);
    xz("xz", APIPortFilename);
    return apiPorts;
};
const getPortMaintenanceDefaults = () => {
    const apiPorts = getAPIPortData();
    const currentPorts = readJson(portFilename);
    const getCaptureDate = (portId) => {
        const index = currentPorts.findIndex((port) => port.id === portId);
        return currentPorts[index].captured;
    };
    ports = apiPorts.map((apiPort) => ({
        id: Number(apiPort.Id),
        name: cleanName(apiPort.Name),
        nation: findNationById(apiPort.Nation).short,
        capturer: apiPort.Capturer,
        captured: getCaptureDate(Number(apiPort.Id)),
    }));
};
const getPortCurrent = () => {
    ports = readJson(portFilename);
};
const updateTwitter = async () => {
    flagsPerNations = readJson(flagsFilename);
    if (runType.startsWith("full")) {
        getPortMaintenanceDefaults();
    }
    else {
        getPortCurrent();
    }
    initFlags();
    tweets = await getTweets();
    await updatePorts();
    await updateFlags();
    if (runType.startsWith("partial")) {
        process.exitCode = Number(!isPortDataChanged);
    }
};
void updateTwitter();
//# sourceMappingURL=update-twitter.js.map