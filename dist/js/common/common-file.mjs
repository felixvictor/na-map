/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-file
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { exec, execSync } from "child_process";
import { default as fs, promises as pfs } from "fs";
import path from "path";
import { promisify } from "util";
import { apiBaseFiles, serverNames } from "./common-var";
import { baseAPIFilename, serverStartDate } from "./common-dir";
const execP = promisify(exec);
export const fileExists = (fileName) => fs.existsSync(fileName);
export const makeDirAsync = async (dir) => {
    await pfs.mkdir(dir, { recursive: true });
};
export const saveJsonAsync = async (fileName, data) => {
    await makeDirAsync(path.dirname(fileName));
    await pfs.writeFile(fileName, JSON.stringify(data), { encoding: "utf8" });
};
export const saveTextFile = (fileName, data) => fs.writeFileSync(fileName, data, { encoding: "utf8" });
export const readTextFile = (fileName) => {
    let data = "";
    try {
        data = fs.readFileSync(fileName, { encoding: "utf8" });
    }
    catch (error) {
        if (error.code === "ENOENT") {
            console.error("File", fileName, "not found");
        }
        else {
            throw error;
        }
    }
    return data;
};
export const readJson = (fileName) => JSON.parse(readTextFile(fileName));
const fileExistsAsync = async (fileName) => Boolean(await fs.promises.stat(fileName).catch(() => false));
export const xzAsync = async (command, fileName) => {
    const fileExists = await fileExistsAsync(fileName);
    if (fileExists) {
        await execP(`${command} ${fileName}`);
    }
    return true;
};
export const xz = (command, fileName) => {
    if (fs.existsSync(fileName)) {
        execSync(`${command} ${fileName}`);
    }
};
const loopApiFiles = (command) => {
    const ext = command === "xz" ? "json" : "json.xz";
    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverStartDate}.${ext}`);
            xz(command, fileName);
        }
    }
};
export const compressApiData = () => {
    loopApiFiles("xz");
};
export const uncompressApiData = () => {
    loopApiFiles("unxz");
};
export const checkFetchStatus = (response) => {
    if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response);
    }
    return Promise.reject(new Error(response.statusText));
};
export const getJsonFromFetch = (response) => response.json();
export const getTextFromFetch = (response) => response.text();
export const putFetchError = (error) => {
    console.error("Request failed -->", error);
};
//# sourceMappingURL=common-file.js.map