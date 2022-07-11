import { group as d3Group } from "d3-array"

import { ModuleConvertEntity, ModuleEntity, ModulePropertiesEntity } from "../../common/gen-json"
import { ModifiersEntity } from "../api-item"
import { capitalizeFirstLetter, sortBy } from "../../common/common"
import { getCommonPaths } from "../../common/common-dir"
import { saveJsonAsync } from "../../common/common-file"
import {
    APIModifierName,
    bonusRegex,
    CleanedModule,
    flipAmountForModule,
    modifiers,
    moduleRate,
    notPercentage,
} from "./common"

const modules = new Map<string, CleanedModule>()
const commonPaths = getCommonPaths()

const getModifierName = (modifier: ModifiersEntity): APIModifierName =>
    `${modifier.Slot} ${modifier.MappingIds.join(",")}`

/**
 * Get module type
 * @param module - Module data
 * @returns Module type
 */
const getModuleType = (module: ModuleConvertEntity): string => {
    let type: string
    let { permanentType, sortingGroup } = module
    const { moduleLevel, moduleType, name, usageType } = module

    if (usageType === "All" && sortingGroup && moduleLevel === "U" && moduleType === "Hidden") {
        type = "Ship trim"
    } else if (moduleType === "Permanent" && !name.endsWith(" Bonus")) {
        type = "Permanent"
    } else if (usageType === "All" && !sortingGroup && moduleLevel === "U" && moduleType === "Hidden") {
        type = "Perk"
    } else if (moduleType === "Regular") {
        type = "Ship knowledge"
    } else {
        type = "Not used"
    }

    // Correct sorting group
    if (name.endsWith("French Rig Refit") || name === "Bridgetown Frame Refit") {
        sortingGroup = "survival"
    }

    if (type === "Ship trim") {
        const result = bonusRegex.exec(name)
        sortingGroup = result ? `\u202F\u2013\u202F${result[1]}` : ""
    } else {
        sortingGroup = sortingGroup
            ? `\u202F\u2013\u202F${capitalizeFirstLetter(sortingGroup ?? "").replace("_", "/")}`
            : ""
    }

    permanentType = permanentType === "Default" ? "" : `\u202F\u25CB\u202F${permanentType}`

    return `${type}${sortingGroup}${permanentType}`
}

/**
 * Get module modifier properties
 * @param APImodifiers - Module modifier data
 * @returns Module modifier properties
 */
const getModuleProperties = (APImodifiers: ModifiersEntity[]): ModulePropertiesEntity[] | undefined => {
    return APImodifiers.filter((modifier) => {
        const apiModifierName = getModifierName(modifier)
        if (!modifiers.has(apiModifierName)) {
            console.log(`${apiModifierName} modifier not defined`, modifier)
            return true
        }

        return modifiers.get(apiModifierName) !== ""
    })
        .flatMap((modifier) => {
            const apiModifierName = getModifierName(modifier)
            const modifierName = modifiers.get(apiModifierName) ?? ""
            let amount = modifier.Percentage
            let isPercentage = true

            if (modifier.Absolute) {
                if (
                    Math.abs(modifier.Absolute) >= 1 ||
                    modifier.MappingIds[0].endsWith("PERCENT_MODIFIER") ||
                    modifier.MappingIds[0] === "REPAIR_PERCENT"
                ) {
                    amount = modifier.Absolute
                    isPercentage = false
                } else {
                    amount = Math.round(modifier.Absolute * 10_000) / 100
                }
            }

            if (flipAmountForModule.has(modifierName)) {
                amount *= -1
            } else if (modifierName === "Splinter resistance") {
                amount = Math.round(modifier.Absolute * 10_000) / 100
                isPercentage = true
            }

            // Some modifiers are wrongly indicated as a percentage
            if (notPercentage.has(modifierName)) {
                isPercentage = false
            }

            // Special case dispersion: split entry up in horizontal and vertical
            if (modifierName === "Cannon horizontal/vertical dispersion") {
                return [
                    {
                        modifier: "Cannon horizontal dispersion",
                        amount,
                        isPercentage,
                    },
                    {
                        modifier: "Cannon vertical dispersion",
                        amount,
                        isPercentage,
                    },
                ]
            }

            return {
                modifier: modifierName,
                amount,
                isPercentage,
            }
        })
        .sort(sortBy(["modifier"]))
}

export const setModule = (module: ModuleConvertEntity): boolean => {
    let dontSave = false

    module.properties = getModuleProperties(module.APImodifiers)
    module.type = getModuleType(module)

    for (const rate of moduleRate) {
        // eslint-disable-next-line max-depth
        for (const name of rate.names) {
            // eslint-disable-next-line max-depth
            if (module.name.endsWith(name)) {
                module.name = module.name.replace(name, "")
                module.moduleLevel = rate.level
            }
        }
    }

    const rateExceptions = new Set([
        "Apprentice Carpenters",
        "Journeyman Carpenters",
        "Navy Carpenters",
        "Northern Carpenters",
        "Northern Master Carpenters",
        "Navy Mast Bands",
        "Navy Orlop Refit",
    ])

    if (rateExceptions.has(module.name)) {
        module.moduleLevel = "U"
    }

    const nameExceptions = new Set([
        "Cannon nation module - France",
        "Coward",
        "Doctor",
        "Dreadful",
        "Expert Surgeon",
        "Frigate Master",
        "Gifted",
        "Light Ship Master",
        "Lineship Master",
        "Press Gang",
        "Signaling",
        "TEST MODULE SPEED IN OW",
        "Thrifty",
    ])
    if (
        nameExceptions.has(module.name) ||
        (module.name === "Optimized Rudder" && module.moduleLevel !== "U") ||
        module.name.endsWith(" - OLD") ||
        module.name.endsWith("TEST") ||
        module.type.startsWith("Not used")
    ) {
        dontSave = true
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { APImodifiers, moduleType, sortingGroup, permanentType, ...cleanedModule } = module
    modules.set(cleanedModule.name + cleanedModule.moduleLevel, dontSave ? ({} as CleanedModule) : cleanedModule)

    return !dontSave
}

export const saveModules = async () => {
    // Get the non-empty setModules and sort
    const result = [...modules.values()].filter((module) => Object.keys(module).length > 0).sort(sortBy(["type", "id"]))
    // Group by type
    const modulesGrouped = d3Group(result, (module: ModuleEntity): string => module.type)
    await saveJsonAsync(commonPaths.fileModules, [...modulesGrouped])
}
