/**
 * This file is part of na-map.
 *
 * @file      Get api data.
 * @module    get-api-data
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import * as path from "path"
import { default as nodeFetch } from "node-fetch"

import { apiBaseFiles, saveJsonAsync, serverNames, sortId } from "../common"
import { baseAPIFilename, serverStartDate as serverDate, xzAsync } from "./common-node"

const sourceBaseUrl = "https://storage.googleapis.com/"
const sourceBaseDir = "nacleanopenworldprodshards"
const serverBaseName = "cleanopenworldprod"
// http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms

/**
 * Delete file (ignore if file does not exist)
 * @param fileName - File name
 */
const deleteFile = (fileName: string): void => {
    fs.unlink(fileName, error => {
        if (error?.code !== "ENOENT") {
            throw error
        }
    })
}

/**
 * Delete API data (uncompressed and compressed)
 * @param fileName - File name
 */
const deleteAPIFiles = async (fileName: string): Promise<boolean> => {
    await deleteFile(fileName)
    await deleteFile(`${fileName}.xz`)
    return true
}

/**
 * Download Naval Action API data
 * @param url - Download url
 */
const readNAJson = async (url: URL): Promise<Error | any> => {
    try {
        const response = await nodeFetch(url)
        if (response.ok) {
            const text = (await response.text()).replace(/^var .+ = /, "").replace(/;$/, "")
            return await JSON.parse(text)
        }

        return new Error(`Cannot load ${url}: ${response.statusText}`)
    } catch (error) {
        throw error
    }
}

/**
 * Load API data and save sorted data
 */
const getAPIDataAndSave = async (serverName: string, apiBaseFile: string, outfileName: string): Promise<boolean> => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`)
    const data = await readNAJson(url)

    if (data instanceof Error) {
        throw data
    }

    await data.sort(sortId)
    await saveJsonAsync(outfileName, data)
    await xzAsync("xz", outfileName)

    return true
}

/**
 * Load data for all servers and data files
 */
const loadData = async (baseAPIFilename: string): Promise<boolean> => {
    const deletePromise = []
    const getPromise = []
    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const outfileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverDate}.json`)

            deletePromise.push(deleteAPIFiles(outfileName))
            getPromise.push(getAPIDataAndSave(serverName, apiBaseFile, outfileName))
        }
    }

    await Promise.all(deletePromise)
    await Promise.all(getPromise)

    return true
}

// noinspection JSIgnoredPromiseFromCall
loadData(baseAPIFilename)
