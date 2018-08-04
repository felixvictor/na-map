/* eslint-disable import/no-extraneous-dependencies */
import * as fs from "fs";
import xml2Json from "xml2json";

import { readJson, readTextFile, saveJson } from "./common.mjs";

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
    const ships = readJson("src/ships.json");

    getFileNames(inDir);

    const data = [
        {
            ext: "b armor",
            elements: new Map([
                ["ARMOR_REAR_HP", "backHP"],
                ["ARMOR_THICKNESS", "backThickness"],
                ["MODULE_BASE_HP", "backBaseHP"]
            ])
        },
        {
            ext: "f armor",
            elements: new Map([
                ["ARMOR_FRONT_HP", "frontHP"],
                ["ARMOR_THICKNESS", "frontThickness"],
                ["MODULE_BASE_HP", "frontBaseHP"]
            ])
        },
        {
            ext: "l armor",
            elements: new Map([
                ["ARMOR_LEFT_HP", "leftHP"],
                ["ARMOR_THICKNESS", "leftThickness"],
                ["MODULE_BASE_HP", "leftBaseHP"]
            ])
        },
        {
            ext: "r armor",
            elements: new Map([
                ["ARMOR_RIGHT_HP", "rightHP"],
                ["ARMOR_THICKNESS", "rightThickness"],
                ["MODULE_BASE_HP", "rightBaseHP"]
            ])
        },
        {
            ext: "hull",
            elements: new Map([
                // ["FIRE_INCREASE_RATE", "FIRE_INCREASE_RATE"],
                ["FIRE_SPREAD_DISTANCE", "FIRE_SPREAD_DISTANCE"],
                // ["FIREZONE_HORIZONTAL_ROTATION_SPEED", "FIREZONE_HORIZONTAL_ROTATION_SPEED"],
                ["FIREZONE_HORIZONTAL_WIDTH", "FIREZONE_HORIZONTAL_WIDTH"],
                // ["FIREZONE_MAX_HORIZONTAL_ANGLE", "FIREZONE_MAX_HORIZONTAL_ANGLE"],
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                ["MODULE_BASE_HP", "hullBaseHP"],
                ["SHIP_PHYSICS_ACC_COEF", "SHIP_PHYSICS_ACC_COEF"],
                ["SHIP_PHYSICS_DEC_COEF", "SHIP_PHYSICS_DEC_COEF"],
                ["SHIP_PHYSICS_DEC_COEF", "SHIP_PHYSICS_DEC_COEF"],
                // ["SHIP_RHEAS_DRIFT", "SHIP_RHEAS_DRIFT"],
                ["SHIP_ROLL_ANGLE_AIMING_MODIFIER", "SHIP_ROLL_ANGLE_AIMING_MODIFIER"],
                ["SHIP_SPEED_DRIFT_MODIFIER", "SHIP_SPEED_DRIFT_MODIFIER"],
                // ["SHIP_SPEED_YARD_POWER_MODIFIER", "SHIP_SPEED_YARD_POWER_MODIFIER"],
                ["SHIP_STAYSAILS_DRIFT", "SHIP_STAYSAILS_DRIFT"],
                ["SHIP_STRUCTURE_LEAKS_PER_SECOND", "SHIP_STRUCTURE_LEAKS_PER_SECOND"],
                ["SHIP_TURNING_ACCELERATION_TIME", "SHIP_TURNING_ACCELERATION_TIME"],
                ["SHIP_TURNING_ACCELERATION_TIME_RHEAS", "SHIP_TURNING_ACCELERATION_TIME_RHEAS"],
                ["SHIP_WATERLINE_HEIGHT", "SHIP_WATERLINE_HEIGHT"]
            ])
        },
        {
            ext: "mast",
            elements: new Map([
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                ["MAST_BOTTOM_SECTION_HP", "MAST_BOTTOM_SECTION_HP"],
                ["MAST_MIDDLE_SECTION_HP", "MAST_MIDDLE_SECTION_HP"],
                ["MAST_TOP_SECTION_HP", "MAST_TOP_SECTION_HP"]
            ])
        },
        {
            ext: "rudder",
            elements: new Map([
                ["ARMOR_THICKNESS", "rudderThickness"],
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                ["MAST_THICKNESS", "mastThickness"],
                ["MODULE_BASE_HP", "rudderBaseHP"],
                // ["REPAIR_MODULE_TIME", "REPAIR_MODULE_TIME"],
                ["RUDDER_HALFTURN_TIME", "RUDDER_HALFTURN_TIME"],
                ["SHIP_TURNING_SPEED", "SHIP_TURNING_SPEED"]
            ])
        },
        {
            ext: "sail",
            elements: new Map([
                // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                // ["MAST_CRIT_PROBABILITY", "MAST_CRIT_PROBABILITY"],
                ["MAST_THICKNESS", "mastThickness"],
                ["MODULE_BASE_HP", "sailBaseHP"],
                // ["REPAIR_MODULE_TIME", "REPAIR_MODULE_TIME"],
                // ["RHEA_TURN_SPEED", "RHEA_TURN_SPEED"],
                ["SAIL_CRIT_PROBABILITY", "SAIL_CRIT_PROBABILITY"],
                ["SAIL_RISING_SPEED", "SAIL_RISING_SPEED"],
                ["SAILING_CREW_REQUIRED", "sailingCrew"],
                ["SHIP_MAX_SPEED", "SHIP_MAX_SPEED"],
                ["SPANKER_TURN_SPEED", "SPANKER_TURN_SPEED"]
            ])
        },

        {
            ext: "structure",
            elements: new Map([
                // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
                ["MODULE_BASE_HP", "MODULE_BASE_HP"]
                // ["REPAIR_MODULE_TIME", "REPAIR_MODULE_TIME"]
            ])
        }
    ];
    Array.from(fileNames).forEach(baseFileName => {
        const id = shipNames.get(baseFileName);
        data.forEach(file => {
            const addData = {},
                fileName = `${inDir}/${baseFileName} ${file.ext}.xml`,
                xmlContent = readTextFile(fileName),
                shipData = xml2Json.toJson(xmlContent, { object: true });
            shipData.ModuleTemplate.Attributes.Pair.forEach(pair => {
                // console.log(ship.ModuleTemplate.Attributes.Pair);
                if (file.elements.has(pair.Key)) {
                    // console.log(baseFileName, id, file.elements.get(pair.Key), +pair.Value.Value);
                    addData[file.elements.get(pair.Key)] = +pair.Value.Value;
                }
            });
            ships.shipData.filter(ship => ship.id === id).forEach(ship => {
                ship[file.ext] = addData;
            });
        });
    });

    saveJson(outFilename, ships);
}

convertAdditionalShipData();
