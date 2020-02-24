import * as fs from "fs";
import * as path from "path";
import { default as nodeFetch } from "node-fetch";
import { apiBaseFiles, saveJsonAsync, serverNames, sortId } from "../common";
import { baseAPIFilename, serverStartDate as serverDate, xzAsync } from "./common-node";
const sourceBaseUrl = "https://storage.googleapis.com/";
const sourceBaseDir = "nacleanopenworldprodshards";
const serverBaseName = "cleanopenworldprod";
const deleteFile = (fileName) => {
    fs.unlink(fileName, error => {
        if ((error === null || error === void 0 ? void 0 : error.code) !== "ENOENT") {
            throw error;
        }
    });
};
const deleteAPIFiles = async (fileName) => {
    await deleteFile(fileName);
    await deleteFile(`${fileName}.xz`);
    return true;
};
const readNAJson = async (url) => {
    try {
        const response = await nodeFetch(url);
        if (response.ok) {
            const text = (await response.text()).replace(/^var .+ = /, "").replace(/;$/, "");
            return await JSON.parse(text);
        }
        return new Error(`Cannot load ${url}: ${response.statusText}`);
    }
    catch (error) {
        throw error;
    }
};
const getAPIDataAndSave = async (serverName, apiBaseFile, outfileName) => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`);
    const data = await readNAJson(url);
    if (data instanceof Error) {
        throw data;
    }
    await data.sort(sortId);
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
