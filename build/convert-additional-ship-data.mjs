/* eslint-disable import/no-extraneous-dependencies */
import * as fs from "fs";
import xml2Json from "xml2json";
import mergeAdvanced from "object-merge-advanced";

import { isEmpty, readJson, readTextFile, saveJson } from "./common.mjs";

const inDir = process.argv[2],
    filename = process.argv[3];

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 * @returns {void}
 */
function convertAdditionalShipData() {
    /**
     * Maps the ship name (lower case for the file name) to the ship id
     * @type {Map<string, {id: number, master: string}>}
     */
    const shipNames = new Map([
        ["agamemnon", { id: 694, master: "" }],
        ["basiccutter", { id: 413, master: "cutter" }],
        ["basiclynx", { id: 275, master: "lynx" }],
        ["bellepoule", { id: 264, master: "" }],
        ["bellona", { id: 265, master: "" }],
        ["bellona74", { id: 359, master: "" }],
        ["brig", { id: 266, master: "" }],
        ["brigmr", { id: 267, master: "" }],
        ["bucentaure", { id: 268, master: "" }],
        ["cerberus", { id: 269, master: "" }],
        ["christian", { id: 1664, master: "" }],
        ["constitution", { id: 270, master: "" }],
        ["constitution2", { id: 1674, master: "" }],
        ["cutter", { id: 271, master: "" }],
        ["diana", { id: 1665, master: "" }],
        ["endymion", { id: 768, master: "" }],
        ["essex", { id: 272, master: "" }],
        ["frigate", { id: 273, master: "" }],
        ["grosventre", { id: 396, master: "" }],
        ["grosventrepirate", { id: 1561, master: "" }],
        ["gunboat", { id: 695, master: "" }],
        ["hamburg", { id: 970, master: "" }],
        ["hercules", { id: 1675, master: "" }],
        ["hermione", { id: 592, master: "" }],
        ["indefatiable", { id: 787, master: "" }],
        ["indiaman", { id: 425, master: "" }],
        ["ingermanland", { id: 395, master: "" }],
        ["lhermione", { id: 986, master: "" }],
        ["lynx", { id: 274, master: "" }],
        ["mercury", { id: 276, master: "" }],
        ["navybrig", { id: 277, master: "" }],
        ["niagara", { id: 278, master: "" }],
        ["ocean", { id: 650, master: "" }],
        ["pandora", { id: 1020, master: "" }],
        ["pavel", { id: 279, master: "" }],
        ["pickle", { id: 280, master: "" }],
        ["piratefrigate", { id: 281, master: "" }],
        ["princedeneufchatel", { id: 1125, master: "" }],
        ["privateer", { id: 282, master: "" }],
        ["rattlesnake", { id: 283, master: "" }],
        ["rattlesnakeheavy", { id: 284, master: "" }],
        ["renommee", { id: 285, master: "" }],
        ["requin", { id: 1676, master: "" }],
        ["rookie brig", { id: 1535, master: "brig" }],
        ["rookie snow", { id: 1536, master: "snow" }],
        ["santisima", { id: 286, master: "" }],
        ["snow", { id: 287, master: "" }],
        ["surprise", { id: 288, master: "" }],
        ["trader brig", { id: 289, master: "brig" }],
        ["trader cutter", { id: 290, master: "cutter" }],
        ["trader lynx", { id: 291, master: "lynx" }],
        ["trader snow", { id: 292, master: "snow" }],
        ["trincomalee", { id: 293, master: "" }],
        ["victory", { id: 294, master: "" }],
        ["wasa", { id: 1021, master: "" }],
        ["yacht", { id: 295, master: "" }],
        ["yachtsilver", { id: 393, master: "" }]
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
        // Add 'basic' ship without files
        baseFileNames.add("basiccutter");
        baseFileNames.add("basiclynx");
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
                ["SAILING_CREW_REQUIRED", { group: "crew", element: "sailing" }],
                ["SHIP_MAX_SPEED", { group: "ship", element: "maxSpeed" }]
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

    function getShipMaster(baseFileName) {
        return shipNames.get(baseFileName).master;
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
        ships
            .filter(ship => ship.id === id)
            .forEach(ship => {
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

    // Get all files without a master
    Array.from(baseFileNames)
        .filter(baseFileName => !getShipMaster(baseFileName))
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

    // Get all files with a master (ship data has to be copied from master)
    Array.from(baseFileNames)
        .filter(baseFileName => getShipMaster(baseFileName))
        .forEach(baseFileName => {
            /**
             * @type {number} Current ship id
             */
            const id = getShipId(baseFileName);
            /**
             * @type {number} Current ship master
             */
            const masterBaseFileName = getShipMaster(baseFileName);

            // Retrieve and store additional data per file
            subFileStructure.forEach(file => {
                const fileData = getFileData(baseFileName, file.ext);
                const fileMasterData = getFileData(masterBaseFileName, file.ext);
                /**
                 * Ship data to be added per file
                 * @type {Object.<string, Object.<string, number>>}
                 */
                const addData = !isEmpty(fileData) ? getAddData(file.elements, fileData) : {},
                    addMasterData = getAddData(file.elements, fileMasterData);

                /*
                        // https://stackoverflow.com/a/47554782
                    const mergedData = mergeDeep(addMasterData,addData);
                    */
                const mergedData = mergeAdvanced(addMasterData, addData);

                addAddData(mergedData, id);
            });
        });

    saveJson(filename, ships);
}

convertAdditionalShipData();
