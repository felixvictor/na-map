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
};
uncompressApiData();
convertApiData();
compressApiData();
