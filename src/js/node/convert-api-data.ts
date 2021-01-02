/*!
 * This file is part of na-map.
 *
 * @file      Convert API data.
 * @module    convert-api-data
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { compressApiData, uncompressApiData } from "../common/common-file"

import { convertBuildingData } from "./convert-buildings"
import { convertCannons } from "./convert-cannons"
import { convertGenericPortData } from "./convert-generic-port-data"
import { convertLootData } from "./convert-loot"
import { convertModules } from "./convert-modules"
import { convertRecipeData } from "./convert-recipes"
import { convertRepairData } from "./convert-module-repair-data"
import { convertOwnershipData } from "./convert-ownership"
import { convertServerPortData } from "./convert-server-port-data"
import { convertShipData } from "./convert-ship-data"
import { createPortBattleSheet } from "./create-pb-sheets"

const runType = process.argv[2] || "client"

const convertApiData = async (): Promise<void> => {
    await convertBuildingData()
    await convertCannons()
    convertGenericPortData()
    convertLootData()
    convertModules()
    convertRecipeData()
    await convertRepairData()
    convertServerPortData()
    if (runType.endsWith("server")) {
        void (await convertOwnershipData())
    }

    await convertShipData()
}

const convert = async (): Promise<void> => {
    uncompressApiData()
    await convertApiData()
    await createPortBattleSheet()
    compressApiData()
}

void convert()
