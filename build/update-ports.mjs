/*
    update-ports.mjs
*/

import moment from "moment";
import { nations, readJson, saveJson } from "./common.mjs";

const portFilename = process.argv[2],
    tweetsFileName = process.argv[3];

const ports = readJson(portFilename),
    tweets = readJson(tweetsFileName);

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

        console.log("      --- captured", i);
        port.nation = nations.filter(nation => nation.name === port.attackerNation).map(nation => nation.short);
        // eslint-disable-next-line prefer-destructuring
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
        // eslint-disable-next-line prefer-destructuring
        port.attackerNation = result[3];
        // eslint-disable-next-line prefer-destructuring
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
        // eslint-disable-next-line prefer-destructuring
        port.attackerNation = result[3];
        // eslint-disable-next-line prefer-destructuring
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
        // eslint-disable-next-line prefer-destructuring
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
        const i = ports.ports.findIndex(findIndex, result[2]);
        const port = ports.ports[i];

        console.log("      --- portBattleScheduled", i);
        if (typeof result[7] !== "undefined") {
            // eslint-disable-next-line prefer-destructuring
            port.attackerNation = result[7];
        } else {
            port.attackerNation = "n/a";
        }
        // eslint-disable-next-line prefer-destructuring
        port.attackerClan = result[6];
        port.attackHostility = 1;
        port.portBattle = moment(result[4], "DD MMM YYYY HH:mm").format("YYYY-MM-DD HH:mm");
    }

    const portR = "[A-zÀ-ÿ’ -]+",
        portHashR = "[A-zÀ-ÿ]+",
        nationR = "[A-zÀ-ÿ -]+",
        clanR = "\\w+",
        defenderR = "[\\w ]+",
        timeR = "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}",
        pbTimeR = "\\d{1,2} \\w{3} \\d{4} \\d{2}:\\d{2}",
        percentageR = "\\d*\\.?\\d";

    // noinspection RegExpRedundantEscape
    const capturedRegex = new RegExp(
            `\\[(${timeR}) UTC\\] (${portR}) captured by (${clanR}) ?\\(?(${nationR})?\\)?\\. Previous owner: (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
            "u"
        ),
        defendedRegex = new RegExp(
            `\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR})( \\(${nationR}\\))? against (${clanR}) ?\\(?(${nationR})?\\)? #PBCaribbean #PBCaribbean${portHashR}`,
            "u"
        ),
        hostilityLevelUpRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) increased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
            "u"
        ),
        hostilityLevelDownRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) decreased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
            "u"
        ),
        portBattleRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The port battle for (${portR}) \\((${nationR})\\) is scheduled for (${pbTimeR}) UTC\\. Defender: (${defenderR})\\. Attacker: (${clanR}) ?\\(?(${nationR})?\\)?\\. BR: \\d+ #PBCaribbean #PBCaribbean${portHashR} #NavalAction`,
            "u"
        ),
        rumorRegex = new RegExp(
            `\\[(${timeR}) UTC\\] Rumour has it that a great storm has destroyed a large fleet in the West Indies`,
            "u"
        ),
        gainHostilityRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The port (${portR}) \\((${nationR})\\) can gain hostility`,
            "u"
        ),
        checkDateRegex = new RegExp(`\\[(${timeR}) UTC\\]`, "u");
    let result,
        tweetTime,
        isPortDataChanged = false,
        serverStart = moment()
            .hour(11)
            .minute(0)
            .format("YYYY-MM-DD HH:mm");
    // adjust reference server time is needed
    if (moment.utc().isBefore(serverStart)) {
        serverStart = moment(serverStart).subtract(1, "day");
    }

    tweets.tweets.reverse().forEach(tweet => {
        // eslint-disable-next-line no-param-reassign
        tweet.text = tweet.text.replace("'", "’");
        console.log("\n\ntweet", tweet.text);

        result = checkDateRegex.exec(tweet.text);
        tweetTime = moment(result[1], "DD-MM-YYYY HH:mm");
        if (tweetTime.isAfter(serverStart)) {
            // eslint-disable-next-line no-cond-assign
            if ((result = capturedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                captured(result);
                // eslint-disable-next-line no-cond-assign
            } else if ((result = defendedRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                defended(result);
                // eslint-disable-next-line no-cond-assign
            } else if ((result = hostilityLevelUpRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                hostilityLevelUp(result);
                // eslint-disable-next-line no-cond-assign
            } else if ((result = hostilityLevelDownRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                hostilityLevelDown(result);
                // eslint-disable-next-line no-cond-assign
            } else if ((result = portBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                portBattleScheduled(result);
                // eslint-disable-next-line no-cond-assign
            } else if ((result = gainHostilityRegex.exec(tweet.text)) !== null) {
                // noop
                // eslint-disable-next-line no-unused-expressions
                () => {};
                // eslint-disable-next-line no-cond-assign
            } else if ((result = rumorRegex.exec(tweet.text)) !== null) {
                // noop
                // eslint-disable-next-line no-unused-expressions
                () => {};
            } else {
                console.log(`\n\n***************************************\nUnmatched tweet: ${tweet.text}\n`);
            }
        } else if (tweetTime.isAfter(moment(serverStart).subtract(1, "day"))) {
            // Add scheduled port battles
            // eslint-disable-next-line no-cond-assign
            if ((result = portBattleRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                portBattleScheduled(result);
                // get nation names
                // eslint-disable-next-line no-cond-assign
            } else if ((result = hostilityLevelUpRegex.exec(tweet.text)) !== null) {
                isPortDataChanged = true;
                getNation(result);
                // eslint-disable-next-line no-cond-assign
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
