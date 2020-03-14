/*!
 * This file is part of na-map.
 *
 * @file      Convert API data.
 * @module    convert-api-data
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { compressApiData, uncompressApiData } from "../common/common-file";
import { convertBuildingData } from "./convert-buildings";
import { convertCannons } from "./convert-cannons";
import { convertGenericPortData } from "./convert-generic-port-data";
import { convertLootData } from "./convert-loot";
import { convertModules } from "./convert-modules";
import { convertRecipeData } from "./convert-recipes";
import { convertRepairData } from "./convert-module-repair-data";
import { convertOwnershipData } from "./convert-ownership";
import { convertServerPortData } from "./convert-server-port-data";
import { convertShipData } from "./convert-ship-data";
import { createPortBattleSheet } from "./create-pb-sheets";
const runType = process.argv[2] || "client";
const convertApiData = async () => {
    convertBuildingData();
    convertCannons();
    convertGenericPortData();
    convertLootData();
    convertModules();
    convertRecipeData();
    convertRepairData();
    convertServerPortData();
    if (runType.endsWith("server")) {
        convertOwnershipData();
    }
    await convertShipData();
};
const convert = async () => {
    uncompressApiData();
    await convertApiData();
    createPortBattleSheet();
    compressApiData();
};
convert();
//# sourceMappingURL=convert-api-data.js.map