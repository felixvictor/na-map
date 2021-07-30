/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-dir
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
const buildPath = (...args) => {
    return args
        .map((part, i) => {
        if (i === 0) {
            return part.trim().replace(/\/*$/g, "");
        }
        return part.trim().replace(/(^\/*|\/*$)/g, "");
    })
        .filter((x) => x.length)
        .join("/");
};
export function getCommonPaths(appRoot = process.env.PWD ?? "") {
    const dirOutput = buildPath(appRoot, "public");
    const dirBuild = buildPath(appRoot, "build");
    const dirAPI = buildPath(dirBuild, "API");
    const dirLib = buildPath(appRoot, "lib");
    const dirGenServer = buildPath(dirLib, "gen-server");
    const dirGenGeneric = buildPath(dirLib, "gen-generic");
    const dirSrc = buildPath(appRoot, "src");
    return {
        dirOutput,
        dirDataOut: buildPath(dirOutput, "data"),
        dirBuild,
        dirAPI,
        dirModules: buildPath(dirBuild, "Modules"),
        dirSrc,
        dirLib,
        dirGenServer,
        dirGenGeneric,
        filePortBonusCSV: buildPath(dirGenServer, "eu1-port-bonus.csv"),
        filePortBonus: buildPath(dirGenServer, "eu1-port-bonus.json"),
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
    };
}
//# sourceMappingURL=common-dir.js.map