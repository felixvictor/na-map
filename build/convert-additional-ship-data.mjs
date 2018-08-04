/* eslint-disable import/no-extraneous-dependencies */
import * as fs from "fs";

import { saveJson } from "./common.mjs";

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
        ["Agamemnon", 694],
        ["BasicCutter", 413],
        ["BasicLynx", 275],
        ["BellePoule", 264],
        ["Bellona", 265],
        ["Bellona74", 359],
        ["Brig", 266],
        ["BrigMR", 267],
        ["Bucentaure", 268],
        ["Cerberus", 269],
        ["Christian", 1664],
        ["Constitution", 270],
        ["Constitution2", 1674],
        ["Cutter", 271],
        ["Diana", 1665],
        ["Endymion", 768],
        ["Essex", 272],
        ["Frigate", 273],
        ["GrosVentre", 396],
        ["GrosVentrePirate", 1561],
        ["GunBoat", 695],
        ["Hamburg", 970],
        ["Hercules", 1675],
        ["Hermione", 592],
        ["Indefatiable", 787],
        ["Indiaman", 425],
        ["Ingermanland", 395],
        ["Lhermione", 986],
        ["Lynx", 274],
        ["Mercury", 276],
        ["NavyBrig", 277],
        ["Niagara", 278],
        ["Ocean", 650],
        ["Pandora", 1020],
        ["Pavel", 279],
        ["Pickle", 280],
        ["PirateFrigate", 281],
        ["PrincedeNeufchatel", 1125],
        ["Privateer", 282],
        ["Rattlesnake", 283],
        ["RattlesnakeHeavy", 284],
        ["Renommee", 285],
        ["Requin", 1676],
        ["RookieBrig", 1535],
        ["RookieSnow", 1536],
        ["Santisima", 286],
        ["Snow", 287],
        ["Surprise", 288],
        ["TradersBrig", 289],
        ["TradersCutter", 290],
        ["TradersLynx", 291],
        ["TradersSnow", 292],
        ["Trincomalee", 293],
        ["Victory", 294],
        ["Wasa", 1021],
        ["Yacht", 295],
        ["YachtSilver", 393]
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

    saveJson(outFilename, ships);
}

convertAdditionalShipData();
