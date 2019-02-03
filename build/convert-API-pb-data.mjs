import fs from "fs";
import moment from "moment";
import { nations } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIPorts = JSON.parse(fs.readFileSync(`${inBaseFilename}-Ports-${date}.json`, "utf8"));

function saveJson(data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(outFilename, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertPorts() {
    const ticks = 621355968000000000;
    const json = {};

    json.ports = [];
    APIPorts.forEach(port => {
        const portData = {
            id: +port.Id,
            name: port.Name.replaceAll("'", "’"),

            nation: nations[port.Nation].short,
            capturer: port.Capturer,
            lastPortBattle: moment((port.LastPortBattle - ticks) / 10000).format("YYYY-MM-DD HH:mm"),
            attackerNation: "",
            attackerClan: "",
            attackHostility: "",
            portBattle: ""
        };
        json.ports.push(portData);
    });
    saveJson(json);
}

convertPorts();
