/* eslint-disable import/no-extraneous-dependencies */
import * as fs from "fs";
import xml2Json from "xml2json";

import { readTextFile, saveJson } from "./common.mjs";

const inDir = process.argv[2],
    outFilename = process.argv[3];

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertAdditionalShipData() {
    /* helper function
const shipData = readJson("src/ships.json");
shipData.shipData.forEach(ship => {
    ships.shipData.push([ship.name, ship.id]);
});
*/

    const shipNames = new Map([
        ["agamemnon", 694],
        ["basiccutter", 413],
        ["basiclynx", 275],
        ["bellepoule", 264],
        ["bellona", 265],
        ["bellona74", 359],
        ["brig", 266],
        ["brigmr", 267],
        ["bucentaure", 268],
        ["cerberus", 269],
        ["christian", 1664],
        ["constitution", 270],
        ["constitution2", 1674],
        ["cutter", 271],
        ["diana", 1665],
        ["endymion", 768],
        ["essex", 272],
        ["frigate", 273],
        ["grosventre", 396],
        ["grosventrepirate", 1561],
        ["gunboat", 695],
        ["hamburg", 970],
        ["hercules", 1675],
        ["hermione", 592],
        ["indefatiable", 787],
        ["indiaman", 425],
        ["ingermanland", 395],
        ["lhermione", 986],
        ["lynx", 274],
        ["mercury", 276],
        ["navybrig", 277],
        ["niagara", 278],
        ["ocean", 650],
        ["pandora", 1020],
        ["pavel", 279],
        ["pickle", 280],
        ["piratefrigate", 281],
        ["princedeneufchatel", 1125],
        ["privateer", 282],
        ["rattlesnake", 283],
        ["rattlesnakeheavy", 284],
        ["renommee", 285],
        ["requin", 1676],
        ["rookiebrig", 1535],
        ["rookiesnow", 1536],
        ["santisima", 286],
        ["snow", 287],
        ["surprise", 288],
        ["tradersbrig", 289],
        ["traderscutter", 290],
        ["traderslynx", 291],
        ["traderssnow", 292],
        ["trincomalee", 293],
        ["victory", 294],
        ["wasa", 1021],
        ["yacht", 295],
        ["yachtsilver", 393]
    ]);
    const fileNames = new Set();
    const getFileNames = dir => {
        fs.readdirSync(dir).forEach(fileName => {
            const str = fileName.substr(0, fileName.indexOf(" "));
            if (shipNames.has(str)) {
                fileNames.add(str);
            }
        });
    };

    const ships = {};
    ships.shipData = [];

     getFileNames(inDir);

    const data = [
        {
            ext: "f armor",
            elements: new Map([
                ["ARMOR_FRONT_HP", "ARMOR_FRONT_HP"],
                ["ARMOR_THICKNESS", "ARMOR_THICKNESS"],
                ["MODULE_BASE_HP", "MODULE_BASE_HP"]
            ])
        },
        {
            ext: "sail",
            elements: new Map([
                ["SAILING_CREW_REQUIRED", "SAILING_CREW_REQUIRED"],
                ["MODULE_BASE_HP", "MODULE_BASE_HP"],
                ["MAST_THICKNESS", "MAST_THICKNESS"]
            ])
        }
    ];
    Array.from(fileNames).forEach(baseFileName => {
        const id = shipNames.get(baseFileName);
        data.forEach(file => {
            const fileName = `${inDir}/${baseFileName} ${file.ext}.xml`,
                xmlContent = readTextFile(fileName),
                ship = xml2Json.toJson(xmlContent, { object: true });
            ship.ModuleTemplate.Attributes.Pair.forEach(pair => {
                // console.log(ship.ModuleTemplate.Attributes.Pair);
                if (file.elements.has(pair.Key)) {
                    console.log(baseFileName, id, file.elements.get(pair.Key), +pair.Value.Value);
                }
            });
        });
    });

    saveJson(outFilename, ships);
}

convertAdditionalShipData();
