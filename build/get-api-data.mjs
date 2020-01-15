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

import { apiBaseFiles, saveJson, serverNames, serverStartDate as serverDate, sortId } from "./common.mjs";

const sourceBaseUrl = "https://storage.googleapis.com/";
const sourceBaseDir = "nacleanopenworldprodshards";
const serverBaseName = "cleanopenworldprod";
// http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms

// console.log(commonPaths);
// console.log(serverDate);

const deleteFile = fileName => {
    try {
        if (fs.existsSync(fileName)) {
            fs.unlinkSync(fileName);
        }
    } catch (error) {
        throw error;
    }
};

const deleteAPIFiles = fileName => {
    deleteFile(fileName);
    deleteFile(`${fileName}.xz`);
};

const readNAJson = async url => {
    try {
        const response = await nodeFetch(url);
        if (response.ok) {
            const text = await response.text();
            const json = await JSON.parse(text.replace(/^var .+ = /, "").replace(/;$/, ""));
            return json;
        }

        return new Error(`Cannot load ${url}: ${response.statusText}`);
    } catch (error) {
        throw error;
    }
};

const getAPIDataAndSave = async (serverName, apiBaseFile, outfileName) => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`);
    const data = await readNAJson(url);
    if (data instanceof Error) {
        throw new TypeError(data);
    } else {
        await data.sort(sortId);
        console.log(serverName, apiBaseFile, outfileName, data[0].Id, data[0].Name);
        await saveJson(outfileName, data);
    }
};

export const getApiData = outBaseFilename => {
    serverNames.forEach(serverName => {
        apiBaseFiles.forEach(apiBaseFile => {
            const outfileName = path.resolve(outBaseFilename, `${serverName}-${apiBaseFile}-${serverDate}.json`);
            console.log(outfileName);
            deleteAPIFiles(outfileName);
            getAPIDataAndSave(serverName, apiBaseFile, outfileName);
        });
    });
};

/*
const yearRegex = /^api-.+-(\d{4})-\d{2}-\d{2}\.json(\.xz)?$/;
const monthRegex = /^api-.+-\d{4}-(\d{2})-\d{2}\.json(\.xz)?$/;
const dirAPI = path.resolve(commonPaths.dirBuild, "API");

const moveFile = fileName => {
    if (fileName.match(yearRegex)) {
        const year = fileName.match(yearRegex)[1];
        const month = fileName.match(monthRegex)[1];
        console.log(year, month);
        const dirNew = path.resolve(dirAPI, year, month);
        console.log(path.resolve(dirAPI, fileName), path.resolve(dirNew, fileName));
        fs.rename(path.resolve(dirAPI, fileName), path.resolve(dirNew, fileName), err => {
            if (err) {
                throw err;
            }
        });
    }
};

fs.readdirSync(dirAPI).forEach(fileName => {
    moveFile(fileName);
});
*/
