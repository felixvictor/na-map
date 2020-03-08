/**
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-node
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { exec, execSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { promisify } from "util"
const execP = promisify(exec)

import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(utc)

import { apiBaseFiles, serverNames } from "../common"

export const serverMaintenanceHour = 10
export const distanceMapSize = 4096

// https://stackoverflow.com/a/50052194
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dirOut = path.resolve(__dirname, "..", "public", "data")
const dirBuild = path.resolve(__dirname, "..", "..", "..", "build")
const dirAPI = path.resolve(dirBuild, "API")
const dirModules = path.resolve(dirBuild, "Modules")
const dirSrc = path.resolve(__dirname, "..", "src")
const dirLib = path.resolve(__dirname, "..", "..", "..", "lib")
const dirGenServer = path.resolve(dirLib, "gen-server")
const dirGenGeneric = path.resolve(dirLib, "gen-generic")

/**
 * Build common paths and file names
 */
export const commonPaths = {
    dirAPI,
    dirBuild,
    dirGenGeneric,
    dirGenServer,
    dirModules,
    dirOut,
    dirSrc,

    fileTwitterRefreshId: path.resolve(dirAPI, "response-id.txt"),

    filePbSheet: path.resolve(dirGenServer, "port-battle.xlsx"),

    fileBuilding: path.resolve(dirGenGeneric, "buildings.json"),
    fileCannon: path.resolve(dirGenGeneric, "cannons.json"),
    fileLoot: path.resolve(dirGenGeneric, "loot.json"),
    fileModules: path.resolve(dirGenGeneric, "modules.json"),
    fileNation: path.resolve(dirGenGeneric, "nations.json"),
    fileOwnership: path.resolve(dirGenGeneric, "ownership.json"),
    filePbZone: path.resolve(dirGenGeneric, "pb-zones.json"),
    filePort: path.resolve(dirGenGeneric, "ports.json"),
    filePrices: path.resolve(dirGenGeneric, "prices.json"),
    fileRecipe: path.resolve(dirGenGeneric, "recipes.json"),
    fileRepair: path.resolve(dirGenGeneric, "repairs.json"),
    fileShip: path.resolve(dirGenGeneric, "ships.json"),
    fileShipBlueprint: path.resolve(dirGenGeneric, "ship-blueprints.json"),
    fileWood: path.resolve(dirGenGeneric, "woods.json")
}

/**
 * Get server start (date and time)
 */
const getServerStartDateTime = (): dayjs.Dayjs => {
    let serverStart = dayjs()
        .utc()
        .hour(serverMaintenanceHour)
        .minute(0)
        .second(0)

    // adjust reference server time if needed
    if (dayjs.utc().isBefore(serverStart)) {
        serverStart = dayjs.utc(serverStart).subtract(1, "day")
    }

    return serverStart
}

export const serverStartDateTime = getServerStartDateTime().format("YYYY-MM-DD HH:mm")
export const serverStartDate = getServerStartDateTime().format("YYYY-MM-DD")
const serverDateYear = String(dayjs(serverStartDate).year())
const serverDateMonth = String(dayjs(serverStartDate).month() + 1).padStart(2, "0")
export const baseAPIFilename = path.resolve(commonPaths.dirAPI, serverDateYear, serverDateMonth)

/**
 * {@link https://stackoverflow.com/a/57708635}
 */
const fileExistsAsync = async (fileName: string): Promise<boolean> =>
    !!(await fs.promises.stat(fileName).catch(() => false))

export const xzAsync = async (command: string, fileName: string): Promise<boolean> => {
    const fileExists = await fileExistsAsync(fileName)

    if (fileExists) {
        await execP(`${command} ${fileName}`)
    }
    return true
}

const xz = (command: string, fileName: string): void => {
    if (fs.existsSync(fileName)) {
        execSync(`${command} ${fileName}`)
    }
}

const loopApiFiles = (command: string): void => {
    const ext = command === "xz" ? "json" : "json.xz"

    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverStartDate}.${ext}`)
            xz(command, fileName)
        }
    }
}

export const compressApiData = (): void => {
    loopApiFiles("xz")
}

export const uncompressApiData = (): void => {
    loopApiFiles("unxz")
}
