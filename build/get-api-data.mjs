#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Get api data.
 * @module    get-api-data
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs";
import * as path from "path";
import { default as nodeFetch } from "node-fetch";

import {
    apiBaseFiles,
    baseAPIFilename,
    makeDirAsync,
    saveJson,
    serverNames,
    serverStartDate as serverDate,
    sortId
} from "./common.mjs";

const sourceBaseUrl = "https://storage.googleapis.com/";
const sourceBaseDir = "nacleanopenworldprodshards";
const serverBaseName = "cleanopenworldprod";
// http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms

/**
 * Delete file (ignore if file does not exist)
 * @param {string} fileName - File name
 * @return {void}
 */
const deleteFile = fileName => {
    fs.unlink(fileName, error => {
        if (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    });
};

/**
 * Delete API data (uncompressed and compressed)
 * @param {string} fileName - File name
 * @return {Promise<boolean>}
 */
const deleteAPIFiles = async fileName => {
    await deleteFile(fileName);
    await deleteFile(`${fileName}.xz`);
    return true;
};

/**
 * Download Naval Action API data
 * @param {Url} url - Download url
 * @return {Promise<Error|any>}
 */
const readNAJson = async url => {
    try {
        const response = await nodeFetch(url);
        if (response.ok) {
            const text = (await response.text()).replace(/^var .+ = /, "").replace(/;$/, "");
            const json = await JSON.parse(text);
            return json;
        }

        return new Error(`Cannot load ${url}: ${response.statusText}`);
    } catch (error) {
        throw error;
    }
};

/**
 * Load API data and save sorted data
 * @param {string} serverName
 * @param {string} apiBaseFile
 * @param {string} outfileName
 * @return {Promise<boolean>}
 */
const getAPIDataAndSave = async (serverName, apiBaseFile, outfileName) => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`);
    const data = await readNAJson(url);

    if (data instanceof Error) {
        throw data;
    }

    data.sort(sortId);
    await saveJson(outfileName, data);
    return true;
};

/**
 * Load data for all servers and data files
 * @param {string} baseAPIFilename
 * @return {Promise<boolean>}
 */
const getApiData = async baseAPIFilename => {
    const deletePromise = [];
    const getPromise = [];
    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const outfileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverDate}.json`);
            deletePromise.push(deleteAPIFiles(outfileName));
            getPromise.push(getAPIDataAndSave(serverName, apiBaseFile, outfileName));
        }
    }

    await Promise.all(deletePromise);
    await Promise.all(getPromise);
    return true;
};

makeDirAsync(baseAPIFilename);
getApiData(baseAPIFilename);
