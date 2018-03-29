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
    function captured(result) {
        ports.objects.ports.geometries.properties.filter(port => port.name === result[2]).forEach(port => {
            port.capturer = result[3];
            port.nation = nations.filter(nation => nation.name === result[4]).map(nation => nation.short);
            port.lastPortBattle = moment(result[1]).format("YYYY-MM-DD HH:mm");
            port.attackerNation = "";
            port.attackerClan = "";
            port.portBattle = "";
        });
    }

    function defended(result) {
        ports.filter(port => port.name === result[2]).map(port => {
            port.attackerNation = "";
            port.attackerClan = "";
            port.portBattle = "";
        });
    }

    function hostilityLevelUp(result) {
        ports.filter(port => port.name === result[4]).map(port => {
            port.attackerNation = result[3];
            port.attackerClan = result[2];
            port.attackHostility = result[6];
        });
    }

    function hostilityLevelDown(result) {
        ports.filter(port => port.name === result[4]).map(port => {
            port.attackerNation = result[3];
            port.attackerClan = result[2];
            port.attackHostility = result[6];
        });
    }

    function portBattleScheduled(result) {
        ports.filter(port => port.name === result[2]).map(port => {
            port.attackerNation = result[7];
            port.attackerClan = result[6];
            port.attackHostility = "";
            port.portBattle = moment(result[4]).format("YYYY-MM-DD HH:mm");
        });
    }

    const capturedRegex = new RegExp(
            "[(d{2}-d{2}-d{4} d{2}:d{2}) UTC] ([w' ]+) captured by (w+) (([w ]+)). Previous owner: (w+) (([w ]+)) #PBCaribbean #PBCaribbeanw+",
            "mu"
        ),
        defendedRegex = new RegExp(
            "[(d{2}-d{2}-d{4} d{2}:d{2}) UTC] ([w' ]+) defended by (w+) (([w ]+)) against (w+) (([w ]+)) #PBCaribbean #PBCaribbeanw+",
            "mu"
        ),
        hostilityLevelUpRegex = new RegExp(
            "[(d{2}-d{2}-d{4} d{2}:d{2}) UTC] The hostility level of the clan (w+) (([w ]+)) on the port ([w' ]+) (([w ]+)) increased to (d*.?d)%. The previous value was (d*.?d)% #HOCaribbeanw+",
            "mu"
        ),
        hostilityLevelDownRegex = new RegExp(
            "[(d{2}-d{2}-d{4} d{2}:d{2}) UTC] The hostility level of the clan (w+) (([w ]+)) on the port ([w' ]+) (([w ]+)) decreased to (d*.?d)%. The previous value was (d*.?d)% #HOCaribbeanw+",
            "mu"
        ),
        portBattleRegex = new RegExp(
            "[(d{2}-d{2}-d{4} d{2}:d{2}) UTC] The port battle for ([w' ]+) (([w ]+)) is scheduled for (d{1,2} w{3} d{4} d{2}:d{2}) UTC. Defender: (w+). Attacker: (w+) (([w ]+)). BR: d+ #PBCaribbean #PBCaribbeanw+ #NavalAction",
            "mu"
        );
    let result;
    tweets.forEach(tweet => {
        if ((result = capturedRegex.exec(tweet.text)) !== null) {
            captured(result);
        } else if ((result = defendedRegex.exec(tweet.text)) !== null) {
            defended(result);
        } else if ((result = hostilityLevelUpRegex.exec(tweet.text)) !== null) {
            hostilityLevelUp(result);
        } else if ((result = hostilityLevelDownRegex.exec(tweet.text)) !== null) {
            hostilityLevelDown(result);
        } else if ((result = portBattleRegex.exec(tweet.text)) !== null) {
            portBattleScheduled(result);
        }
    });
    saveJson(ports);
}

updatePorts();
