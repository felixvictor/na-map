/* eslint-disable */
/*
    update-ports.mjs
*/

import fs from "fs";
import moment from "moment";
import { nations } from "./common.mjs";

const portFilename = process.argv[2],
    tweetsFileName = process.argv[3];

const ports = JSON.parse(fs.readFileSync(portFilename, "utf8")),
    tweets = JSON.parse(fs.readFileSync(tweetsFileName, "utf8"));

function saveJson(data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(portFilename, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

function updatePorts() {
    function findIndex(element) {
        return element.properties.name === this;
    }

    function captured(result) {
        //    port => port.properties.name === result[2].replace("\", """)
        const i = ports.objects.ports.geometries.findIndex(findIndex, result[2]);
        const port = ports.objects.ports.geometries[i];

        console.log("      --- captured ", i);
        // eslint-disable-next-line prefer-destructuring
        port.properties.capturer = result[3];
        port.properties.nation = nations.filter(nation => nation.name === result[4]).map(nation => nation.short);
        port.properties.lastPortBattle = moment(result[1], "DD-MM-YYYY HH:mm UTC").format("YYYY-MM-DD HH:mm");
        port.properties.attackerNation = "";
        port.properties.attackerClan = "";
        port.properties.portBattle = "";
    }

    function defended(result) {
        const i = ports.objects.ports.geometries.findIndex(findIndex, result[2]);
        const port = ports.objects.ports.geometries[i];
        console.log("      --- defended before ", port.properties);
        port.properties.attackerNation = "";
        port.properties.attackerClan = "";
        port.properties.portBattle = "";
        console.log("      --- defended after ", port.properties);
    }

    function hostilityLevelUp(result) {
        const i = ports.objects.ports.geometries.findIndex(findIndex, result[4]);
        const port = ports.objects.ports.geometries[i];

        console.log("      --- hostilityLevelUp ", i);
        port.properties.attackerNation = result[3];
        port.properties.attackerClan = result[2];
        port.properties.attackHostility = result[6];
    }

    function hostilityLevelDown(result) {
        const i = ports.objects.ports.geometries.findIndex(findIndex, result[4]);
        const port = ports.objects.ports.geometries[i];
        console.log("      --- hostilityLevelDown before ", port.properties);
        port.properties.attackerNation = result[3];
        port.properties.attackerClan = result[2];
        port.properties.attackHostility = result[6];
        console.log("      --- hostilityLevelDown after ", port.properties);
    }

    function portBattleScheduled(result) {
        const i = ports.objects.ports.geometries.findIndex(findIndex, result[2]);
        const port = ports.objects.ports.geometries[i];
        console.log("      --- portBattleScheduled i ", i);
        console.log("      --- portBattleScheduled date ", result);
        console.log("      --- portBattleScheduled before ", port.properties);
        port.properties.attackerNation = result[7];
        port.properties.attackerClan = result[6];
        port.properties.attackHostility = "";
        port.properties.portBattle = moment(result[4], "DD MMM YYYY HH:mm UTC").format("YYYY-MM-DD HH:mm");
        console.log("      --- portBattleScheduled after ", port.properties);
    }

    const portR = "[A-zÀ-ÿ’ -]+",
        portHashR = "[A-zÀ-ÿ]+",
        nationR = "[A-zÀ-ÿ -]+",
        clanR = "\\w+",
        timeR = "\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}",
        pbTimeR = "\\d{1,2} \\w{3} \\d{4} \\d{2}:\\d{2}",
        percentageR = "\\d*\\.?\\d";
    // language=JSUnicodeRegexp
  // noinspection RegExpRedundantEscape
  const capturedRegex = new RegExp(
            `\\[(${timeR}) UTC\\] (${portR}) captured by (${clanR}) \\((${nationR})\\)\\. Previous owner: (${clanR}) \\((${nationR})\\) #PBCaribbean #PBCaribbean${portHashR}`,
            "u"
        ),
    // language=JSUnicodeRegexp
        defendedRegex = new RegExp(
            `\\[(${timeR}) UTC\\] (${portR}) defended by (${clanR}) \\((${nationR})\\) against (${clanR}) \\((${nationR})\\) #PBCaribbean #PBCaribbean${portHashR}`,
            "u"
        ),
    // language=JSUnicodeRegexp
        hostilityLevelUpRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) increased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
            "u"
        ),
    // language=JSUnicodeRegexp
        hostilityLevelDownRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The hostility level of the clan (${clanR}) \\((${nationR})\\) on the port (${portR}) \\((${nationR})\\) decreased to (${percentageR})%\\. The previous value was (${percentageR})% #HOCaribbean${portHashR}`,
            "u"
        ),
    // language=JSUnicodeRegexp
        portBattleRegex = new RegExp(
            `\\[(${timeR}) UTC\\] The port battle for (${portR}) \\((${nationR})\\) is scheduled for (${pbTimeR}) UTC\\. Defender: (${clanR})\\. Attacker: (${clanR}) \\((${nationR})\\)\\. BR: \\d+ #PBCaribbean #PBCaribbean${portHashR} #NavalAction`,
            "u"
        );
    let result;

    tweets.tweets.forEach(tweet => {
        console.log("\n\ntweet ", tweet);
        tweet.text.replace("\\\\", "").replace("'", "’");
        // eslint-disable-next-line no-cond-assign
        if ((result = capturedRegex.exec(tweet.text)) !== null) {
            captured(result);
            // eslint-disable-next-line no-cond-assign
        } else if ((result = defendedRegex.exec(tweet.text)) !== null) {
            defended(result);
            // eslint-disable-next-line no-cond-assign
        } else if ((result = hostilityLevelUpRegex.exec(tweet.text)) !== null) {
            hostilityLevelUp(result);
            // eslint-disable-next-line no-cond-assign
        } else if ((result = hostilityLevelDownRegex.exec(tweet.text)) !== null) {
            hostilityLevelDown(result);
            // eslint-disable-next-line no-cond-assign
        } else if ((result = portBattleRegex.exec(tweet.text)) !== null) {
            portBattleScheduled(result);
        }
    });
    // saveJson(ports);
}

updatePorts();
