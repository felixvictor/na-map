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

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 * @returns {void}
 */
function convertAdditionalShipData() {
    /* helper function
const shipData = readJson("src/ships.json");
shipData.shipData.forEach(ship => {
    ships.shipData.push([ship.name, ship.id]);
});
*/

    /**
     * Maps the ship name (lower case for the file name) to the ship id
     * @type {Map<string, number>}
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

    /**
     * List of file names to be read
     * @type {Set<string>}
     */
    const fileNames = new Set();
    /**
     * Gets all files from directory <dir> and stores vaild ship names in <fileNames>
     * @param {string} dir - Directory
     * @returns {void}
     */
    const getFileNames = dir => {
        fs.readdirSync(dir).forEach(fileName => {
            /**
             * First part of the file name containing the ship name
             * @type {string}
             */
            const str = fileName.substr(0, fileName.indexOf(" "));
            if (shipNames.has(str)) {
                fileNames.add(str);
            }
        });
    };
    /**
     * Ship data
     * @type {object}
     */
    const ships = readJson("src/ships.json");

    getFileNames(inDir);

    /**
     * @typedef FileStructure
     * @type {object}
     * @property {string} ext - file name extension (base file name is a ship name).
     * @property {Map<string, {group: string, element: string}>} elements - elements to be retrieved from the file.
     */

    /**
     * Data structure for content of the individual files.
     * @type {FileStructure}
     */
    const fileStructure = [
        {
            ext: "b armor",
            elements: new Map([
                ["ARMOR_REAR_HP", { group: "stern", element: "armour" }],
                ["ARMOR_THICKNESS", { group: "stern", element: "thickness" }],
                ["REPAIR_MODULE_TIME", { group: "repairTime", element: "stern" }]
            ])
        },
        {
            ext: "f armor",
            elements: new Map([
                ["ARMOR_FRONT_HP", { group: "bow", element: "armour" }],
                ["ARMOR_THICKNESS", { group: "bow", element: "thickness" }],
                ["REPAIR_MODULE_TIME", { group: "repairTime", element: "bow" }]
            ])
        },
        {
            ext: "l armor",
            elements: new Map([
                ["ARMOR_LEFT_HP", { group: "sides", element: "armour" }],
                ["ARMOR_THICKNESS", { group: "sides", element: "thickness" }],
                ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sides" }]
            ])
        },
        {
            ext: "hull",
            elements: new Map([
                // ["FIRE_INCREASE_RATE", "FIRE_INCREASE_RATE"],
                // ["FIREZONE_HORIZONTAL_ROTATION_SPEED", "FIREZONE_HORIZONTAL_ROTATION_SPEED"],
                ["FIREZONE_HORIZONTAL_WIDTH", { group: "ship", element: "firezoneHorizontalWidth" }],
                // ["FIREZONE_MAX_HORIZONTAL_ANGLE", "FIREZONE_MAX_HORIZONTAL_ANGLE"],
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                ["MODULE_BASE_HP", { group: "hull", element: "armour" }],
                ["SHIP_PHYSICS_ACC_COEF", { group: "ship", element: "acceleration" }],
                ["SHIP_PHYSICS_DEC_COEF", { group: "ship", element: "deceleration" }],
                // ["SHIP_RHEAS_DRIFT", "SHIP_RHEAS_DRIFT"],
                // ["SHIP_SPEED_DRIFT_MODIFIER", { group: "ship", element: "speedDriftModifier" }],
                // ["SHIP_SPEED_YARD_POWER_MODIFIER", "SHIP_SPEED_YARD_POWER_MODIFIER"],
                // ["SHIP_STAYSAILS_DRIFT", { group: "ship", element: "staySailsDrift" }],
                ["SHIP_STRUCTURE_LEAKS_PER_SECOND", { group: "ship", element: "structureLeaksPerSecond" }],
                ["SHIP_TURNING_ACCELERATION_TIME", { group: "ship", element: "turningAcceleration" }],
                ["SHIP_TURNING_ACCELERATION_TIME_RHEAS", { group: "ship", element: "turningYardAcceleration" }],
                ["SHIP_WATERLINE_HEIGHT", { group: "ship", element: "waterlineHeight" }]
            ])
        },
        {
            ext: "mast",
            elements: new Map([
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                ["MAST_BOTTOM_SECTION_HP", { group: "mast", element: "bottomArmour" }],
                ["MAST_MIDDLE_SECTION_HP", { group: "mast", element: "middleArmour" }],
                ["MAST_TOP_SECTION_HP", { group: "mast", element: "topArmour" }]
            ])
        },
        {
            ext: "rudder",
            elements: new Map([
                ["ARMOR_THICKNESS", { group: "rudder", element: "thickness" }],
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                ["MODULE_BASE_HP", { group: "rudder", element: "armour" }],
                ["REPAIR_MODULE_TIME", { group: "repairTime", element: "rudder" }],
                ["RUDDER_HALFTURN_TIME", { group: "rudder", element: "halfturnTime" }],
                ["SHIP_TURNING_SPEED", { group: "rudder", element: "turnSpeed" }]
            ])
        },
        {
            ext: "sail",
            elements: new Map([
                // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
                // ["HIT_PROBABILITY", "HIT_PROBABILITY"],
                // ["MAST_CRIT_PROBABILITY", "MAST_CRIT_PROBABILITY"],
                ["MAST_THICKNESS", { group: "mast", element: "thickness" }],
                ["MODULE_BASE_HP", { group: "sails", element: "armour" }],
                ["REPAIR_MODULE_TIME", { group: "repairTime", element: "sails" }],
                // ["RHEA_TURN_SPEED", "RHEA_TURN_SPEED"],
                ["SAIL_RISING_SPEED", { group: "sails", element: "risingSpeed" }],
                ["SAILING_CREW_REQUIRED", { group: "crew", element: "sailing" }]
                // ["SHIP_MAX_SPEED",  { group: "sails", element: "thickness" }],
                // ["SPANKER_TURN_SPEED", { group: "sails", element: "spankerTurnSpeed" }]
            ])
        },
        {
            ext: "structure",
            elements: new Map([
                // ["EXPLOSION_DAMAGE_ABSORB_MULTIPLIER", "EXPLOSION_DAMAGE_ABSORB_MULTIPLIER"],
                ["MODULE_BASE_HP", { group: "structure", element: "armour" }],
                ["REPAIR_MODULE_TIME", { group: "repairTime", element: "structure" }]
            ])
        }
    ];
    Array.from(fileNames).forEach(baseFileName => {
        /**
         * @type {number} Current ship id
         */
        const id = shipNames.get(baseFileName);

        // Retrieve and store additional data per file
        fileStructure.forEach(file => {
            /**
             * Ship data to be added per file
             * @type {Object.<string, Object.<string, number>>}
             */
            const addData = {};
            const fileName = `${inDir}/${baseFileName} ${file.ext}.xml`;
            const fileXmlData = readTextFile(fileName);
            const fileData = xml2Json.toJson(fileXmlData, { object: true });

            // Retrieve additional data per attribute pair
            fileData.ModuleTemplate.Attributes.Pair.forEach(pair => {
                // Check if pair is considered additional data
                if (file.elements.has(pair.Key)) {
                    if (typeof addData[file.elements.get(pair.Key).group] === "undefined") {
                        addData[file.elements.get(pair.Key).group] = {};
                    }
                    addData[file.elements.get(pair.Key).group][file.elements.get(pair.Key).element] = +pair.Value.Value;
                }
            });

            // Add additional data to the existing data
            // Find current ship
            ships.shipData.filter(ship => ship.id === id).forEach(ship => {
                // Get all data for each group
                Object.entries(addData).forEach(([group, values]) => {
                    // Get all elements per group
                    Object.entries(values).forEach(([element, value]) => {
                        if (typeof ship[group] === "undefined") {
                            ship[group] = {};
                        }
                        // add value
                        ship[group][element] = value;
                    });
                });
            });
        });
    });

    saveJson(outFilename, ships);
}

convertAdditionalShipData();
