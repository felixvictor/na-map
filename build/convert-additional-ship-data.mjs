/* eslint-disable import/no-extraneous-dependencies */
import * as fs from "fs";
import xml2Json from "xml2json";
import * as mergeObj from "object-merge-advanced";

import { readJson, readTextFile, saveJson } from "./common.mjs";

const inDir = process.argv[2],
    filename = process.argv[3];

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 * @returns {void}
 */
function convertAdditionalShipData() {
    /**
     * Maps the ship name (lower case for the file name) to the ship id
     * @type {Map<string, number>}
     */
    const shipNames = new Map([
        ["agamemnon", { id: 694, masterId: 0 }],
        ["basiccutter", { id: 413, masterId: 271 }],
        ["basiclynx", { id: 275, masterId: 274 }],
        ["bellepoule", { id: 264, masterId: 0 }],
        ["bellona", { id: 265, masterId: 0 }],
        ["bellona74", { id: 359, masterId: 0 }],
        ["brig", { id: 266, masterId: 0 }],
        ["brigmr", { id: 267, masterId: 0 }],
        ["bucentaure", { id: 268, masterId: 0 }],
        ["cerberus", { id: 269, masterId: 0 }],
        ["christian", { id: 1664, masterId: 0 }],
        ["constitution", { id: 270, masterId: 0 }],
        ["constitution2", { id: 1674, masterId: 0 }],
        ["cutter", { id: 271, masterId: 0 }],
        ["diana", { id: 1665, masterId: 0 }],
        ["endymion", { id: 768, masterId: 0 }],
        ["essex", { id: 272, masterId: 0 }],
        ["frigate", { id: 273, masterId: 0 }],
        ["grosventre", { id: 396, masterId: 0 }],
        ["grosventrepirate", { id: 1561, masterId: 0 }],
        ["gunboat", { id: 695, masterId: 0 }],
        ["hamburg", { id: 970, masterId: 0 }],
        ["hercules", { id: 1675, masterId: 0 }],
        ["hermione", { id: 592, masterId: 0 }],
        ["indefatiable", { id: 787, masterId: 0 }],
        ["indiaman", { id: 425, masterId: 0 }],
        ["ingermanland", { id: 395, masterId: 0 }],
        ["lhermione", { id: 986, masterId: 0 }],
        ["lynx", { id: 274, masterId: 0 }],
        ["mercury", { id: 276, masterId: 0 }],
        ["navybrig", { id: 277, masterId: 0 }],
        ["niagara", { id: 278, masterId: 0 }],
        ["ocean", { id: 650, masterId: 0 }],
        ["pandora", { id: 1020, masterId: 0 }],
        ["pavel", { id: 279, masterId: 0 }],
        ["pickle", { id: 280, masterId: 0 }],
        ["piratefrigate", { id: 281, masterId: 0 }],
        ["princedeneufchatel", { id: 1125, masterId: 0 }],
        ["privateer", { id: 282, masterId: 0 }],
        ["rattlesnake", { id: 283, masterId: 0 }],
        ["rattlesnakeheavy", { id: 284, masterId: 0 }],
        ["renommee", { id: 285, masterId: 0 }],
        ["requin", { id: 1676, masterId: 0 }],
        ["rookie brig", { id: 1535, masterId: 266 }],
        ["rookie snow", { id: 1536, masterId: 287 }],
        ["santisima", { id: 286, masterId: 0 }],
        ["snow", { id: 287, masterId: 0 }],
        ["surprise", { id: 288, masterId: 0 }],
        ["trader brig", { id: 289, masterId: 266 }],
        ["trader cutter", { id: 290, masterId: 271 }],
        ["trader lynx", { id: 291, masterId: 274 }],
        ["trader snow", { id: 292, masterId: 287 }],
        ["trincomalee", { id: 293, masterId: 0 }],
        ["victory", { id: 294, masterId: 0 }],
        ["wasa", { id: 1021, masterId: 0 }],
        ["yacht", { id: 295, masterId: 0 }],
        ["yachtsilver", { id: 393, masterId: 0 }]
    ]);

    /**
     * List of file names to be read
     * @type {Set<string>}
     */
    const baseFileNames = new Set();
    /**
     * Gets all files from directory <dir> and stores valid ship names in <fileNames>
     * @param {string} dir - Directory
     * @returns {void}
     */
    const getBaseFileNames = dir => {
        fs.readdirSync(dir).forEach(fileName => {
            /**
             * First part of the file name containing the ship name
             * @type {string}
             */
            let str = fileName.slice(0, fileName.indexOf(" "));
            if (str === "rookie" || str === "trader") {
                const shortenedFileName = fileName.replace("rookie ", "").replace("trader ", "");
                const str2 = shortenedFileName.slice(0, shortenedFileName.indexOf(" "));
                str = str.concat(" ").concat(str2);
            }
            if (shipNames.has(str)) {
                baseFileNames.add(str);
            }
        });
    };
    /**
     * Ship data
     * @type {object}
     */
    const ships = readJson(filename);

    getBaseFileNames(inDir);

    /**
     * @typedef SubFileStructure
     * @type {object}
     * @property {string} ext - file name extension (base file name is a ship name).
     * @property {Map<string, {group: string, element: string}>} elements - elements to be retrieved from the file.
     */

    /**
     * Data structure for content of the individual files.
     * @type {SubFileStructure}
     */
    const subFileStructure = [
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
                ["MAST_THICKNESS", { group: "mast", element: "bottomThickness" }],
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

    function getShipId(baseFileName) {
        return shipNames.get(baseFileName).id;
    }

    function getShipMasterId(baseFileName) {
        return shipNames.get(baseFileName).masterId;
    }

    function getAddData(elements, fileData) {
        /**
         * Ship data to be added per file
         * @type {Object.<string, Object.<string, number>>}
         */
        const addData = {};

        // Retrieve additional data per attribute pair
        fileData.ModuleTemplate.Attributes.Pair.forEach(pair => {
            // Check if pair is considered additional data
            if (elements.has(pair.Key)) {
                if (typeof addData[elements.get(pair.Key).group] === "undefined") {
                    addData[elements.get(pair.Key).group] = {};
                }
                addData[elements.get(pair.Key).group][elements.get(pair.Key).element] = +pair.Value.Value;
            }

            // Add calculated mast thickness
            if (pair.Key === "MAST_THICKNESS") {
                addData[elements.get(pair.Key).group].middleThickness = +pair.Value.Value * 0.75;
                addData[elements.get(pair.Key).group].topThickness = +pair.Value.Value * 0.5;
            }
        });
        return addData;
    }

    // Add additional data to the existing data
    function addAddData(addData, id) {
        // Find current ship
        ships.shipData.filter(ship => ship.id === id).forEach(ship => {
            // Get all data for each group
            Object.entries(addData).forEach(([group, values]) => {
                // Get all elements per group
                Object.entries(values).forEach(([element, value]) => {
                    if (typeof ship[group] === "undefined") {
                        // eslint-disable-next-line no-param-reassign
                        ship[group] = {};
                    }
                    // add value
                    // eslint-disable-next-line no-param-reassign
                    ship[group][element] = value;
                });
            });
        });
    }

    function getFileData(baseFileName, ext) {
        const fileName = `${inDir}/${baseFileName} ${ext}.xml`;
        const fileXmlData = readTextFile(fileName);
        return xml2Json.toJson(fileXmlData, { object: true });
    }

    // Get all files without a masterId
    Array.from(baseFileNames)
        .filter(baseFileName => getShipMasterId(baseFileName) === 0)
        .forEach(baseFileName => {
            /**
             * @type {number} Current ship id
             */
            const id = getShipId(baseFileName);

            // Retrieve and store additional data per file
            subFileStructure.forEach(file => {
                const fileData = getFileData(baseFileName, file.ext);
                /**
                 * Ship data to be added per file
                 * @type {Object.<string, Object.<string, number>>}
                 */
                const addData = getAddData(file.elements, fileData);

                addAddData(addData, id);
            });
        });

    console.log("**********************");

    // Get all files with a masterId (ship data has to be copied from master)
    Array.from(baseFileNames)
        .filter(baseFileName => getShipMasterId(baseFileName) !== 0)
        .forEach(baseFileName => {
            console.log(baseFileName);
            /**
             * @type {number} Current ship id
             */
            const id = getShipId(baseFileName);
            /**
             * @type {number} Current ship id
             */
            const masterId = getShipMasterId(baseFileName);

            // Retrieve and store additional data per file
            subFileStructure.forEach(file => {
                const fileData = getFileData(baseFileName, file.ext);
                const fileMasterData = getFileData(baseFileName, file.ext);
                /**
                 * Ship data to be added per file
                 * @type {Object.<string, Object.<string, number>>}
                 */
                const addData = getAddData(file.elements, fileData),
                    addMasterData = getAddData(file.elements, fileMasterData);

                /*
                        // https://stackoverflow.com/a/47554782
                    const mergedData = mergeDeep(addMasterData,addData);
                    */
                const mergedData = mergeObj(addMasterData);
                console.log(mergedData);
                addAddData(mergedData);
            });
        });

    saveJson(filename, ships);
}

convertAdditionalShipData();
