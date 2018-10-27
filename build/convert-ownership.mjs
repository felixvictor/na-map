/**
 * This file is part of na-map.
 *
 * @file      Convert port ownership.
 * @module    convert-ownership
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* eslint-disable import/no-extraneous-dependencies, import/no-named-default */

import * as fs from "fs";
import * as path from "path";
import { default as lzma } from "lzma-native";
import { default as readDirRecursive } from "recursive-readdir";

// eslint-disable-next-line import/extensions
import { capitalToCounty, nations, saveJson } from "./common.mjs";

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

const inDir = process.argv[2],
    outFileName = process.argv[3];

const fileBaseName = "api-eu1-Ports",
    fileExtension = ".json.xz";

/**
 * Retrieve port data for nation/clan ownership
 * @returns {void}
 */
function convertOwnership() {
    const ports = new Map(),
        fileBaseNameRegex = new RegExp(`${fileBaseName}-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`);
    let currentPortData = {};

    /**
     * Parse data and construct ports Map
     * @param {object} portData - Port data
     * @param {string} date - current date
     * @return {void}
     */
    function parseData(portData, date) {
        // console.log("**** new date", date);

        // Store for later use
        currentPortData = portData;
        currentPortData.forEach(port => {
            /**
             * Get data object
             * @return {{timeRange: string[], val: (string)}} - Object
             */
            function getObject() {
                return { timeRange: [date, date], val: nations[port.Nation].short };
            }

            /**
             * Set initial data
             * @return {void}
             */
            function initData() {
                ports.set(port.Id, [getObject()]);
            }

            /**
             * Get previous nation short name
             * @return {string} - nation short name
             */
            const getPreviousNation = () => {
                const index = ports.get(port.Id).length - 1;
                return ports.get(port.Id)[index].val;
            };

            /**
             * Add new nation entry
             * @return {void}
             */
            function setNewNation() {
                const data = ports.get(port.Id);
                data.push(getObject());
                ports.set(port.Id, data);
                // console.log("setNewNation -> ", ports.get(port.Id));
            }

            /**
             * Change end date for current nation
             * @return {void}
             */
            function setNewEndDate() {
                const data = ports.get(port.Id);
                data[data.length - 1].timeRange[1] = date;
                ports.set(port.Id, data);
                // console.log("setNewEndDate -> ", ports.get(port.Id));
            }

            if (!ports.get(port.Id)) {
                //  console.log(ports.get(port.Id));
                initData();
            } else {
                const currentNation = nations[port.Nation].short,
                    oldNation = getPreviousNation();
                if (currentNation !== oldNation) {
                    // console.log("new nation", port.Id, currentNation, oldNation);
                    setNewNation();
                } else {
                    setNewEndDate();
                }
            }
        });
        // console.log("**** 138 -->", ports.get("138"));
    }

    /**
     * Decompress file content
     * @param {Buffer} compressedContent - Compressed file content
     * @return {Buffer|void} - Decompressed file content or error
     */
    function decompress(compressedContent) {
        return lzma.decompress(compressedContent, (decompressedContent, error) => {
            if (error) {
                throw new Error(error);
            }
            return decompressedContent;
        });
    }

    /**
     * Read file content
     * @param {string} fileName - File name
     * @return {Promise<any>} - Promise
     */
    function readFileContent(fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * Process all files
     * @param {string[]} fileNames - File names
     * @return {*} - Resolved promise
     */
    function processFiles(fileNames) {
        return fileNames.reduce(
            (sequence, fileName) =>
                sequence
                    .then(() => readFileContent(fileName))
                    .then(compressedContent => decompress(compressedContent))
                    .then(decompressedContent =>
                        parseData(
                            JSON.parse(decompressedContent.toString()),
                            path.basename(fileName).match(fileBaseNameRegex)[1]
                        )
                    ),
            Promise.resolve()
        );
    }

    /**
     * Check if file should be ignored
     * @param {string} fileName - File name
     * @param {*} stats - Stat
     * @return {boolean} - True if file should be ignored
     */
    function ignoreFileName(fileName, stats) {
        return !stats.isDirectory() && path.basename(fileName).match(fileBaseNameRegex) === null;
    }

    /**
     * Sort file names
     * @param {string[]} fileNames - File names
     * @return {string[]} - Sorted file names
     */
    function sortFileNames(fileNames) {
        return fileNames.sort((a, b) => {
            const ba = path.basename(a),
                bb = path.basename(b);
            if (ba < bb) {
                return -1;
            }
            if (ba > bb) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * Write out result
     * @return {void}
     */
    function writeResult() {
        let data = [];
        const counties = new Map(),
            result = [];

        currentPortData.forEach(port => {
            /**
             * Get data object
             * @return {{id: {string}, name: {string}}} - Object
             */
            function getObject() {
                return {
                    id: port.Id,
                    name: port.Name.replaceAll("'", "’"),
                    region: port.Location
                };
            }

            // Exclude free towns
            if (port.Nation !== 9) {
                let county = capitalToCounty.get(port.CountyCapitalName);
                county = county || "";

                if (!counties.has(county)) {
                    data = [getObject()];
                } else {
                    data = counties.get(county);
                    data.push(getObject());
                }

                counties.set(county, data);
            }
        });

        counties.forEach((value, key) => {
            const county = {
                group: key,
                region: value[0].region,
                data: value.map(port => ({
                    label: port.name,
                    data: ports.get(port.id)
                }))
            };

            result.push(county);
        });

        saveJson(outFileName, result);
    }

    readDirRecursive(inDir, [ignoreFileName])
        .then(fileNames => sortFileNames(fileNames))
        .then(fileNames => processFiles(fileNames))
        .then(() => writeResult())
        .catch(error => {
            throw new Error(error);
        });
}

convertOwnership();
