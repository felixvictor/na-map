/**
 * This file is part of na-map.
 *
 * @file      Convert repair data from modules.
 * @module    build/convert-module-repair
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import convert from "xml-js";
import { commonPaths, readTextFile, saveJsonAsync } from "./common.mjs";

/**
 * Change string from snake case to camelCase
 *
 * @param {string} str Input snake case string
 * @return {string} Output camel case string
 */
function toCamelCase(str) {
    str = str.replace(/[\s-_]+(.)?/g, (match, ch) => (ch ? ch.toUpperCase() : ""));

    // Ensure first char is always lowercase
    return str.slice(0, 1).toLowerCase() + str.slice(1);
}

const baseFileNames = ["armor repair", "sail repair", "crew repair"];

const getFileData = (baseFileName, ext) => {
    const fileName = path.resolve(commonPaths.dirModules, `${baseFileName} ${ext}.xml`);
    const fileXmlData = readTextFile(fileName);

    return convert.xml2js(fileXmlData, { compact: true });
};

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 * @returns {void}
 */
export const convertRepairData = () => {
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

    saveJsonAsync(commonPaths.fileRepair, repairs);
};
