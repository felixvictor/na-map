/**
 * This file is part of na-map.
 *
 * @file      Convert repair data from modules.
 * @module    build/convert-module-repair
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// noinspection ES6CheckImport
import convert from "xml-js";

import { readTextFile, saveJson } from "./common.mjs";

/**
 * Change string from snake case to camelCase
 *
 * @param {string} str Input snake case string
 * @return {string} Output camel case string
 */
function toCamelCase(str) {
    str = str.replace(/[-_\s]+(.)?/g, (match, ch) => (ch ? ch.toUpperCase() : ""));

    // Ensure first char is always lowercase
    return str.slice(0, 1).toLowerCase() + str.slice(1);
}

const inDir = process.argv[2];
const filename = process.argv[3];

const baseFileNames = ["armor repair", "sail repair", "crew repair"];

const getFileData = (baseFileName, ext) => {
    const fileName = `${inDir}/${baseFileName} ${ext}.xml`;
    const fileXmlData = readTextFile(fileName);

    return convert.xml2js(fileXmlData, { compact: true });
};

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 * @returns {void}
 */
function convertRepairData() {
    const repairs = {};
    /*
    REPAIR_VOLUME_PER_ITEM / REPAIR_PERCENT
     */
    // Get all files without a master
    [...baseFileNames].forEach(baseFileName => {
        const fileData = getFileData(baseFileName, "kit");
        const data = {};

        fileData.ModuleTemplate.Attributes.Pair.forEach(pair => {
            if (pair.Key._text === "REPAIR_VOLUME_PER_ITEM") {
                data.volume = Number(pair.Value.Value._text);
            }

            if (pair.Key._text === "REPAIR_PERCENT") {
                data.percent = Number(pair.Value.Value._text);
            }

            if (pair.Key._text === "REPAIR_MODULE_TIME") {
                data.time = Number(pair.Value.Value._text);
            }
        });

        repairs[toCamelCase(baseFileName)] = data;
    });

    saveJson(filename, repairs);
}

convertRepairData();
