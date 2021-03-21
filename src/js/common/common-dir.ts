/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-dir
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "path"
import { currentServerDateMonth, currentServerDateYear } from "./common"

// https://stackoverflow.com/a/50052194
const appRoot = process.env.PWD ?? ""
const dirOut = path.resolve(appRoot, "public", "data")
const dirBuild = path.resolve(appRoot, "build")
const dirAPI = path.resolve(dirBuild, "API")
const dirModules = path.resolve(dirBuild, "Modules")
const dirSrc = path.resolve(appRoot, "src")
const dirLib = path.resolve(dirSrc, "lib")
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

    filePbSheet: path.resolve(dirGenGeneric, "port-battle.xlsx"),
    filePortBonusCSV: path.resolve(dirGenServer, "eu1-port-bonus.csv"),
    filePortBonus: path.resolve(dirGenServer, "eu1-port-bonus.json"),

    fileBuilding: path.resolve(dirGenGeneric, "buildings.json"),
    fileCannon: path.resolve(dirGenGeneric, "cannons.json"),
    fileLoot: path.resolve(dirGenGeneric, "loot.json"),
    fileModules: path.resolve(dirGenGeneric, "modules.json"),
    filePbZone: path.resolve(dirGenGeneric, "pb-zones.json"),
    filePort: path.resolve(dirGenGeneric, "ports.json"),
    filePrices: path.resolve(dirGenGeneric, "prices.json"),
    fileRecipe: path.resolve(dirGenGeneric, "recipes.json"),
    fileRepair: path.resolve(dirGenGeneric, "repairs.json"),
    fileShip: path.resolve(dirGenGeneric, "ships.json"),
    fileShipBlueprint: path.resolve(dirGenGeneric, "ship-blueprints.json"),
    fileWood: path.resolve(dirGenGeneric, "woods.json"),
}

export const baseAPIFilename = path.resolve(commonPaths.dirAPI, currentServerDateYear, currentServerDateMonth)
