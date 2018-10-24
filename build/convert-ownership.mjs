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

import { nations } from "./common.mjs";
import {
    isEmpty,
    readJson,
    readTextFile,
    saveJson,
    checkFetchStatus,
    getJsonFromFetch,
    putFetchError
} from "./common.mjs";

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
    const apiFileNames = [];

    function parseData(portData, date) {
        console.log("**** new date", date);
        portData.forEach(port => {
            function initData() {
                ports.set(port.Id, [{ timeRange: [date, date], val: nations[port.Nation].short }]);
            }

            const getOldNation = () => {
                const index = ports.get(port.Id).length - 1;
                return ports.get(port.Id)[index].val;
            };

            function setNewNation() {
                const data = ports.get(port.Id);
                data.push({ timeRange: [date, date], val: nations[port.Nation].short });
                ports.set(port.Id, data);
                console.log("setNewNation -> ", ports.get(port.Id));
            }

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
                    oldNation = getOldNation();
                if (currentNation !== oldNation) {
                    console.log("new nation", port.Id, currentNation, oldNation);
                    setNewNation();
                } else {
                    setNewEndDate();
                }
            }
        });
        console.log("**** 138 -->", ports.get("138"));
    }

    /**
     *
     * @param {string} fileName - File name
     * @return {void}
     */
    const processFile = fileName => {
        console.log("++++ processFile", fileName);
        const compressedContent = fs.readFileSync(fileName, (errorReadFile, data) => {
            if (errorReadFile) {
                throw new Error(errorReadFile);
            }
            return data;
        });

        lzma.decompress(compressedContent, (decompressedContent, errorDecompress) => {
            if (errorDecompress) {
                throw new Error(errorDecompress);
            }
            parseData(JSON.parse(decompressedContent.toString()), path.basename(fileName).match(fileBaseNameRegex)[1]);
        });
    };

    function processFiles(fileNames) {
        let p = Promise.resolve(); // Q() in q

        fileNames.forEach(fileName => {
            p = p.then(() => {
                console.log(fileName);
                processFile(fileName);
            });
        });
        return p;
    }

    /*
    async function readFiles(files) {
        for (const file of files) {
            await readFile(file);
        }
    }
    */

    /**
     *
     * @param fileName
     * @return {boolean}
     */
    function ignoreFileName(fileName, stats) {
        return !stats.isDirectory() && path.basename(fileName).match(fileBaseNameRegex) === null;
    }

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

    function writeResult(bool) {
        console.log("out", bool, ports, Array.from(ports.values()));
        saveJson(outFileName, Array.from(ports.values()));
    }

    /**
     * Gets all files from directory <dir>
     * @param {string} dir - Directory
     * @returns {void}
     */
    readDirRecursive(inDir, [ignoreFileName])
        .then(fileNames => sortFileNames(fileNames))
        .then(fileNames => processFiles(fileNames))
        .then(bool => writeResult(bool))
        .catch(error => {
            throw new Error(error);
        });
}

convertOwnership();
