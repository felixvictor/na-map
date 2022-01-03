/*!
 * This file is part of na-map.
 *
 * @file      Convert setModules.
 * @module    src/node/convert-setModules
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "node:path"

import { currentServerStartDate as serverDate } from "../../common/common"
import { baseAPIFilename, cleanName } from "../../common/common-node"
import { readJson } from "../../common/common-file"
import { serverIds } from "../../common/servers"

import { APIItemGeneric, APIModule } from "../api-item"
import { ModuleConvertEntity } from "../../common/gen-json"

import { levels, notUsedExceptionalWoodIds, notUsedModules, usedModules } from "./common"
import { saveModules, setModule } from "./module"
import { saveWoods, setWood } from "./wood"

let apiItems: APIItemGeneric[]
const addedModules = new Set<string>()

const isDoubleEntry = (module: ModuleConvertEntity): boolean => addedModules.has(module.name + module.moduleLevel)

/**
 * Convert API module data
 */
export const convertModulesAndWoodData = async (): Promise<void> => {
    const apiModules = apiItems
        .filter((item) => item.ItemType === "Module")
        .filter((item) => !notUsedModules.has(item.Id))
        .filter((item) => item.Id <= 2594 || usedModules.has(item.Id))
        .filter((item) => (item.ModuleType === "Permanent" && !item.NotUsed) || item.ModuleType !== "Permanent")
        .filter((item) => !notUsedExceptionalWoodIds.has(item.Id)) as APIModule[]

    for (const apiModule of apiModules) {
        const module = {
            id: apiModule.Id,
            name: cleanName(apiModule.Name),
            usageType: apiModule.UsageType,
            APImodifiers: apiModule.Modifiers,
            sortingGroup: apiModule.SortingGroup.replace("module:", ""),
            permanentType: apiModule.PermanentType.replace(/_/g, " "),
            // isStackable: !!apiModule.bCanBeSetWithSameType,
            // minResourcesAmount: APImodule.MinResourcesAmount,
            // maxResourcesAmount: APImodule.MaxResourcesAmount,
            // breakUpItemsAmount: APImodule.BreakUpItemsAmount,
            // canBeBreakedUp: APImodule.CanBeBreakedUp,
            // bCanBeBreakedUp: APImodule.bCanBeBreakedUp,
            moduleType: apiModule.ModuleType,
            moduleLevel: levels.get(apiModule.ModuleLevel),
        } as ModuleConvertEntity

        if (module.name.startsWith("Bow figure - ")) {
            module.name = `${module.name.replace("Bow figure - ", "")} bow figure`
            module.moduleLevel = "U"
        }

        // Ignore double entries
        if (!isDoubleEntry(module)) {
            let isModuleAdded = false

            // Check for wood module
            isModuleAdded =
                (module.name.endsWith(" Planking") && module.moduleType === "Hidden") ||
                (module.name.endsWith(" Frame") && module.moduleType === "Hidden") ||
                module.name === "Crew Space"
                    ? setWood(module)
                    : setModule(module)

            if (isModuleAdded) {
                addedModules.add(module.name + module.moduleLevel)
            }
        }
    }
}

export const convertModules = (): void => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`))

    void convertModulesAndWoodData()
    saveModules()
    saveWoods()
}
