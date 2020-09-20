/*!
 * This file is part of na-map.
 *
 * @file      Convert modules.
 * @module    src/node/convert-modules
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "path"

import d3Array from "d3-array"
const { group: d3Group } = d3Array

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { capitalizeFirstLetter, woodType } from "../common/common"
import { cleanName, sortBy } from "../common/common-node"
import { readJson, saveJsonAsync } from "../common/common-file"
import { serverNames } from "../common/servers"

import { APIItemGeneric, APIModule, ModifiersEntity } from "./api-item"
import {
    ModuleConvertEntity,
    ModuleEntity,
    ModulePropertiesEntity,
    WoodData,
    WoodTrimOrFrame,
} from "../common/gen-json"
import { ModifierName } from "../common/interface"

type APIModifierName = string

let apiItems: APIItemGeneric[]

// noinspection SpellCheckingInspection
const notUsedExceptionalWoodIds = new Set([
    2358, // Danzic Fir Frame
    2363, // Moulmein Teak Frame
    2367, // Virginia Pine Frame
    2368, // African Oak Planking
    2370, // Danzic Fir Planking
    2372, // Greenheart Planking
    2375, // Moulmein Teak Planking
    2379, // Virginia Pine Planking
])

const exceptionalWoodIds = new Set([
    2356, // African Oak Frame
    2357, // African Teak Frame
    2359, // Danzic Oak Frame
    2360, // Greenheart Frame
    2361, // Italian Larch Frame
    2362, // Malabar Teak Frame
    2364, // New England Fir Frame
    2365, // Rangoon Teak Frame
    2366, // Riga Fir Frame
    2369, // African Teak Planking
    2371, // Danzic Oak Planking
    2373, // Italian Larch Planking
    2374, // Malabar Teak Planking
    2376, // New England Fir Planking
    2377, // Rangoon Teak Planking
    2378, // Riga Fir Planking
])

/**
 * Convert API module data
 */
