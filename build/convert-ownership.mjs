/**
 * This file is part of na-map.
 *
 * @file      Convert port ownership.
 * @module    convert-ownership
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs";
import * as path from "path";
import d3Node from "d3-node";
import { default as lzma } from "lzma-native";
import { default as readDirRecursive } from "recursive-readdir";

import { capitalToCounty, cleanName, nations, saveJson } from "./common.mjs";

const inDir = process.argv[2];
const fileBaseName = process.argv[3];
const outFileNameTimelinePorts = process.argv[4];
const outFileNameTimelineDates = process.argv[5];

const fileExtension = ".json.xz";

const d3n = d3Node();
const { d3 } = d3n;

/**
 * Retrieve port data for nation/clan ownership
 * @returns {void}
 */
function convertOwnership() {
    const ports = new Map();
    const numPortsDates = [];
    const fileBaseNameRegex = new RegExp(`${fileBaseName}-(20\\d{2}-\\d{2}-\\d{2})${fileExtension}`);

    /**
     * Parse data and construct ports Map
     * @param {object} portData - Port data
     * @param {string} date - current date
     * @return {void}
     */
    function parseData(portData, date) {
        // console.log("**** new date", date);

        const numPorts = [];
        nations
            .filter(nation => nation.id !== 9)
            .forEach(nation => {
                numPorts[nation.short] = 0;
            });

        portData.forEach(port => {
            /**
             * Get data object
             * @return {{timeRange: string[], val: (string)}} - Object
             */
            function getObject() {
                return {
                    timeRange: [date, date],
                    val: nations[port.Nation].short,
                    labelVal: nations[port.Nation].sortName
                };
            }

            /**
             * Set initial data
             * @return {void}
             */
            function initData() {
                ports.set(port.Id, {
                    name: cleanName(port.Name),
                    region: port.Location,
                    county: capitalToCounty.get(port.CountyCapitalName) || "",
                    data: [getObject()]
                });
            }

            /**
             * Get previous nation short name
             * @return {string} - nation short name
             */
            const getPreviousNation = () => {
                const index = ports.get(port.Id).data.length - 1;
                return ports.get(port.Id).data[index].val;
            };

            /**
             * Add new nation entry
             * @return {void}
             */
            function setNewNation() {
                // console.log("setNewNation -> ", ports.get(port.Id));
                const values = ports.get(port.Id);
                values.data.push(getObject());
                ports.set(port.Id, values);
            }

            /**
             * Change end date for current nation
             * @return {void}
             */
            function setNewEndDate() {
                const values = ports.get(port.Id);
                // console.log("setNewEndDate -> ", ports.get(port.Id), values);
                values.data[values.data.length - 1].timeRange[1] = date;
                ports.set(port.Id, values);
            }

            // Exclude free towns
            if (port.Nation !== 9) {
                numPorts[nations[port.Nation].short] += 1;
                if (ports.get(port.Id)) {
                    // console.log("ports.get(port.Id)");
                    const currentNation = nations[port.Nation].short;
                    const oldNation = getPreviousNation();
                    if (currentNation === oldNation) {
                        setNewEndDate();
                    } else {
                        setNewNation();
                    }
                } else {
                    // console.log("!ports.get(port.Id)");
                    initData();
                }
            }
        });

        const numPortsDate = {};
        numPortsDate.date = date;
        nations
            .filter(nation => nation.id !== 9)
            .forEach(nation => {
                numPortsDate[nation.short] = numPorts[nation.short];
            });
        numPortsDates.push(numPortsDate);
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
                    )
                    .catch(error => {
                        throw new Error(error);
                    }),
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
            const ba = path.basename(a);
            const bb = path.basename(b);
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
        const portsArray = [...ports.entries()].map(([key, value]) => {
            value.id = key;
            return value;
        });

        // Nest by region and county
        const nested = d3
            .nest()
            .key(d => d.region)
            .sortKeys(d3.ascending)
            .key(d => d.county)
            .sortKeys(d3.ascending)
            .entries(portsArray);

        // Convert to data structure needed for timelines-chart
        // region
        // -- group (counties)
        //    -- label (ports)
        const result = nested.map(region => {
            const newRegion = {};
            newRegion.region = region.key;
            newRegion.data = region.values.map(county => {
                const group = {};
                group.group = county.key;
                group.data = county.values.map(port => {
                    const label = {};
                    label.label = port.name;
                    label.data = port.data;
                    return label;
                });
                return group;
            });
            return newRegion;
        });

        saveJson(outFileNameTimelinePorts, result);
        saveJson(outFileNameTimelineDates, numPortsDates);
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
