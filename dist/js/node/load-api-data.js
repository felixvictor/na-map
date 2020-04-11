/*!
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
import { baseAPIFilename, serverStartDate as serverDate } from "../common/common-dir";
import { apiBaseFiles, serverNames } from "../common/common-var";
import { saveJsonAsync, xzAsync } from "../common/common-file";
import { sortBy } from "../common/common-node";
const sourceBaseUrl = "https://storage.googleapis.com/";
const sourceBaseDir = "nacleanopenworldprodshards";
const serverBaseName = "cleanopenworldprod";
const deleteFile = (fileName) => {
    fs.unlink(fileName, (error) => {
        if (error && error.code !== "ENOENT") {
            throw new Error(`Error deleteFile: ${error.message}`);
        }
    });
};
const deleteAPIFiles = (fileName) => {
    deleteFile(fileName);
    deleteFile(`${fileName}.xz`);
};
const readNAJson = async (url) => {
    try {
        const response = await nodeFetch(url);
        if (response.ok) {
            const text = (await response.text()).replace(/^var .+ = /, "").replace(/;$/, "");
            return JSON.parse(text);
        }
        return new Error(`Cannot load ${url.href}: ${response.statusText}`);
    }
    catch (error) {
        throw new Error(error);
    }
};
const getAPIDataAndSave = async (serverName, apiBaseFile, outfileName) => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`);
    const data = await readNAJson(url);
    if (data instanceof Error) {
        throw data;
    }
    data.sort(sortBy(["Id"]));
    await saveJsonAsync(outfileName, data);
    await xzAsync("xz", outfileName);
    return true;
};
const loadData = async (baseAPIFilename) => {
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
loadData(baseAPIFilename);
//# sourceMappingURL=load-api-data.js.map