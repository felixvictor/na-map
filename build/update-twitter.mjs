#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import Twit from "twit";
import xss from "xss";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(customParseFormat);
dayjs.extend(utc);

import {
    cleanName,
    commonPaths,
    fileExists,
    findNationByName,
    findNationByShortName,
    readJson,
    readTextFile,
    saveJsonAsync,
    saveTextFile,
    serverNames,
    serverStartDate as serverDate,
    serverStartDateTime
} from "./common.mjs";

const runType = process.argv[2];
const consumerKey = process.argv[3];
const consumerSecret = process.argv[4];
const accessToken = process.argv[5];
const accessTokenSecret = process.argv[6];

const portFilename = path.resolve(commonPaths.dirGenServer, `${serverNames[0]}-pb.json`);
let ports = [];
let Twitter;
let tweets = [];
let refresh = 0;

/**
 * Get refresh id, either from file or set default value (0)
 * @return {number} Refresh id
 */
const getRefreshId = () =>
    fileExists(commonPaths.fileTwitterRefreshId) ? Number(readTextFile(commonPaths.fileTwitterRefreshId)) : 0;

/**
 * Save refresh id to file
 * @param {number} refresh
 */
const saveRefreshId = refresh => {
    saveTextFile(commonPaths.fileTwitterRefreshId, refresh);
};

/**
 * Add new data to tweets and update refresh id
 * @param {object} data
 * @return {Promise<boolean>}
 */
const addTwitterData = async data => {
    await tweets.push(...data.statuses.flatMap(status => xss(status.full_text)).sort());
    refresh = await Math.max(refresh, Number(data.search_metadata.max_id));
    console.log(
        data.statuses.length,
        tweets.length,
        refresh,
        data.statuses.flatMap(status => xss(status.full_text)).sort()
    );
    return true;
};

/**
 * Load data from twitter
 * @param {string} query Twitter query
 * @param {number} since_id Last tweet id
 * @return {Promise<void>}
 */
// eslint-disable-next-line camelcase
const getTwitterData = async (query, since_id = refresh) => {
    await Twitter.get("search/tweets", {
        count: 100,
        q: query,
        // eslint-disable-next-line camelcase
        result_type: "recent",
        // eslint-disable-next-line camelcase
        since_id,
        // eslint-disable-next-line camelcase
        tweet_mode: "extended"
    })
        .catch(error => {
            throw error.stack;
        })
        .then(result => addTwitterData(result.data));
};

/**
 * Get tweets since maintenance
 * @return {Promise<void>}
 */
const getTweetsSinceMaintenance = async () => {
    const queryTime = dayjs.utc(serverStartDateTime);
    const query = `"[${queryTime.format("DD-MM-YYYY")} ${String(queryTime.hour()).padStart(2, "0")}:"%20from:zz569k`;

    await getTwitterData(query);
};

/**
 * Get tweets since last refresh id
 * @return {Promise<void>}
 */
const getTweetsSinceRefresh = async () => {
    const query = "from:zz569k";

    await getTwitterData(query);
};

/**
 * Get partial data since maintenance or later based on refresh id
 * @return {Promise<void>}
 */
const getTweetsPartial = async () => {
    if (refresh > 0) {
        getTweetsSinceRefresh();
    } else {
        getTweetsSinceMaintenance();
    }
};

/**
 * Get all available tweets from the last days
 * @return {Promise<void>}
 */
const getTweetsFull = async () => {
    const now = dayjs.utc();

    for (
        let queryTime = dayjs
            .utc(serverStartDateTime)
            .subtract(2, "day")
            .hour(0);
        queryTime.isBefore(now);
        queryTime = queryTime.add(1, "hour")
    ) {
        const query = `"[${queryTime.format("DD-MM-YYYY")} ${String(queryTime.hour()).padStart(
            2,
            "0"
        )}:"%20from:zz569k`;
        console.log(query);
        // eslint-disable-next-line no-await-in-loop
        await getTwitterData(query, 0);
    }
};

/**
 * Get tweets
 * @return {Promise<void>}
 */
