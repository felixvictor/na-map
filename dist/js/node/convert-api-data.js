import { compressApiData, uncompressApiData } from "./common-node";
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
uncompressApiData();
convertApiData();
createPortBattleSheet();
compressApiData();
