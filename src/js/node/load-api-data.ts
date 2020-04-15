/*!
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

import { baseAPIFilename, serverStartDate as serverDate } from "../common/common-dir"
import { apiBaseFiles, serverNames } from "../common/common-var"
import { saveJsonAsync, xzAsync } from "../common/common-file"
import { sortBy } from "../common/common-node"
import { APIItemGeneric } from "./api-item"
import { APIPort } from "./api-port"
import { APIShop } from "./api-shop"

type APIType = APIItemGeneric | APIPort | APIShop
const sourceBaseUrl = "https://storage.googleapis.com/"
const sourceBaseDir = "nacleanopenworldprodshards"
const serverBaseName = "cleanopenworldprod"
// http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms

/**
 * Delete file (ignore if file does not exist)
 * @param fileName - File name
 */
const deleteFile = (fileName: string): void => {
    fs.unlink(fileName, (error) => {
        if (error && error.code !== "ENOENT") {
            throw new Error(`Error deleteFile: ${error.message}`)
        }
    })
}

/**
 * Delete API data (uncompressed and compressed)
 * @param fileName - File name
 */
const deleteAPIFiles = (fileName: string): void => {
    deleteFile(fileName)
    deleteFile(`${fileName}.xz`)
}

/**
 * Download Naval Action API data
 * @param url - Download url
 */
const readNAJson = async (url: URL): Promise<Error | APIType[]> => {
    try {
        const response = await nodeFetch(url)
        if (response.ok) {
            const text = (await response.text()).replace(/^var .+ = /, "").replace(/;$/, "")
            return JSON.parse(text) as APIType[]
        }

        return new Error(`Cannot load ${url.href}: ${response.statusText}`)
    } catch (error) {
        throw new Error(error)
    }
}

/**
 * Load API data and save sorted data
 */
const getAPIDataAndSave = async (serverName: string, apiBaseFile: string, outfileName: string): Promise<boolean> => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`)
    const data: Error | APIType[] = await readNAJson(url)

    if (data instanceof Error) {
        throw data
    }

    data.sort(sortBy(["Id"]))
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
