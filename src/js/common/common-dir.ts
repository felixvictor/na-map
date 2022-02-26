/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-dir
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://stackoverflow.com/a/46427607
const buildPath = (...args: string[]) => {
    return args
        .map((part, i) => {
            if (i === 0) {
                return part.trim().replace(/\/*$/g, "")
            }

            return part.trim().replace(/(^\/*|\/*$)/g, "")
        })
        .filter((x) => x.length)
        .join("/")
}

// https://stackoverflow.com/a/50052194

interface DirList {
    dirAPI: string
    dirBuild: string
    dirDataOut: string
    dirGenGeneric: string
    dirGenServer: string
    dirLib: string
    dirModules: string
    dirOutput: string
    dirSrc: string
    dirWebpack: string
    fileBuilding: string
    fileCannon: string
    fileLoot: string
    fileModules: string
    filePbSheet: string
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
    const dirOutput = buildPath(appRoot, "public")
    const dirBuild = buildPath(appRoot, "build")
    const dirAPI = buildPath(dirBuild, "API")
    const dirLib = buildPath(appRoot, "lib")
    const dirGenServer = buildPath(dirLib, "gen-server")
    const dirGenGeneric = buildPath(dirLib, "gen-generic")
    const dirSrc = buildPath(appRoot, "src")
    const dirWebpack = buildPath(appRoot, "webpack")

    return {
        dirAPI,
        dirBuild,
        dirDataOut: buildPath(dirOutput, "data"),
        dirGenGeneric,
        dirGenServer,
        dirLib,
        dirModules: buildPath(dirBuild, "Modules"),
        dirOutput,
        dirSrc,
        dirWebpack,

        fileBuilding: buildPath(dirGenGeneric, "buildings.json"),
        fileCannon: buildPath(dirGenGeneric, "cannons.json"),
        fileLoot: buildPath(dirGenGeneric, "loot.json"),
        fileModules: buildPath(dirGenGeneric, "modules.json"),
        filePbSheet: buildPath(dirGenGeneric, "port-battle.xlsx"),
        filePbZone: buildPath(dirGenGeneric, "pb-zones.json"),
        filePort: buildPath(dirGenGeneric, "ports.json"),
        filePrices: buildPath(dirGenGeneric, "prices.json"),
        fileRecipe: buildPath(dirGenGeneric, "recipes.json"),
        fileRepair: buildPath(dirGenGeneric, "repairs.json"),
        fileShip: buildPath(dirGenGeneric, "ships.json"),
        fileShipBlueprint: buildPath(dirGenGeneric, "ship-blueprints.json"),
        fileWood: buildPath(dirGenGeneric, "woods.json"),
    }
}
