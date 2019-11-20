/**
 * This file is part of na-map.
 *
 * @file      Convert ports based on tweets.
 * @module    build/update-ports
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import moment from "moment";
import { nations, readJson, saveJson } from "./common.mjs";

const portFilename = process.argv[2];
const tweetsFileName = process.argv[3];

const ports = readJson(portFilename);
const tweets = readJson(tweetsFileName);

/**
 * Update port data from tweets
 * @returns {Boolean} True if port data changed (new tweets)
 */
function updatePorts() {
    /**
     * Find index by port name
     * @param {Object} element - port data
     * @returns {Boolean} True if port name equals this
     */
    function findIndex(element) {
        return element.name === this;
    }

    /**
     * Port captured
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function captured(result) {
        const i = ports.ports.findIndex(findIndex, result[2]);
        const port = ports.ports[i];
        const nationName = result[4];
        const capturingNation = nations.find(nation => nation.name === nationName);

        console.log("      --- captured", i);
        port.nation = capturingNation.short;
        port.capturer = result[3];
        port.lastPortBattle = moment(result[1], "DD-MM-YYYY HH:mm").format("YYYY-MM-DD HH:mm");
        port.attackerNation = "";
        port.attackerClan = "";
        port.attackHostility = "";
        port.portBattle = "";
    }

    /**
     * Port defended
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function defended(result) {
        const i = ports.ports.findIndex(findIndex, result[2]);
        const port = ports.ports[i];

        console.log("      --- defended", i);
        port.attackerNation = "";
        port.attackerClan = "";
        port.attackHostility = "";
        port.portBattle = "";
    }

    /**
     * Hostility increased
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function hostilityLevelUp(result) {
        const i = ports.ports.findIndex(findIndex, result[4]);
        const port = ports.ports[i];

        console.log("      --- hostilityLevelUp", i);
        port.attackerNation = result[3];
        port.attackerClan = result[2];
        port.attackHostility = result[6] / 100;
    }

    /**
     * Hostility decreased
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function hostilityLevelDown(result) {
        const i = ports.ports.findIndex(findIndex, result[4]);
        const port = ports.ports[i];

        console.log("      --- hostilityLevelDown", i);
        port.attackerNation = result[3];
        port.attackerClan = result[2];
        port.attackHostility = result[6] / 100;
    }

    /**
     * Get attacker nation
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function getNation(result) {
        const i = ports.ports.findIndex(findIndex, result[4]);
        const port = ports.ports[i];

        console.log("      --- getNation", i);
        port.attackerNation = result[3];
        port.attackerClan = "";
        port.attackHostility = 0;
    }

    /**
     * Port battle scheduled
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function portBattleScheduled(result) {
        const guessNationFromClanName = clanName => {
            const guessedNation = ports.ports.find(port => port.capturer === clanName);
            const nationName = guessedNation
                ? nations.find(nation => nation.short === guessedNation.nation).name
                : "n/a";

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
        port.portBattle = moment(result[4], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    }

    /**
     * NPC port battle scheduled
     * @param {String[]} result - Result from tweet regex
     * @returns {void}
     */
    function npcPortBattleScheduled(result) {
        const i = ports.ports.findIndex(findIndex, result[2]);
        const port = ports.ports[i];

        console.log("      --- npcPortBattleScheduled", i);
        port.attackerNation = "Neutral";
        port.attackerClan = "NPC";
        port.attackHostility = 1;
        port.portBattle = moment(result[3], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    }

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
    const defendedRegex = new RegExp(
        `\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR})( \\(${nationR}\\))? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
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
    let serverStart = moment()
        .utc()
        .hour(10)
        .minute(0)
        .format("YYYY-MM-DD HH:mm");
    // adjust reference server time is needed
    if (moment.utc().isBefore(serverStart)) {
        serverStart = moment(serverStart).subtract(1, "day");
    }

    // When twitter-update has been used, reformat tweets.tweets
    if (!tweets.refresh) {
        tweets.tweets = tweets
            .flatMap(tweet => tweet.tweets)
            .sort((a, b) => {
                const timeA = moment(a.text.slice(1, 17), "DD-MM-YYYY HH:mm");
                const timeB = moment(b.text.slice(1, 17), "DD-MM-YYYY HH:mm");
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
        tweetTime = moment(result[1], "DD-MM-YYYY HH:mm");
        if (tweetTime.isAfter(serverStart)) {
            if ((result = capturedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                captured(result);
            } else if ((result = defendedRegex.exec(tweet.text)) !== null) {
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
        } else if (tweetTime.isAfter(moment(serverStart).subtract(1, "day"))) {
            // Add scheduled port battles
            if ((result = portBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                portBattleScheduled(result);
                // get nation names
            } else if ((result = hostilityLevelUpRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                getNation(result);
            }
        }
    });
    if (isPortDataChanged) {
        saveJson(portFilename, ports);
    }

    return !isPortDataChanged;
}

// process.exitCode = updatePorts();
updatePorts();
