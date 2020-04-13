/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-dir
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
var _a;
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
import { serverMaintenanceHour } from "./common-var";
const appRoot = (_a = process.env.PWD) !== null && _a !== void 0 ? _a : "";
const dirOut = path.resolve(appRoot, "public", "data");
const dirBuild = path.resolve(appRoot, "build");
const dirAPI = path.resolve(dirBuild, "API");
const dirModules = path.resolve(dirBuild, "Modules");
const dirSrc = path.resolve(appRoot, "src");
const dirLib = path.resolve(appRoot, "lib");
const dirGenServer = path.resolve(dirLib, "gen-server");
const dirGenGeneric = path.resolve(dirLib, "gen-generic");
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
    fileWood: path.resolve(dirGenGeneric, "woods.json"),
};
const getServerStartDateTime = () => {
    let serverStart = dayjs().utc().hour(serverMaintenanceHour).minute(0).second(0);
    if (dayjs.utc().isBefore(serverStart)) {
        serverStart = dayjs.utc(serverStart).subtract(1, "day");
    }
    return serverStart;
};
export const serverStartDateTime = getServerStartDateTime().format("YYYY-MM-DD HH:mm");
export const serverStartDate = getServerStartDateTime().format("YYYY-MM-DD");
const serverDateYear = String(dayjs(serverStartDate).year());
const serverDateMonth = String(dayjs(serverStartDate).month() + 1).padStart(2, "0");
export const baseAPIFilename = path.resolve(commonPaths.dirAPI, serverDateYear, serverDateMonth);
//# sourceMappingURL=common-dir.js.map