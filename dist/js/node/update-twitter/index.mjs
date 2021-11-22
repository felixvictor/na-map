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
import { getTweets, runType } from "./get-tweets";
import { flagAcquired, initFlags, updateFlags } from "./get-flag-data";
import { getCaptureTime, getClanName, getCooldownTime, getNationShortNameFromFullName, getNationShortNameFromId, getPortBattleTime, isDateInFuture, isTweetTimeOneDayAgo, isTweetTimeInLastThreeDays, isTweetTimeToday, } from "./common";
import { currentServerStartDate as serverDate, } from "../../common/common";
import { getCommonPaths } from "../../common/common-dir";
import { readJson, saveJsonAsync, xz } from "../../common/common-file";
import { serverIds } from "../../common/servers";
import { baseAPIFilename, cleanName } from "../../common/common-node";
const commonPaths = getCommonPaths();
const APIPortFilename = path.resolve(baseAPIFilename, `${serverIds[0]}-Ports-${serverDate}.json`);
const portFilename = path.resolve(commonPaths.dirGenServer, `${serverIds[0]}-pb.json`);
let ports = [];
let tweets = [];
let isPortDataChanged = false;
const findPortByClanName = (clanName) => ports.find((port) => port.capturer === clanName);
const guessNationFromClanName = (clanName) => {
    const port = findPortByClanName(clanName);
    return port ? port.nation : "n/a";
};
const getPortIndex = (portName) => ports.findIndex((port) => port.name === portName);
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
const cooldownOn = (portName, nation, tweetTime) => {
    const cooldownTime = getCooldownTime(tweetTime, nation);
    if (isDateInFuture(cooldownTime)) {
        const updatedPort = {
            cooldownTime,
        };
        updatePort(portName, updatedPort);
    }
};
const portCaptured = (result, nation, capturer) => {
    const tweetTimeRegexResult = result[1];
    const portNameRegexResult = result[2];
    const captured = getCaptureTime(tweetTimeRegexResult);
    console.log("      --- captured", portNameRegexResult);
    const updatedPort = {
        nation,
        capturer,
        captured,
    };
    updatePort(portNameRegexResult, updatedPort);
};
const captured = (result) => {
    const clanNameRegexResult = result[3];
    const nationFullNameRegexResult = result[4];
    const capturer = getClanName(clanNameRegexResult);
    const nation = getNationShortNameFromFullName(nationFullNameRegexResult);
    portCaptured(result, nation, capturer);
};
const npcCaptured = (result) => {
    const nation = "NT";
    const capturer = "RAIDER";
    portCaptured(result, nation, capturer);
};
const hostilityLevelUp = (result) => {
    const clanNameRegexResult = result[2];
    const nationFullNameRegexResult = result[3];
    const portNameRegexResult = result[4];
    console.log("      --- hostilityLevelUp", portNameRegexResult);
    const updatedPort = {
        attackerNation: getNationShortNameFromFullName(nationFullNameRegexResult),
        attackerClan: getClanName(clanNameRegexResult),
        attackHostility: Number(result[6]) / 100,
    };
    updatePort(portNameRegexResult, updatedPort);
};
const hostilityLevelDown = (result) => {
    const clanNameRegexResult = result[2];
    const nationFullNameRegexResult = result[3];
    const portNameRegexResult = result[4];
    console.log("      --- hostilityLevelDown", portNameRegexResult);
    const updatedPort = {
        attackerNation: getNationShortNameFromFullName(nationFullNameRegexResult),
        attackerClan: getClanName(clanNameRegexResult),
        attackHostility: Number(result[6]) / 100,
    };
    updatePort(portNameRegexResult, updatedPort);
};
const portBattleScheduled = (result) => {
    const portNameRegexResult = result[2];
    const portBattleTimeRegexResult = result[4];
    const clanNameRegexResult = result[6];
    const nationFullNameRegexResult = result[7];
    const clanName = getClanName(clanNameRegexResult);
    console.log("      --- portBattleScheduled", portNameRegexResult);
    const updatedPort = {
        attackerNation: nationFullNameRegexResult
            ? getNationShortNameFromFullName(nationFullNameRegexResult)
            : guessNationFromClanName(clanName),
        attackerClan: clanName,
        attackHostility: 1,
        portBattle: getPortBattleTime(portBattleTimeRegexResult),
    };
    updatePort(portNameRegexResult, updatedPort);
};
const npcPortBattleScheduled = (result) => {
    const portNameRegexResult = result[2];
    const portBattleTimeRegexResult = result[3];
    console.log("      --- npcPortBattleScheduled", portNameRegexResult);
    const updatedPort = {
        attackerNation: "NT",
        attackerClan: "RAIDER",
        attackHostility: 1,
        portBattle: getPortBattleTime(portBattleTimeRegexResult),
    };
    updatePort(portNameRegexResult, updatedPort);
};
const cooledOff = (result) => {
    const portNameRegexResult = result[2];
    console.log("      --- cooledOff", portNameRegexResult);
    const updatedPort = {};
    updatePort(portNameRegexResult, updatedPort);
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
const defendedRegex = new RegExp(`\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR}) ?\\(?(${nationR})?\\)? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`, "u");
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
const foundCooldown = (result, nation) => {
    const tweetTimeRegexResult = result[1];
    const portNameRegexResult = result[2];
    isPortDataChanged = true;
    cooldownOn(portNameRegexResult, nation, tweetTimeRegexResult);
};
const checkCooldown = (tweet) => {
    let result;
    if ((result = capturedRegex.exec(tweet)) !== null) {
        const nationFullNameRegexResult = result[4];
        const nation = getNationShortNameFromFullName(nationFullNameRegexResult);
        captured(result);
        foundCooldown(result, nation);
    }
    else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
        const nation = "NT";
        npcCaptured(result);
        foundCooldown(result, nation);
    }
    else if ((result = defendedRegex.exec(tweet)) !== null) {
        const nationFullNameRegexResult = result[4];
        const nation = getNationShortNameFromFullName(nationFullNameRegexResult);
        foundCooldown(result, nation);
    }
    else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
        const nation = "NT";
        foundCooldown(result, nation);
    }
};
const checkPBAndRaid = (tweet) => {
    let result;
    if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        npcPortBattleScheduled(result);
    }
    else if ((result = portBattleRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        portBattleScheduled(result);
    }
    else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        cooledOff(result);
    }
};
const checkPort = (tweet) => {
    let result;
    let matched = true;
    if ((result = capturedRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        const nationFullNameRegexResult = result[4];
        const nation = getNationShortNameFromFullName(nationFullNameRegexResult);
        captured(result);
        foundCooldown(result, nation);
    }
    else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        const nation = "NT";
        npcCaptured(result);
        foundCooldown(result, nation);
    }
    else if ((result = defendedRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        const nationFullNameRegexResult = result[4];
        const nation = result[3] === "neutral bots" ? "NT" : getNationShortNameFromFullName(nationFullNameRegexResult);
        foundCooldown(result, nation);
    }
    else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        const nation = "NT";
        foundCooldown(result, nation);
    }
    else if ((result = hostilityLevelUpRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        hostilityLevelUp(result);
    }
    else if ((result = hostilityLevelDownRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        hostilityLevelDown(result);
    }
    else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        npcPortBattleScheduled(result);
    }
    else if ((result = portBattleRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        portBattleScheduled(result);
    }
    else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
        isPortDataChanged = true;
        cooledOff(result);
    }
    else if (rumorRegex.exec(tweet) !== null) {
    }
    else {
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
        const tweetTimeRegexResult = result[1];
        checkFlags(tweet);
        if (isTweetTimeInLastThreeDays(tweetTimeRegexResult)) {
            checkCooldown(tweet);
        }
        if (isTweetTimeOneDayAgo(tweetTimeRegexResult)) {
            checkPBAndRaid(tweet);
        }
        else if (isTweetTimeToday(tweetTimeRegexResult)) {
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
        nation: getNationShortNameFromId(apiPort.Nation),
        capturer: apiPort.Capturer,
        captured: getCaptureDate(Number(apiPort.Id)),
    }));
};
const getPortCurrent = () => {
    ports = readJson(portFilename);
};
const updateTwitter = async () => {
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
};
void updateTwitter();
//# sourceMappingURL=index.js.map