/**
 * This file is part of na-map.
 *
 * @file      Convert repair data from modules.
 * @module    build/convert-module-repair
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import xml2Json from "xml2json";

import { readTextFile, saveJson } from "./common.mjs";

/**
 * Change string from snake case to camelCase
 *
 * @param {string} str Input snake case string
 * @return {string} Output camel case string
 */
function toCamelCase(str) {
    str = str.replace(/[-_\s]+(.)?/g, (
        match,
        ch // eslint-disable-line no-param-reassign
    ) => (ch ? ch.toUpperCase() : ""));

    // Ensure first chat is always lowercase
    return str.substr(0, 1).toLowerCase() + str.substr(1);
}

const inDir = process.argv[2];
const filename = process.argv[3];

const baseFileNames = ["armor repair", "sail repair", "crew repair"];

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 * @returns {void}
 */
function convertRepairData() {
    function getFileData(baseFileName, ext) {
        console.log(`${inDir}/${baseFileName} ${ext}.xml`);
        const fileName = `${inDir}/${baseFileName} ${ext}.xml`;
        const fileXmlData = readTextFile(fileName);
        return xml2Json.toJson(fileXmlData, { object: true });
    }

    const repairs = {};
    /*
    REPAIR_VOLUME_PER_ITEM / REPAIR_PERCENT
     */
    // Get all files without a master
    [...baseFileNames].forEach(baseFileName => {
        const fileData = getFileData(baseFileName, "kit");
        let volume = 1;
        let percent = 1;

        fileData.ModuleTemplate.Attributes.Pair.forEach(pair => {
            if (pair.Key === "REPAIR_VOLUME_PER_ITEM") {
                volume = Number(pair.Value.Value);
            }

            if (pair.Key === "REPAIR_PERCENT") {
                percent = Number(pair.Value.Value);
            }
        });

        repairs[toCamelCase(baseFileName)] = { volume, percent };
    });

    saveJson(filename, repairs);
}

convertRepairData();