const getTweets = async () => {
    tweets = [];
    refresh = getRefreshId();
    Twitter = new Twit({
        // eslint-disable-next-line camelcase
        consumer_key: consumerKey,
        // eslint-disable-next-line camelcase
        consumer_secret: consumerSecret,
        // eslint-disable-next-line camelcase
        access_token: accessToken,
        // eslint-disable-next-line camelcase
        access_token_secret: accessTokenSecret,
        // eslint-disable-next-line camelcase
        timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
        strictSSL: true // optional - requires SSL certificates to be valid.
    });

    console.log(runType);
    if (runType === "full") {
        await getTweetsFull();
    } else {
        await getTweetsPartial();
    }

    saveRefreshId(refresh);
    console.log(tweets);
};

/**
 * Find index by port name
 * @param {string} portName - port name
 * @returns {number} Index
 */
const findPortIndex = portName => ports.ports.findIndex(port => port.name === cleanName(portName));

/**
 * Port captured
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const captured = result => {
    const i = findPortIndex(result[2]);

    const port = ports.ports[i];

    console.log("      --- captured", i);
    port.nation = findNationByName(result[4]).short;
    port.capturer = cleanName(result[3]);
    port.lastPortBattle = dayjs.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    port.attackerNation = "";
    port.attackerClan = "";
    port.attackHostility = "";
    port.portBattle = "";
};

/**
 * Port captured by NPC raiders
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const npcCaptured = result => {
    const i = findPortIndex(result[2]);
    const port = ports.ports[i];

    console.log("      --- captured by NPC", i);
    port.nation = "NT";
    port.capturer = "RAIDER";
    port.lastPortBattle = dayjs.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    port.attackerNation = "";
    port.attackerClan = "";
    port.attackHostility = "";
    port.portBattle = "";
};

/**
 * Port defended
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const defended = result => {
    const i = findPortIndex(result[2]);
    const port = ports.ports[i];

    console.log("      --- defended", i);
    port.attackerNation = "";
    port.attackerClan = "";
    port.attackHostility = "";
    port.portBattle = "";
};

/**
 * Hostility increased
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const hostilityLevelUp = result => {
    const i = findPortIndex(result[4]);
    const port = ports.ports[i];

    console.log("      --- hostilityLevelUp", i);
    port.attackerNation = cleanName(result[3]);
    port.attackerClan = cleanName(result[2]);
    port.attackHostility = Number(result[6]) / 100;
};

/**
 * Hostility decreased
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const hostilityLevelDown = result => {
    const i = findPortIndex(result[4]);
    const port = ports.ports[i];

    console.log("      --- hostilityLevelDown", i);
    port.attackerNation = cleanName(result[3]);
    port.attackerClan = cleanName(result[2]);
    port.attackHostility = Number(result[6]) / 100;
};

/**
 * Port battle scheduled
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const portBattleScheduled = result => {
    const guessNationFromClanName = clanName => {
        const guessedNationShort = ports.ports.find(port => port.capturer === cleanName(clanName));
        const nationName = guessedNationShort ? findNationByShortName(guessedNationShort).name : "n/a";

        return nationName;
    };

    const i = findPortIndex(result[2]);
    const port = ports.ports[i];

    console.log("      --- portBattleScheduled", i);
    if (result[7]) {
        port.attackerNation = cleanName(result[7]);
    } else {
        port.attackerNation = guessNationFromClanName(result[6]);
    }

    port.attackerClan = result[6];
    port.attackHostility = 1;
    port.portBattle = dayjs.utc(result[4], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
};

/**
 * NPC port battle scheduled
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const npcPortBattleScheduled = result => {
    const i = findPortIndex(result[2]);
    const port = ports.ports[i];

    console.log("      --- npcPortBattleScheduled", i);
    port.attackerNation = "Neutral";
    port.attackerClan = "NPC";
    port.attackHostility = 1;
    port.portBattle = dayjs.utc(result[3], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
};

const portR = "[A-zÀ-ÿ’ -]+";
const portHashR = "[A-zÀ-ÿ]+";
const nationR = "[A-zÀ-ÿ -]+";
const clanR = "\\w+";
const defenderR = "[\\w ]+";
const timeR = "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}";
const pbTimeR = "\\d{1,2} \\w{3} \\d{4} \\d{2}:\\d{2}";
const percentageR = "\\d*\\.?\\d";

// noinspection RegExpRedundantEscape
const capturedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] (${portR}) captured by (${clanR}) ?\\(?(${nationR})?\\)?\\. Previous owner: (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
    "u"
);
// noinspection RegExpRedundantEscape
const npcCapturedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC Raiders captured port (${portR}) \\((${nationR})\\)`,
    "u"
);
// noinspection RegExpRedundantEscape
const defendedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR})( \\(${nationR}\\))? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
    "u"
);
// noinspection RegExpRedundantEscape
const npcDefendedRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC Raiders failed to capture port (${portR}) \\((${nationR})\\)`,
    "u"
);
// noinspection RegExpRedundantEscape
const hostilityLevelUpRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) increased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
    "u"
);
// noinspection RegExpRedundantEscape
const hostilityLevelDownRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) decreased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
    "u"
);
// noinspection RegExpRedundantEscape
const portBattleRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The port battle for (${portR}) \\((${nationR})\\) is scheduled for (${pbTimeR}) UTC\\. Defender: (${defenderR})\\. Attacker: (${clanR}) ?\\(?(${nationR})?\\)?\\. BR: \\d+ #PBCaribbean #PBCaribbean${portHashR} #NavalAction`,
    "u"
);
// noinspection RegExpRedundantEscape
const npcPortBattleRegex = new RegExp(
    `\\[(${timeR}) UTC\\] NPC port battle for port (${portR})(?: \\(${nationR}\\)) will be started at (${pbTimeR}) UTC`,
    "u"
);
// noinspection RegExpRedundantEscape
const rumorRegex = new RegExp(
    `\\[(${timeR}) UTC\\] Rumour has it that a great storm has destroyed a large fleet in the West Indies`,
    "u"
);
// noinspection RegExpRedundantEscape
const gainHostilityRegex = new RegExp(
    `\\[(${timeR}) UTC\\] The port (${portR}) \\((${nationR})\\) can gain hostility`,
    "u"
);
// noinspection RegExpRedundantEscape
const checkDateRegex = new RegExp(`\\[(${timeR}) UTC\\]`, "u");

/**
 * Update port data from tweets
 * @returns {Boolean} True if port data changed (new tweets)
 */