export const convertModulesAndWoodData = async (): Promise<void> => {
    const modules = new Map()

    const woods = {} as WoodData
    woods.trim = []
    woods.frame = []

    const moduleRate = [
        {
            level: "L",
            names: [" (1-3 rates)", " 1-3rd"],
        },
        {
            level: "M",
            names: [" (4-5 rates)", " 4-5th"],
        },
        {
            level: "S",
            names: [" (6-7 rates)", " 6-7th"],
        },
    ]

    const bonusRegex = /(.+\sBonus)\s(\d)/u

    const levels = new Map([
        ["Universal", "U"],
        ["Regular", "R"],
        ["LightShips", "S"],
        ["Medium", "M"],
        ["LineShips", "L"],
    ])

    // noinspection SpellCheckingInspection
    const modifiers = new Map<APIModifierName, ModifierName>([
        // Woods
        ["ARMOR_ALL_SIDES ARMOR_THICKNESS", "Armor thickness"],
        ["ARMOR_ALL_SIDES MODULE_BASE_HP", "Armour hit points"],
        ["CREW MODULE_BASE_HP", "Crew"],
        ["INTERNAL_STRUCTURE MODULE_BASE_HP", "Hull hit points"],
        ["INTERNAL_STRUCTURE REPAIR_MODULE_TIME", "Repair time"],
        ["MAST MAST_BOTTOM_SECTION_HP", "Mast hit points"],
        ["NONE CREW_DAMAGE_RECEIVED_DECREASE_PERCENT", "Splinter resistance"],
        ["NONE GROG_MORALE_BONUS", "Morale"],
        ["NONE RUDDER_HALFTURN_TIME", "Rudder speed"],
        ["NONE SHIP_MATERIAL", "Ship material"],
        ["NONE SHIP_MAX_SPEED", "Max speed"],
        ["NONE SHIP_PHYSICS_ACC_COEF", "Acceleration"],
        ["NONE SHIP_TURNING_ACCELERATION_TIME", "Turn acceleration"],
        ["NONE SHIP_TURNING_SPEED", "Turn speed"],
        ["REPAIR_ARMOR REPAIR_PERCENT", "Repair amount"],
        ["SAIL MAST_THICKNESS", "Mast thickness"],
        ["STRUCTURE FIRE_INCREASE_RATE", "Fire resistance"],
        ["STRUCTURE SHIP_PHYSICS_ACC_COEF", "Acceleration"],
        ["STRUCTURE SHIP_STRUCTURE_LEAKS_PER_SECOND", "Leak resistance"],

        // Modules
        ["ARMOR_ALL_SIDES REPAIR_MODULE_TIME", "Repair time"],
        ["ARMOR_BACK ARMOR_THICKNESS", "Back armour thickness"],
        ["ARMOR_FRONT ARMOR_THICKNESS", "Front armour thickness"],
        ["DECK_ALL CANNON_BASIC_PENETRATION", "Cannon ball penetration"],
        ["DECK_ALL CANNON_CREW_REQUIRED", "Cannon crew"],
        ["DECK_ALL CANNON_DISPERSION_PER100M", "Cannon horizontal dispersion"],
        [
            "DECK_ALL CANNON_DISPERSION_PER100M,CANNON_DISPERSION_VERTICAL_PER100M",
            "Cannon horizontal/vertical dispersion",
        ],
        ["DECK_ALL CANNON_DISPERSION_REDUCTION_SPEED", "Cannon aiming speed"],
        ["DECK_ALL CANNON_DISPERSION_VERTICAL_PER100M", "Cannon vertical dispersion"],
        ["DECK_ALL CANNON_MIN_ANGLE,CANNON_MAX_ANGLE", "Cannon up/down traverse"],
        ["DECK_ALL CANNON_RELOAD_TIME", "Cannon reload time"],
        ["DECK_ALL FIRE_PROBABILITY", "Fire probability"],
        [
            "DECK_CENTRAL CANNON_DISPERSION_PER100M,CANNON_DISPERSION_VERTICAL_PER100M",
            "Mortar horizontal/vertical dispersion",
        ],
        ["DECK_CENTRAL CANNON_DISPERSION_REDUCTION_SPEED", "Mortar aiming speed"],
        ["MAST MAST_BOTTOM_SECTION_HP,MAST_MIDDLE_SECTION_HP,MAST_TOP_SECTION_HP", "Mast hit points"],
        ["MAST MAST_TOP_SECTION_HP,MAST_MIDDLE_SECTION_HP,MAST_BOTTOM_SECTION_HP", "Mast hit points"],
        ["NONE AXES_ATTACK_BONUS", "Melee attack"],
        ["NONE AXES_DISENGAGE_DURATION", "Disengage time"],
        ["NONE BARRICADES_FIREPOWER_BONUS", "Barricade musket defense"],
        ["NONE BARRICADES_MELEE_BONUS", "Barricade melee bonus"],
        ["NONE BOARDING_ATTACK_BONUS", "Melee attack"],
        ["NONE BOARDING_DEFENSE_BONUS", "Melee defense"],
        ["NONE CREW_TRANSFER_SPEED", "Crew transfer speed"],
        ["NONE DECK_GUNS_ACCURACY_BONUS", "Boarding cannons accuracy"],
        ["NONE FIRE_DECREASE_RATE", "Fire resistance"],
        ["NONE FIRE_INCREASE_RATE", "Fire resistance"],
        ["NONE FIREZONE_MAX_HORIZONTAL_ANGLE", "Cannon side traverse"],
        ["NONE GLOBAL_SIDEBOARD_WATER_FLOW", "Sideboard water flow"],
        ["NONE GRENADES_BONUS", "Grenades"],
        ["NONE GROG_ACCURACY_PENALTY", "Muskets accuracy"],
        ["NONE GROG_ATTACK_BONUS", "Melee attack"],
        ["NONE HANDBOOK_ATTACK_BONUS", "Melee attack"],
        ["NONE HANDBOOK_DEFENSE_BONUS", "Melee defense"],
        ["NONE HANDBOOK_MORALE_BONUS", "Morale"],
        ["NONE HOLE_DECREASE_RATE,RAM_DECREASE_RATE", "Leak repair"],
        ["NONE LADDERS_MELEE_PENALTY_REDUCE", "Ship height penalty reduction"],
        ["NONE MARINES_FIREPOWER_MODIFIER", "Marines firepower"],
        ["NONE MARINES_LEVEL", "Marines level"],
        ["NONE MARINES_MELEE_MODIFIER", "Marines melee attack"],
        ["NONE MARINES_PERCENTAGE", "Marines percentage"],
        ["NONE MAST_PHYSICS_JIB_SAIL_FORCE_BONUS", "Staysails power"],
        ["NONE MAST_PHYSICS_MAIN_SAIL_FORCE_BONUS", "Square sails power"],
        ["NONE MAST_PHYSICS_MAIN_SAIL_TORQUE_BONUS", "Square sails torque"],
        ["NONE MAST_PHYSICS_SPANKER_SAIL_FORCE_BONUS", "Spanker power"],
        ["NONE MUSKETS_ACCURACY_BONUS", "Muskets accuracy"],
        ["NONE MUSKETS_PERCENTAGE_OF_CREW", "Crew with muskets"],
        ["NONE PERK_BOARDING_ATTACK_COST_MODIFIER", "Boarding attack cost"],
        ["NONE PERK_BOARDING_DEFEND_COST_MODIFIER", "Boarding defend cost"],
        ["NONE PERK_BOARDING_ENEMY_EXTRA_CREW_REQUIREMENT", "Enemy boarding crew needed"],
        ["NONE PERK_BOARDING_ENEMY_MORALE_LOSS_MODIFIER", "Enemy boarding morale loss"],
        ["NONE PERK_CARRONADE_DISPERSION_MODIFIER", "Carronade dispersion"],
        ["NONE PERK_CONTROL_EXIT_TIMER_OVERRIDE_DISTANCE", "Control distance"],
        ["NONE PERK_CRAFT_CREW_HIRE_COST_MODIFIER", "Crew hire cost"],
        ["NONE PERK_CRAFT_DROP_RECIPE_CHANCE_MODIFIER", "CRAFT_DROP_RECIPE_CHANCE_MODIFIER"],
        ["NONE PERK_CRAFT_FRIGATE_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft frigate"],
        ["NONE PERK_CRAFT_LIGHT_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft unrated ship"],
        ["NONE PERK_CRAFT_LINE_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft ship of the line"],
        ["NONE PERK_CRAFT_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft any ship"],
        ["NONE PERK_CREW_REPAIR_PERCENT_MODIFIER", "Crew repair amount"],
        ["NONE PERK_DONT_CONSUME_BATTLE_REPAIRS", "DONT_CONSUME_BATTLE_REPAIRS"],
        ["NONE PERK_EMERGENCY_REPAIR_COOLDOWN_MODIFIER", "Emergency repair cooldown"],
        ["NONE PERK_ENABLE_DOUBLE_CHARGE", "Double charge"],
        ["NONE PERK_ENABLE_DOUBLE_SHOT", "Double shot"],
        ["NONE PERK_FISHING_DROP_CHANCE_MODIFIER", "Fishing efficiency"],
        ["NONE PERK_HEEL_DEGREES_MODIFIER", "Heel correction"],
        ["NONE PERK_HOLD_MAX_WEIGHT_MODIFIER", "Hold weight"],
        ["NONE PERK_HULL_REPAIR_PERCENT_MODIFIER", "Armour repair amount (perk)"],
        ["NONE PERK_LABOR_HOURS_GENERATION_MODIFIER", "Labour hour generation"],
        ["NONE PERK_LABOR_HOURS_WALLET_MODIFIER", "Labour hour reserve"],
        ["NONE PERK_MAX_FLEET_SIZE_MODIFIER", "Fleet size"],
        ["NONE PERK_MORTAR_BALL_COUNT_MODIFIER", "Additional mortar balls"],
        ["NONE PERK_MORTAR_DISPERSION_MODIFIER", "Mortar dispension"],
        ["NONE PERK_MORTAR_RELOAD_TIME_MODIFIER", "Mortar reload time"],
        ["NONE PERK_NATIONAL_HUNTER_SPEED_ADD_MODIFIER", "National hunter speed modifier"],
        ["NONE PERK_PIRATE_HUNTER_RELOAD_TIME_MODIFIER", "Pirate hunter reload time"],
        ["NONE PERK_PRESS_GANG", "Press gang"],
        ["NONE PERK_PUMP_WATER_BAILING_MODIFIER", "Pump water bailing"],
        ["NONE PERK_RECOVER_LOST_CREW_PERCENT", "Recover lost crew"],
        ["NONE PERK_SAIL_DAMAGE_MODIFIER", "Sail damage"],
        ["NONE PERK_SAIL_REPAIR_PERCENT_MODIFIER", "Sail repair amount (perk)"],
        ["NONE PERK_SHIP_EXTRA_CHAIN_UNITS", "Additional chains"],
        ["NONE PERK_SHIP_EXTRA_DOBULE_CHARGE_UNITS", "Additional double charges"], // typo
        ["NONE PERK_SHIP_EXTRA_DOUBLE_CHARGE_UNITS", "Additional double charges"],
        ["NONE PERK_SHIP_EXTRA_DOUBLE_SHOT_UNITS", "Additional double shots"],
        ["NONE PERK_SHIP_MASTER_CLASS_TYPE", "Ship master class type"],
        ["NONE PERK_SHIP_MASTER_RELOAD_TIME_MODIFIER", "Ship master reload time modifier"],
        ["NONE PERK_SHIP_MASTER_REPAIR_COUNT_ADD_MODIFIER", "Additional repairs"],
        ["NONE PERK_SHIP_MASTER_SPEED_ADD_MODIFIER", "Ship master speed add modifier"],
        ["NONE PERK_SOLD_SHIP_PRICE_MODIFIER", "Ship purchase price"],
        ["NONE PERK_START_ALL_GUNS_LOADED", "Guns loaded at start"],
        ["NONE PREPARATION_BONUS_PER_ROUND", "Preparation"],
        ["NONE RHEA_TURN_SPEED", "Yard turn speed"],
        ["NONE SAIL_DECREASING_SPEED", "Sail decreasing speed"],
        ["NONE SAIL_RISING_SPEED", "Sail rising speed"],
        ["NONE SHIP_BOARDING_PREPARATION_BONUS", "Preparation"],
        ["NONE SHIP_EXTRA_CHAIN_UNITS", "Additional chains"],
        ["NONE SHIP_EXTRA_DOBULE_CHARGE_UNITS", "Additional double charges"], // typo
        ["NONE SHIP_EXTRA_DOUBLE_CHARGE_UNITS", "Additional double charges"],
        ["NONE SHIP_EXTRA_DOUBLE_SHOT_UNITS", "Additional double shots"],
        ["NONE SHIP_MAX_ROLL_ANGLE", "Heel"],
        ["NONE SHIP_PHYSICS_DEC_COEF", "Deceleration"],
        ["NONE SHIP_REPAIR_SAIL_CREW_REQUIREMENT,SHIP_REPAIR_ARMOR_CREW_REQUIREMENT", "Repair crew needed"],
        ["NONE SHIP_TURNING_SPEED_RHEAS", "Yard power"],
        ["NONE WATER_PUMP_BAILING", "Water pump bailing"],
        ["POWDER POWDER_RADIUS", "Explosion power"],
        ["POWDER REPAIR_MODULE_TIME", ""],
        ["REPAIR_GENERIC REPAIR_PERCENT", ""],
        ["REPAIR_SAIL REPAIR_PERCENT", ""],
        ["RUDDER MODULE_BASE_HP", "Rudder hit points"],
        ["RUDDER REPAIR_MODULE_TIME", ""],
        ["SAIL MODULE_BASE_HP", "Sail hit points"],
        ["SAIL REPAIR_MODULE_TIME", ""],
        ["SAIL SAILING_CREW_REQUIRED", "Sailing crew"],
        ["STRUCTURE CANNON_MASS", "Cannon weight"],
        ["STRUCTURE SHIP_CANNON_DESTROY_PROBABILITY", "Cannon destroy probability"],
        ["WATER_PUMP MODULE_BASE_HP", "Water pump hit points"],
        ["WATER_PUMP REPAIR_MODULE_TIME", ""],
    ])

    const flipAmountForModule = new Set<ModifierName>([
        "Fire resistance",
        "Leak resistance",
        "Turn acceleration",
        "Rudder speed",
    ])
    const notPercentage = new Set<ModifierName>(["Crew with muskets", "Melee attack", "Melee defense", "Morale"])

    /**
     * Set wood properties
     * @param module - Module data
     */
    const setWood = (module: ModuleConvertEntity): void => {
        const wood = {} as WoodTrimOrFrame
        wood.id = module.id

        wood.properties = module.APImodifiers.map((modifier) => {
            const apiModifierName: APIModifierName = `${modifier.Slot} ${modifier.MappingIds.join()}`
            // Add modifier if in modifier map
            const modifierName = modifiers.get(apiModifierName) ?? ""
            let amount = modifier.Percentage
            let isPercentage = true

            if (modifier.Absolute) {
                amount = modifier.Absolute
                isPercentage = false
            }

            // Some modifiers are wrongly indicated as a percentage
            if (notPercentage.has(modifierName)) {
                isPercentage = false
            }

            if (flipAmountForModule.has(modifierName)) {
                amount *= -1
            }

            if (modifierName === "Splinter resistance") {
                amount = Math.round(amount * 100)
                isPercentage = true
            }

            return {
                modifier: modifierName ?? "",
                amount,
                isPercentage,
            }
        })

        if (module.name.includes("(S)")) {
            wood.family = "seasoned"
        } else if (exceptionalWoodIds.has(wood.id)) {
            wood.family = "exceptional"
        } else {
            wood.family = "regular"
        }

        if (module.name.endsWith(" Planking") || module.name === "Crew Space") {
            wood.type = "trim"
            wood.name = module.name.replace(" Planking", "")
            woods.trim.push(wood)
        } else {
            wood.type = "frame"
            wood.name = module.name.replace(" Frame", "")
            woods.frame.push(wood)
        }
    }

    /**
     * Get module modifier properties
     * @param APImodifiers - Module modifier data
     * @returns Module modifier properties
     */
    const getModuleProperties = (APImodifiers: ModifiersEntity[]): ModulePropertiesEntity[] => {
        return APImodifiers.filter((modifier) => {
            const apiModifierName: APIModifierName = `${modifier.Slot} ${modifier.MappingIds.join()}`
            if (!modifiers.has(apiModifierName)) {
                console.log(`${apiModifierName} modifier not defined`)
                return true
            }

            return modifiers.get(apiModifierName) !== ""
        }).map((modifier) => {
            const apiModifierName: APIModifierName = `${modifier.Slot} ${modifier.MappingIds.join()}`
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
                    amount = Math.round(modifier.Absolute * 10000) / 100
                }
            }

            if (flipAmountForModule.has(modifierName)) {
                amount *= -1
            } else if (modifierName === "Splinter resistance") {
                amount = Math.round(modifier.Absolute * 10000) / 100
                isPercentage = true
            }

            // Some modifiers are wrongly indicated as a percentage
            if (notPercentage.has(modifierName)) {
                isPercentage = false
            }

            return {
                modifier: modifierName,
                amount,
                isPercentage,
            }
        })
    }

    /**
     * Get module type
     * @param module - Module data
     * @returns Module type
     */
    const getModuleType = (module: ModuleConvertEntity): string => {
        let type: string
        let { permanentType, sortingGroup } = module

        if (
            module.usageType === "All" &&
            sortingGroup &&
            module.moduleLevel === "U" &&
            module.moduleType === "Hidden"
        ) {
            type = "Ship trim"
        } else if (module.moduleType === "Permanent" && !module.name.endsWith(" Bonus")) {
            type = "Permanent"
        } else if (
            module.usageType === "All" &&
            !sortingGroup &&
            module.moduleLevel === "U" &&
            module.moduleType === "Hidden"
        ) {
            type = "Perk"
        } else if (module.moduleType === "Regular") {
            type = "Ship knowledge"
        } else {
            type = "Not used"
        }

        // Correct sorting group
        if (module.name.endsWith("French Rig Refit") || module.name === "Bridgetown Frame Refit") {
            sortingGroup = "survival"
        }

        if (type === "Ship trim") {
            const result = bonusRegex.exec(module.name)
            sortingGroup = result ? `\u202F\u2013\u202F${result[1]}` : ""
        } else {
            sortingGroup = sortingGroup
                ? `\u202F\u2013\u202F${capitalizeFirstLetter(module.sortingGroup ?? "").replace("_", "/")}`
                : ""
        }

        if (permanentType === "Default") {
            permanentType = ""
        } else {
            permanentType = `\u202F\u25CB\u202F${permanentType}`
        }

        return `${type}${sortingGroup}${permanentType}`
    }

    const apiModules = apiItems
        .filter(
            (item) =>
                item.ItemType === "Module" &&
                ((item.ModuleType === "Permanent" && !item.NotUsed) || item.ModuleType !== "Permanent")
        )
        .filter((item) => !notUsedExceptionalWoodIds.has(item.Id)) as APIModule[]

    apiModules.forEach((apiModule) => {
        let dontSave = false
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
        if (!modules.has(module.name + module.moduleLevel)) {
            // Check for wood module
            if (
                (module.name.endsWith(" Planking") && module.moduleType === "Hidden") ||
                (module.name.endsWith(" Frame") && module.moduleType === "Hidden") ||
                module.name === "Crew Space"
            ) {
                setWood(module)
                dontSave = true
            } else {
                const properties = getModuleProperties(module.APImodifiers)
                if (properties) {
                    module.properties = properties
                }

                module.type = getModuleType(module)

                for (const rate of moduleRate) {
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

                // noinspection SpellCheckingInspection
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
            }

            const { APImodifiers, moduleType, sortingGroup, permanentType, ...cleanedModule } = module
            modules.set(cleanedModule.name + cleanedModule.moduleLevel, dontSave ? {} : cleanedModule)
        }
    })
    // Get the not empty modules and sort
    const result = [...modules.values()].filter((module) => Object.keys(module).length > 0).sort(sortBy(["type", "id"]))
    // Group by type
    const modulesGrouped = d3Group(result, (module: ModuleEntity): string => module.type)
    await saveJsonAsync(commonPaths.fileModules, [...modulesGrouped])

    // Sort by modifier
    for (const type of woodType) {
        for (const wood of woods[type]) {
            wood.properties.sort(sortBy(["modifier"]))
        }

        woods[type].sort(sortBy(["id"]))
    }

    await saveJsonAsync(commonPaths.fileWood, woods)
}

export const convertModules = (): void => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`))

    void convertModulesAndWoodData()
}
