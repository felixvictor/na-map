import { compressApiData, uncompressApiData } from "./common-node";
import { convertBuildingData } from "./convert-buildings";
import { convertCannons } from "./convert-cannons";
const runType = process.argv[2] || "client";
const convertApiData = async () => {
    convertBuildingData();
    convertCannons();
};
uncompressApiData();
convertApiData();
compressApiData();
