/**
 * This file is part of na-map.
 *
 * @file      Cannon data.
 * @module    convert-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* eslint-disable import/no-extraneous-dependencies */
import * as fs from "fs";
import xml2Json from "xml2json";

import { readTextFile, round, saveJson, sortBy } from "./common.mjs";

const inDirectory = process.argv[2];
const filename = process.argv[3];

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

const countDecimals = value => {
    if (Math.floor(value) === value) {
        return 0;
    }

    return value.toString().split(".")[1].length || 0;
};

const peneDistances = [50, 100, 250, 500, 750, 1000];
const cannonTypes = ["medium", "long", "carronade"];

/**
 * Retrieve cannon data from game files and store it
 * @returns {void}
 */
function convertCannons() {
    const cannons = {};
    cannonTypes.forEach(type => {
        cannons[type] = [];
    });

    /**
     * List of file names to be read
     * @type {Set<string>}
     */
    const fileNames = new Set();
    /**
     * Gets all files from directory <dir> and stores valid cannon/carronade file names in <fileNames>
     * @param {string} directory - Directory
     * @returns {void}
     */
    const getBaseFileNames = directory => {
        fs.readdirSync(directory).forEach(fileName => {
            /**
             * First part of the file name containing the type
             * @type {string}
             */
            const fileNameFirstPart = fileName.slice(0, fileName.indexOf(" "));
            if (
                (fileNameFirstPart === "cannon" && fileName !== "cannon repair kit.xml") ||
                fileNameFirstPart === "carronade" ||
                fileName.startsWith("tower cannon")
            ) {
                fileNames.add(fileName);
            }
        });
    };

    getBaseFileNames(inDirectory);

    /**
     * @typedef SubFileStructure
     * @type {object}
     * @property {string} ext - file name extension (base file name is a ship name).
     * @property {Map<string, {group: string, element: string}>} elements - elements to be retrieved from the file.
     */

    /**
     * Data mapping for content of the individual files.
     * @type {Map<string, {group: string, element: string}>}
     */
    const dataMapping = new Map([
        // ["CANNON_BLOW_CHANCE", { group: "generic", element: "blow chance" }],
        // ["HIT_PROBABILITY", { group: "damage", element: "hit probability" }],
        // ["DAMAGE_MULTIPLIER", { group: "damage", element: "multiplier" }],
        ["CANNON_BASIC_DAMAGE", { group: "damage", element: "basic" }],
        // ["CANNON_FIREPOWER", { group: "damage", element: "firepower" }],
        ["CANNON_MIN_ANGLE", { group: "generic", element: "min angle" }],
        ["CANNON_MAX_ANGLE", { group: "generic", element: "max angle" }],
        ["CANNON_DISPERSION_PER100M", { group: "dispersion", element: "per 100m" }],
        ["CANNON_DISPERSION_VERTICAL_PER100M", { group: "dispersion", element: "vertical per 100m" }],
        // ["CANNON_DISPERSION_REDUCTION_SPEED", { group: "dispersion", element: "reduction speed" }],
        ["CANNON_RELOAD_TIME", { group: "damage", element: "reload time" }],
        ["CANNON_MASS", { group: "generic", element: "weight" }],
        // ["DAMAGE_TYPE", { group: "damage", element: "type" }],
        // ["MODULE_BASE_HP", { group: "strength", element: "base" }],
        ["CANNON_BASIC_PENETRATION", { group: "damage", element: "penetration" }],
        // ["FIRE_PROBABILITY", { group: "generic", element: "fire probablity" }],
        // ["CANNON_MASS", { group: "generic", element: "mass" }],
        // ["CANNON_BALL_RADIUS", { group: "generic", element: "ball radius" }],
        // ["CANNON_FIREZONE_HORIZONTAL_ROTATION_SPEED", { group: "dispersion", element: "horizontal rotation speed" }],
        // ["CANNON_BULLETS_PER_SHOT", { group: "generic", element: "bullets per shot" }],
        // ["CANNON_DISPERSION_REDUCTION_ANGLE_CHANGE_MULTIPLIER", { group: "dispersion", element: "reduction angle change modifier" }],
        // ["CANNON_DISPERSION_SHIP_PITCHING_MODIFIER", { group: "dispersion", element: "shi pitching modifier" }],
        // ["CANNON_FORWARD_FLY_TIME", { group: "generic", element: "forward fly time" }],
        // ["CANNON_FORWARD_FIREPOWER_LOSS", { group: "generic", element: "firepower loss" }],
        // ["CANNON_GRAVITY_MULTIPLIER", { group: "generic", element: "gravity multiplier" }],
        // ["CANNON_TYPE", { group: "generic", element: "type" }],
        // ["CANNON_CLASS", { group: "generic", element: "class" }],
        // ["ARMOR_DAMAGE_ABSORB_MULTIPLIER", { group: "strength", element: "damage absorb multiplier" }],
        ["CANNON_CREW_REQUIRED", { group: "crew", element: "required" }],
        // ["ARMOR_THICKNESS", { group: "strength", element: "thickness" }],
        ["CANNON_BALL_ARMOR_SPLINTERS_DAMAGE_FOR_CREW", { group: "crew", element: "splinter damage" }]
    ]);

    /**
     * Add data
     * @param {Object} fileData - File data per cannon
     * @returns {void}
     */
    function addData(fileData) {
        let type = "medium";
        if (
            fileData.ModuleTemplate.Name.slice(0, fileData.ModuleTemplate.Name.indexOf(" ")).toLowerCase() ===
            "carronade"
        ) {
            type = "carronade";
        } else if (fileData.ModuleTemplate.Name.endsWith("Long")) {
            type = "long";
        }

        const name = fileData.ModuleTemplate.Name.replace("Cannon ", "")
            .replace("Carronade ", "")
            .replace(" pd", "")
            .replace(" Long", "")
            .replace("Salvaged ", "")
            .replace("0.5 E", "E")
            .replace(/^(\d+) - (.+)$/g, "$1 ($2)")
            .replace(/^Tower (\d+)$/g, "$1 (Tower)")
            .replace(" Gun", "");
        const cannon = {
            name
        };

        // console.log(fileData.ModuleTemplate);
        dataMapping.forEach(({ group, element }, value) => {
            if (!cannon[group]) {
                // eslint-disable-next-line no-param-reassign
                cannon[group] = {};
                cannon[group][element] = {};
            }

            cannon[group][element] = {
                value: Number(fileData.ModuleTemplate.Attributes.Pair.find(pair => value === pair.Key).Value.Value),
                digits: 0
            };
        });

        // Calculate penetrations
        const penetrations = new Map(
            fileData.ModuleTemplate.Attributes.Pair.find(pair => pair.Key === "CANNON_PENETRATION_DEGRADATION")
                .Value.Value.filter(penetration => Number(penetration.Time) > 0)
                .map(penetration => [penetration.Time * 1000, Number(penetration.Value)])
        );
        penetrations.set(250, (penetrations.get(200) + penetrations.get(300)) / 2);
        penetrations.set(500, (penetrations.get(400) + penetrations.get(600)) / 2);
        penetrations.set(750, penetrations.get(800) + (penetrations.get(600) - penetrations.get(800)) * 0.25);
        cannon["penetration (m)"] = {};
        peneDistances.forEach(distance => {
            cannon["penetration (m)"][distance] = {
                value: Math.trunc(penetrations.get(distance) * cannon.damage.penetration.value) | 0,
                digits: 0
            };
        });
        delete cannon.damage.penetration;

        // Calculate damage per second
        cannon.damage["per second"] = {
            value: round(cannon.damage.basic.value / cannon.damage["reload time"].value, 2),
            digits: 0
        };

        cannons[type].push(cannon);
    }

    /**
     * Get content of XML file in json format
     * @param {string} baseFileName - Base file name
     * @returns {Object} File content in json format
     */
    function getFileData(baseFileName) {
        const fileName = `${inDirectory}/${baseFileName}`;
        const fileXmlData = readTextFile(fileName);
        return xml2Json.toJson(fileXmlData, { object: true });
    }

    // Get all files without a master
    [...fileNames].forEach(baseFileName => {
        const fileData = getFileData(baseFileName);
        addData(fileData);
    });

    // Set maximum digits after decimal point
    const maxDigits = {};
    cannonTypes.forEach(type => {
        maxDigits[type] = {};

        cannons[type].forEach(cannon => {
            Object.entries(cannon).forEach(([groupKey, groupValue]) => {
                if (typeof groupValue === "object") {
                    if (!maxDigits[type][groupKey]) {
                        maxDigits[type][groupKey] = {};
                    }

                    Object.entries(groupValue).forEach(([elementKey, elementValue]) => {
                        maxDigits[type][groupKey][elementKey] = Math.max(
                            maxDigits[type][groupKey][elementKey] | 0,
                            countDecimals(elementValue.value)
                        );
                    });
                }
            });
        });
    });
    cannonTypes.forEach(type => {
        cannons[type].forEach(cannon => {
            Object.entries(cannon).forEach(([groupKey, groupValue]) => {
                if (typeof groupValue === "object") {
                    Object.entries(groupValue).forEach(([elementKey]) => {
                        cannon[groupKey][elementKey].digits = maxDigits[type][groupKey][elementKey];
                    });
                }
            });
        });
    });

    saveJson(filename, cannons);
}

convertCannons();
