import fs from "fs";
import moment from "moment";
import { cleanName, nations } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIPorts = JSON.parse(fs.readFileSync(`${inBaseFilename}-Ports-${date}.json`, "utf8"));

function saveJson(data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(outFilename, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

function convertPorts() {
    const ticks = 621355968000000000;
    const json = {};

    json.ports = [];
    APIPorts.forEach(port => {
        const portData = {
            id: Number(port.Id),
            name: cleanName(port.Name),

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
