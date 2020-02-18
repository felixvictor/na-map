import path from "path";
import { fileURLToPath } from "url";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
export const serverMaintenanceHour = 10;
export const distanceMapSize = 4096;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dirOut = path.resolve(__dirname, "..", "public", "data");
const dirBuild = path.resolve(__dirname, "..", "build");
const dirAPI = path.resolve(__dirname, "..", "build", "API");
const dirModules = path.resolve(__dirname, "..", "build", "Modules");
const dirSrc = path.resolve(__dirname, "..", "src");
const dirGenServer = path.resolve(dirSrc, "gen-server");
const dirGenGeneric = path.resolve(dirSrc, "gen-generic");
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
};
const getServerStartDateTime = () => {
    let serverStart = dayjs()
        .utc()
        .hour(serverMaintenanceHour)
        .minute(0)
        .second(0);
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
