/**
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-ports
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import moment from "moment";
import { getServerStartDateTime, findNationByName, findNationByShortName, readJson, saveJsonAsync } from "./common.mjs";

const portFilename = process.argv[2];
const tweetsFileName = process.argv[3];

const ports = readJson(portFilename);
const tweets = readJson(tweetsFileName);

const serverStart = getServerStartDateTime();

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
    const i = ports.ports.findIndex(findIndex, result[2]);
    const port = ports.ports[i];

    console.log("      --- captured", i);
    port.nation = findNationByName(result[4]).short;
    port.capturer = result[3];
    port.lastPortBattle = moment.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
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
    const i = ports.ports.findIndex(findIndex, result[2]);
    const port = ports.ports[i];

    console.log("      --- captured by NPC", i);
    port.nation = "NT";
    port.capturer = "RAIDER";
    port.lastPortBattle = moment.utc(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
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
    const i = ports.ports.findIndex(findIndex, result[2]);
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
    const i = ports.ports.findIndex(findIndex, result[4]);
    const port = ports.ports[i];

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
    const i = ports.ports.findIndex(findIndex, result[4]);
    const port = ports.ports[i];

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
        const guessedNationShort = ports.ports.find(port => port.capturer === clanName);
        const nationName = guessedNationShort ? findNationByShortName(guessedNationShort).name : "n/a";

        return nationName;
    };

    const i = ports.ports.findIndex(findIndex, result[2]);
    const port = ports.ports[i];

    console.log("      --- portBattleScheduled", i);
    if (result[7]) {
        port.attackerNation = result[7];
    } else {
        port.attackerNation = guessNationFromClanName(result[6]);
    }

    port.attackerClan = result[6];
    port.attackHostility = 1;
    port.portBattle = moment.utc(result[4], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
};

/**
 * NPC port battle scheduled
 * @param {String[]} result - Result from tweet regex
 * @returns {void}
 */
const npcPortBattleScheduled = result => {
    const i = ports.ports.findIndex(findIndex, result[2]);
    const port = ports.ports[i];

    console.log("      --- npcPortBattleScheduled", i);
    port.attackerNation = "Neutral";
    port.attackerClan = "NPC";
    port.attackHostility = 1;
    port.portBattle = moment.utc(result[3], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
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
                const timeA = moment.utc(a.text.slice(1, 17), "DD-MM-YYYY HH:mm");
                const timeB = moment.utc(b.text.slice(1, 17), "DD-MM-YYYY HH:mm");
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
        tweetTime = moment.utc(result[1], "DD-MM-YYYY HH:mm");
        if (tweetTime.isAfter(serverStart)) {
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
        } else if (tweetTime.isAfter(moment.utc(serverStart).subtract(1, "day"))) {
            // Add scheduled port battles (only if battle is in the future)
            if ((result = portBattleRegex.exec(tweet.text)) !== null) {
                if (moment.utc().isBefore(moment.utc(result[4], "DD MMM YYYY HH:mm"))) {
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
        } else if (tweetTime.isAfter(moment.utc(serverStart).subtract(2, "day"))) {
            // Add scheduled NPC raids
            if ((result = npcPortBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                npcPortBattleScheduled(result);
            }
        }
    });

    if (isPortDataChanged) {
        saveJsonAsync(portFilename, ports);
    }

    return !isPortDataChanged;
}

// process.exitCode = updatePorts();
updatePorts();
