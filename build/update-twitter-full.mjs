#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-twitter-full
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import dayjs from "dayjs";
import Twit from "twit";

import {
    baseAPIFilename,
    commonPaths,
    findNationByName,
    findNationByShortName,
    readJson,
    saveJsonAsync,
    serverNames,
    serverStartDate as serverDate
} from "./common.mjs";

const consumerKey = process.argv[2];
const consumerSecret = process.argv[3];
const accessToken = process.argv[4];
const accessTokenSecret = process.argv[5];

const apiPorts = [];
let tweets = {};

const getTweetsInRange = () => {
    /*
    local query_date
    query_date="$1"
    local query_hour
    query_hour="$2"

    local url_start
    url_start="/1.1/search/tweets.json?tweet_mode=extended&count=100&result_type=recent"
    local query_end
    query_end=":\"%20from:zz569k"
    local jq_format
    jq_format="{ tweets: [ .statuses[] | { id: .id_str, text: .full_text } ], refresh: .search_metadata.max_id_str }"
    local query_start
    query_start="&q=\"[${query_date} ${query_hour}"

    ${command_twurl} "${url_start}${query_start}${query_end}" | ${command_jq} "${jq_format}" >> "${tweets_json}"
    echo "," >> "${tweets_json}"
     */
};

const getTweets = () => {
    /*

time_of_day=$(date '+%d-%m-%Y' -d "${server_date} - 2 day")
for query_hour in $(seq 0 23); do
    get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
done

time_of_day=$(date '+%d-%m-%Y' -d "${server_date} - 1 day")
for query_hour in $(seq 0 23); do
    get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
done

time_of_day=$(date '+%d-%m-%Y' -d "${server_date}")
for query_hour in $(seq 0 23); do
    get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
done

time_of_day=$(date '+%d-%m-%Y' -d "${server_date} + 1 day")
for query_hour in $(seq 0 ${server_maintenance_hour}); do
    get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
done

# Remove trailing comma
sed -i '$s/,$//' "${tweets_json}"
echo "]" >> "${tweets_json}"
    */
    const T = new Twit({
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

    T.get("search/tweets", { q: "from:zz569k", count: 100 }, (err, data) => {
        if (err) {
            throw err;
        }

        tweets = { tweets: data.statuses.map(status => status.text), refresh: Number(data.search_metadata.max_id) };
        console.log(tweets);
    });
};

/**
 * Find index by port name
 * @param {Object} element - port data
 * @returns {Boolean} True if port name equals this
 */
const findIndex = element => element.name === this;

/**
 * Port captured
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const captured = result => {
    const i = apiPorts.ports.findIndex(findIndex, result[2]);
    const port = apiPorts.ports[i];

    console.log("      --- captured", i);
    port.nation = findNationByName(result[4]).short;
    port.capturer = result[3];
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
    const i = apiPorts.ports.findIndex(findIndex, result[2]);
    const port = apiPorts.ports[i];

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
    const i = apiPorts.ports.findIndex(findIndex, result[2]);
    const port = apiPorts.ports[i];

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
    const i = apiPorts.ports.findIndex(findIndex, result[4]);
    const port = apiPorts.ports[i];

    console.log("      --- hostilityLevelUp", i);
    port.attackerNation = result[3];
    port.attackerClan = result[2];
    port.attackHostility = result[6] / 100;
};

/**
 * Hostility decreased
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const hostilityLevelDown = result => {
    const i = apiPorts.ports.findIndex(findIndex, result[4]);
    const port = apiPorts.ports[i];

    console.log("      --- hostilityLevelDown", i);
    port.attackerNation = result[3];
    port.attackerClan = result[2];
    port.attackHostility = result[6] / 100;
};

/**
 * Port battle scheduled
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const portBattleScheduled = result => {
    const guessNationFromClanName = clanName => {
        const guessedNationShort = apiPorts.ports.find(port => port.capturer === clanName);
        const nationName = guessedNationShort ? findNationByShortName(guessedNationShort).name : "n/a";

        return nationName;
    };

    const i = apiPorts.ports.findIndex(findIndex, result[2]);
    const port = apiPorts.ports[i];

    console.log("      --- portBattleScheduled", i);
    if (result[7]) {
        port.attackerNation = result[7];
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
    const i = apiPorts.ports.findIndex(findIndex, result[2]);
    const port = apiPorts.ports[i];

    console.log("      --- npcPortBattleScheduled", i);
    port.attackerNation = "Neutral";
    port.attackerClan = "NPC";
    port.attackHostility = 1;
    port.portBattle = dayjs.utc(result[3], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
};

/**
 * Update port data from tweets
 * @returns {Boolean} True if port data changed (new tweets)
 */
function updatePorts() {
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
    let result;
    let tweetTime;
    let isPortDataChanged = false;

    // When twitter-update has been used, reformat tweets.tweets
    if (!tweets.refresh) {
        tweets.tweets = tweets
            .flatMap(tweet => tweet.tweets)
            .sort((a, b) => {
                const timeA = dayjs.utc(a.text.slice(1, 17), "DD-MM-YYYY HH:mm");
                const timeB = dayjs.utc(b.text.slice(1, 17), "DD-MM-YYYY HH:mm");
                if (timeA.isAfter(timeB)) {
                    return -1;
                }

                if (timeB.isAfter(timeA)) {
                    return 1;
                }

                return 0;
            });
    }

    tweets.tweets.reverse().forEach(tweet => {
        tweet.text = tweet.text.replace("'", "’");
        console.log("\ntweet", tweet.text);
        result = checkDateRegex.exec(tweet.text);
        tweetTime = dayjs.utc(result[1], "DD-MM-YYYY HH:mm");
        if (tweetTime.isAfter(serverDate)) {
            if ((result = capturedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                captured(result);
            } else if ((result = npcCapturedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                npcCaptured(result);
            } else if ((result = defendedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                defended(result);
            } else if ((result = npcDefendedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                defended(result);
            } else if ((result = hostilityLevelUpRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                hostilityLevelUp(result);
            } else if ((result = hostilityLevelDownRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                hostilityLevelDown(result);
            } else if ((result = portBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                portBattleScheduled(result);
            } else if ((result = npcPortBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            } else if ((result = gainHostilityRegex.exec(tweet.text)) !== null) {
                // noop
                // eslint-disable-next-line no-unused-expressions
                () => {};
            } else if ((result = rumorRegex.exec(tweet.text)) === null) {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet.text}\n`);
            } else {
                // noop
                // eslint-disable-next-line no-unused-expressions
                () => {};
            }
        } else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(1, "day"))) {
            // Add scheduled port battles (only if battle is in the future)
            if ((result = portBattleRegex.exec(tweet.text)) !== null) {
                if (dayjs.utc().isBefore(dayjs.utc(result[4], "DD MMM YYYY HH:mm"))) {
                    isPortDataChanged = true;
                    portBattleScheduled(result);
                }
            } else if ((result = npcPortBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            } else if ((result = npcDefendedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                defended(result);
            }
        } else if (tweetTime.isAfter(dayjs.utc(serverDate).subtract(2, "day"))) {
            // Add scheduled NPC raids
            if ((result = npcPortBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            }
        }
    });

    if (isPortDataChanged) {
        saveJsonAsync(portFilename, apiPorts);
    }

    return !isPortDataChanged;
}

// apiPorts = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));
getTweets();
// updatePorts();
