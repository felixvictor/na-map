var _a;
import { exec, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
const execP = promisify(exec);
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
import { apiBaseFiles, serverNames } from "../common";
export const serverMaintenanceHour = 10;
export const distanceMapSize = 4096;
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
const fileExistsAsync = async (fileName) => !!(await fs.promises.stat(fileName).catch(() => false));
export const xzAsync = async (command, fileName) => {
    const fileExists = await fileExistsAsync(fileName);
    if (fileExists) {
        await execP(`${command} ${fileName}`);
    }
    return true;
};
export const xz = (command, fileName) => {
    if (fs.existsSync(fileName)) {
        execSync(`${command} ${fileName}`);
    }
};
const loopApiFiles = (command) => {
    const ext = command === "xz" ? "json" : "json.xz";
    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverStartDate}.${ext}`);
            xz(command, fileName);
        }
    }
};
export const compressApiData = () => {
    loopApiFiles("xz");
};
export const uncompressApiData = () => {
    loopApiFiles("unxz");
};