const updatePorts = () => {
    let result;
    let tweetTime;
    let isPortDataChanged = false;

    for (const tweet of tweets) {
        console.log("\ntweet", tweet);
        result = checkDateRegex.exec(tweet);
        tweetTime = dayjs.utc(result[1], "DD-MM-YYYY HH:mm");

        if (tweetTime.isAfter(serverDate)) {
            if ((result = capturedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                captured(result);
            } else if ((result = npcCapturedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                npcCaptured(result);
            } else if ((result = defendedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                defended(result);
            } else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                defended(result);
            } else if ((result = hostilityLevelUpRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                hostilityLevelUp(result);
            } else if ((result = hostilityLevelDownRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                hostilityLevelDown(result);
            } else if ((result = portBattleRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                portBattleScheduled(result);
            } else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            } else if ((result = gainHostilityRegex.exec(tweet)) !== null) {
                // noop
                // eslint-disable-next-line no-unused-expressions
                () => {};
            } else if ((result = rumorRegex.exec(tweet)) === null) {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet}\n`);
            } else {
                // noop
                // eslint-disable-next-line no-unused-expressions
                () => {};
            }
        } else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(1, "day"))) {
            // Add scheduled port battles (only if battle is in the future)
            if ((result = portBattleRegex.exec(tweet)) !== null) {
                if (dayjs.utc().isBefore(dayjs.utc(result[4], "DD MMM YYYY HH:mm"))) {
                    isPortDataChanged = true;
                    portBattleScheduled(result);
                }
            } else if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            } else if ((result = npcDefendedRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                defended(result);
            }
        } else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(2, "day"))) {
            // Add scheduled NPC raids
            if ((result = npcPortBattleRegex.exec(tweet)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            }
        }
    }

    if (isPortDataChanged) {
        saveJsonAsync(portFilename, ports);
    }

    return !isPortDataChanged;
};

const updateTwitter = async () => {
    ports = readJson(portFilename);
    await getTweets();
    updatePorts();
};

updateTwitter();
