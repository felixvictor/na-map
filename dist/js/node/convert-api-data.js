import { compressApiData, uncompressApiData } from "./common-node";
import { convertBuildingData } from "./convert-buildings";
import { convertCannons } from "./convert-cannons";
import { convertGenericPortData } from "./convert-generic-port-data";
import { convertLootData } from "./convert-loot";
const convertApiData = async () => {
    convertBuildingData();
    convertCannons();
    convertGenericPortData();
    convertLootData();
};
uncompressApiData();
convertApiData();
compressApiData();
