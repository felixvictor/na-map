/*!
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
var _a;
import * as path from "path";
import Twit from "twit";
import xss from "xss";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import { findNationByName, findNationByNationShortName } from "../common/common";
import { commonPaths, serverStartDate as serverDate, serverStartDateTime } from "../common/common-dir";
import { fileExists, readJson, readTextFile, saveJsonAsync, saveTextFile } from "../common/common-file";
import { cleanName, simpleStringSort } from "../common/common-node";
import { serverNames } from "../common/common-var";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
const consumerKey = process.argv[2];
const consumerSecret = process.argv[3];
const accessToken = process.argv[4];
const accessTokenSecret = process.argv[5];
const runType = (_a = process.argv[6]) !== null && _a !== void 0 ? _a : "full";
const portFilename = path.resolve(commonPaths.dirGenServer, `${serverNames[0]}-pb.json`);
let ports = [];
let Twitter;
let tweets = [];
const refreshDefault = "0";
let refresh = "0";
const queryFrom = "from:zz569k";
let isPortDataChanged = false;
const getRefreshId = () => fileExists(commonPaths.fileTwitterRefreshId)
    ? String(readTextFile(commonPaths.fileTwitterRefreshId))
    : refreshDefault;
const saveRefreshId = (refresh) => {
    saveTextFile(commonPaths.fileTwitterRefreshId, refresh);
};
const addTwitterData = (data) => {
    var _a;
    tweets.push(...data.statuses
        .flatMap((status) => { var _a; return cleanName(xss.filterXSS((_a = status.full_text) !== null && _a !== void 0 ? _a : "")); })
        .sort(simpleStringSort));
    refresh = (_a = data.search_metadata.max_id_str) !== null && _a !== void 0 ? _a : "";
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
const findPortIndex = (portName) => ports.findIndex((port) => port.name === portName);
const captured = (result) => {
    var _a, _b;
    const i = findPortIndex(result[2]);
    const port = ports[i];
    console.log("      --- captured", i);
    port.nation = (_b = (_a = findNationByName(result[4])) === null || _a === void 0 ? void 0 : _a.short) !== null && _b !== void 0 ? _b : "";
    port.capturer = result[3];
    port.lastPortBattle = dayjs.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    port.attackerNation = "";
    port.attackerClan = "";
    port.attackHostility = 0;
    port.portBattle = "";
};
const npcCaptured = (result) => {
    const i = findPortIndex(result[2]);
    const port = ports[i];
    console.log("      --- captured by NPC", i);
    port.nation = "NT";
    port.capturer = "RAIDER";
    port.lastPortBattle = dayjs.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    port.attackerNation = "";
    port.attackerClan = "";
    port.attackHostility = 0;
    port.portBattle = "";
};
const defended = (result) => {
    const i = findPortIndex(result[2]);
    const port = ports[i];
    console.log("      --- defended", i);
    port.attackerNation = "";
    port.attackerClan = "";
    port.attackHostility = 0;
    port.portBattle = "";
};
const hostilityLevelUp = (result) => {
    const i = findPortIndex(result[4]);
    const port = ports[i];
    console.log("      --- hostilityLevelUp", i);
    port.attackerNation = result[3];
    port.attackerClan = result[2];
    port.attackHostility = Number(result[6]) / 100;
};
const hostilityLevelDown = (result) => {
    const i = findPortIndex(result[4]);
    const port = ports[i];
    console.log("      --- hostilityLevelDown", i);
    port.attackerNation = result[3];
    port.attackerClan = result[2];
    port.attackHostility = Number(result[6]) / 100;
};
const findPortByClanName = (clanName) => ports.find((port) => port.capturer === clanName);
const guessNationFromClanName = (clanName) => {
    var _a, _b;
    const port = findPortByClanName(clanName);
    const nation = port ? (_b = (_a = findNationByNationShortName(port.nation)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "" : "n/a";
    return nation;
};
const portBattleScheduled = (result) => {
    const i = findPortIndex(result[2]);
    const port = ports[i];
    console.log("      --- portBattleScheduled", i);
    if (result[7]) {
        port.attackerNation = result[7];
    }
    else {
        port.attackerNation = guessNationFromClanName(result[6]);
    }
    port.attackerClan = result[6];
    port.attackHostility = 1;
    port.portBattle = dayjs.utc(result[4], "D MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
};
const npcPortBattleScheduled = (result) => {
    const i = findPortIndex(result[2]);
    const port = ports[i];
    console.log("      --- npcPortBattleScheduled", i);
    port.attackerNation = "Neutral";
    port.attackerClan = "NPC";
    port.attackHostility = 1;
    port.portBattle = dayjs.utc(result[3], "D MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
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
const checkDateRegex = new RegExp(`\\[(${timeR}) UTC\\]`, "u");
const updatePorts = async () => {
    let result;
    let tweetTime;
    for (const tweet of tweets) {
        console.log("\ntweet", tweet);
        result = checkDateRegex.exec(tweet);
        if (!result) {
            return;
        }
        tweetTime = dayjs.utc(result[1], "DD-MM-YYYY HH:mm");
        if (tweetTime.isAfter(serverDate)) {
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
            }
            else if ((result = rumorRegex.exec(tweet)) === null) {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`);
            }
            else {
            }
        }
        else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(1, "day"))) {
            if ((result = portBattleRegex.exec(tweet)) !== null) {
                if (dayjs.utc().isBefore(dayjs.utc(result[4], "D MMM YYYY HH:mm"))) {
                    isPortDataChanged = true;
                    portBattleScheduled(result);
                }
            }
            else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            }
            else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                defended(result);
            }
        }
        else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(2, "day"))) {
            if ((result = npcPortBattleRegex.exec(tweet)) !== null &&
                dayjs.utc().isBefore(dayjs.utc(result[4], "D MMM YYYY HH:mm"))) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            }
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
updateTwitter();
//# sourceMappingURL=update-twitter.js.map