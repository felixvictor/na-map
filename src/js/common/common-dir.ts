/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-dir
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://stackoverflow.com/a/50052194

interface DirList {
    dirOutput: string
    dirDataOut: string
    dirBuild: string
    dirAPI: string
    dirModules: string
    dirSrc: string
    dirLib: string
    dirGenServer: string
    dirGenGeneric: string
    fileTwitterRefreshId: string
    filePbSheet: string
    filePortBonusCSV: string
    filePortBonus: string
    fileBuilding: string
    fileCannon: string
    fileLoot: string
    fileModules: string
    filePbZone: string
    filePort: string
    filePrices: string
    fileRecipe: string
    fileRepair: string
    fileShip: string
    fileShipBlueprint: string
    fileWood: string
}

/**
 * Build common paths and file names
 */
export function getCommonPaths(appRoot = process.env.PWD ?? ""): DirList {
    const dirOutput = appRoot + "/public"
    const dirBuild = appRoot + "/build"
    const dirAPI = dirBuild + "/API"
    const dirLib = appRoot + "/lib"
    const dirGenServer = dirLib + "/gen-server"
    const dirGenGeneric = dirLib + "/gen-generic"

    return {
        dirOutput,
        dirDataOut: dirOutput + "/data",
        dirBuild,
        dirAPI,
        dirModules: dirBuild + "/Modules",
        dirSrc: appRoot + "/src",
        dirLib,
        dirGenServer,
        dirGenGeneric,

        fileTwitterRefreshId: dirAPI + "/response-id.txt",

        filePbSheet: dirGenGeneric + "/port-battle.xlsx",
        filePortBonusCSV: dirGenServer + "/eu1-port-bonus.csv",
        filePortBonus: dirGenServer + "/eu1-port-bonus.json",

        fileBuilding: dirGenGeneric + "/buildings.json",
        fileCannon: dirGenGeneric + "/cannons.json",
        fileLoot: dirGenGeneric + "/loot.json",
        fileModules: dirGenGeneric + "/modules.json",
        filePbZone: dirGenGeneric + "/pb-zones.json",
        filePort: dirGenGeneric + "/ports.json",
        filePrices: dirGenGeneric + "/prices.json",
        fileRecipe: dirGenGeneric + "/recipes.json",
        fileRepair: dirGenGeneric + "/repairs.json",
        fileShip: dirGenGeneric + "/ships.json",
        fileShipBlueprint: dirGenGeneric + "/ship-blueprints.json",
        fileWood: dirGenGeneric + "/woods.json",
    }
}
