"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommonPaths = void 0;
/**
 * Build common paths and file names
 */
function getCommonPaths(appRoot) {
    var _a;
    if (appRoot === void 0) { appRoot = (_a = process.env.PWD) !== null && _a !== void 0 ? _a : ""; }
    var dirOutput = appRoot + "/public";
    var dirBuild = appRoot + "/build";
    var dirAPI = dirBuild + "/API";
    var dirLib = appRoot + "/lib";
    var dirGenServer = dirLib + "/gen-server";
    var dirGenGeneric = dirLib + "/gen-generic";
    return {
        dirOutput: dirOutput,
        dirDataOut: dirOutput + "/data",
        dirBuild: dirBuild,
        dirAPI: dirAPI,
        dirModules: dirBuild + "/Modules",
        dirSrc: appRoot + "/src",
        dirLib: dirLib,
        dirGenServer: dirGenServer,
        dirGenGeneric: dirGenGeneric,
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
    };
}
exports.getCommonPaths = getCommonPaths;
