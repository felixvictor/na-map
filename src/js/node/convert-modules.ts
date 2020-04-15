/*!
 * This file is part of na-map.
 *
 * @file      Convert modules.
 * @module    src/node/convert-modules
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { capitalizeFirstLetter, groupToMap } from "../common/common"
import { cleanName, sortBy } from "../common/common-node"
import { readJson, saveJsonAsync } from "../common/common-file"
import { serverNames } from "../common/common-var"

import { APIItemGeneric, APIModule, ModifiersEntity } from "./api-item"
import { ModuleConvertEntity, ModuleEntity, ModulePropertiesEntity, WoodData, WoodTrimOrFrame } from "../common/gen-json"

let apiItems: APIItemGeneric[]

/**
 * Convert API module data
 */
export const convertModulesAndWoodData = async (): Promise<void> => {
    const modules = new Map()

    const woods = {} as WoodData
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

    woods.trim = []
    woods.frame = []

    const levels = new Map([
        ["Universal", "U"],
        ["Regular", "R"],
        ["LightShips", "S"],
        ["Medium", "M"],
        ["LineShips", "L"],
    ])

    // Woods
    // noinspection SpellCheckingInspection
    const modifiers = new Map([
        ["ARMOR_ALL_SIDES ARMOR_THICKNESS", "Armor thickness"],
        ["ARMOR_ALL_SIDES MODULE_BASE_HP", "Armour hit points"],
        ["CREW MODULE_BASE_HP", "Crew"],
        ["INTERNAL_STRUCTURE MODULE_BASE_HP", "Hull hit points"],
        ["NONE CREW_DAMAGE_RECEIVED_DECREASE_PERCENT", "Splinter resistance"],
        ["NONE GROG_MORALE_BONUS", "Morale"],
        ["NONE RUDDER_HALFTURN_TIME", "Rudder speed"],
        ["NONE SHIP_MATERIAL", "Ship material"],
        ["NONE SHIP_MAX_SPEED", "Max speed"],
        ["NONE SHIP_PHYSICS_ACC_COEF", "Acceleration"],
        ["NONE SHIP_TURNING_SPEED", "Turn rate"],
        ["SAIL MAST_THICKNESS", "Mast thickness"],
        ["STRUCTURE FIRE_INCREASE_RATE", "Fire resistance"],
        ["STRUCTURE SHIP_PHYSICS_ACC_COEF", "Acceleration"],
        ["STRUCTURE SHIP_STRUCTURE_LEAKS_PER_SECOND", "Leak resistance"],

        // Modules
        ["ARMOR_ALL_SIDES REPAIR_MODULE_TIME", "Side armour repair time"],
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
        ["NONE DECK_GUNS_ACCURACY_BONUS", "Boarding cannon accuracy"],
        ["NONE FIRE_DECREASE_RATE", "Fire resistance"],
        ["NONE FIRE_INCREASE_RATE", "Fire resistance"],
        ["NONE FIREZONE_MAX_HORIZONTAL_ANGLE", "Cannon side traverse"],
        ["NONE GLOBAL_SIDEBOARD_WATER_FLOW", "Sideboard water flow"],
        ["NONE GRENADES_BONUS", "Grenades"],
        ["NONE GROG_ACCURACY_PENALTY", "Muskets accuracy penalty"],
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
        ["NONE MUSKETS_PERCENTAGE_OF_CREW", "Additional crew with muskets"],
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
        ["NONE PERK_HEEL_DEGREES_MODIFIER", "Heel correctionValueDegrees"],
        ["NONE PERK_HOLD_MAX_WEIGHT_MODIFIER", "Hold capacity"],
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
        ["NONE PREPARATION_BONUS_PER_ROUND", "Preparation bonus per round"],
        ["NONE RHEA_TURN_SPEED", "Yard turn speed"],
        ["NONE SAIL_RISING_SPEED", "Sail rising speed"],
        ["NONE SHIP_BOARDING_PREPARATION_BONUS", "Boarding preparation bonus"],
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
        ["POWDER REPAIR_MODULE_TIME", "Powder repair module time"],
        ["REPAIR_ARMOR REPAIR_PERCENT", "Armour repair amount"],
        ["REPAIR_GENERIC REPAIR_PERCENT", "Generic repair amount"],
        ["REPAIR_SAIL REPAIR_PERCENT", "Sail repair amount"],
        ["RUDDER MODULE_BASE_HP", "Rudder hitpoints"],
        ["RUDDER REPAIR_MODULE_TIME", "Rudder repair time"],
        ["SAIL MODULE_BASE_HP", "Sail hitpoints"],
        ["SAIL REPAIR_MODULE_TIME", "Sail repair time"],
        ["SAIL SAILING_CREW_REQUIRED", "Sailing crew"],
        ["STRUCTURE CANNON_MASS", "Cannon weight"],
        ["STRUCTURE SHIP_CANNON_DESTROY_PROBABILITY", "Cannon destroy probability"],
        ["WATER_PUMP MODULE_BASE_HP", "Water pump hitpoints"],
        ["WATER_PUMP REPAIR_MODULE_TIME", "Water pump repair time"],
    ])

    /**
     * Set wood properties
     * @param module - Module data
     */
    const setWood = (module: ModuleConvertEntity): void => {
        const wood = {} as WoodTrimOrFrame
        wood.id = module.id
        wood.properties = []
        for (const modifier of module.APImodifiers) {
            // Add modifier if in modifier map
            if (modifiers.has(`${modifier.Slot} ${modifier.MappingIds.join()}`)) {
                const modifierName = modifiers.get(`${modifier.Slot} ${modifier.MappingIds.join()}`)
                let amount = modifier.Percentage
                let isPercentage = true

                if (modifier.Absolute) {
                    amount = modifier.Absolute
                    isPercentage = false
                }

                // Some modifiers are wrongly indicated as a percentage
                if (modifierName === "Boarding morale") {
                    isPercentage = false
                }

                if (
                    modifierName === "Fire resistance" ||
                    modifierName === "Leak resistance" ||
                    modifierName === "Rudder speed"
                ) {
                    amount *= -1
                }

                if (modifierName === "Splinter resistance") {
                    amount *= 100
                    isPercentage = true
                }

                wood.properties.push({
                    modifier: modifierName ?? "",
                    amount,
                    isPercentage,
                })
            }
        }

        if (module.name.endsWith(" Planking") || module.name === "Crew Space") {
            wood.type = "Trim"
            wood.name = module.name.replace(" Planking", "")
            woods.trim.push(wood)
        } else {
            wood.type = "Frame"
            wood.name = module.name.replace(" Frame", "")
            woods.frame.push(wood)
        }

        // Sort by modifier
        for (const type of ["frame", "trim"]) {
            for (const APIwood of woods[type]) {
                APIwood.properties.sort(sortBy(["modifier", "id"]))
            }
        }
    }

    /**
     * Get module modifier properties
     * @param APImodifiers - Module modifier data
     * @returns Module modifier properties
     */
    const getModuleProperties = (APImodifiers: ModifiersEntity[]): ModulePropertiesEntity[] => {
        return APImodifiers.map((modifier) => {
            if (!modifiers.has(`${modifier.Slot} ${modifier.MappingIds.join()}`)) {
                console.log(`${modifier.Slot} ${modifier.MappingIds.join()} modifier undefined`)
            }

            const modifierName = modifiers.get(`${modifier.Slot} ${modifier.MappingIds.join()}`) ?? ""
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

            if (
                modifierName === "Fire resistance" ||
                modifierName === "Leak resistance" ||
                modifierName === "Rudder speed"
            ) {
                amount *= -1
            } else if (modifierName === "Splinter resistance") {
                amount = Math.round(modifier.Absolute * 10000) / 100
                isPercentage = true
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
                ? `\u202F\u2013\u202f${capitalizeFirstLetter(module.sortingGroup ?? "").replace("_", "/")}`
                : ""
        }

        if (permanentType === "Default") {
            permanentType = ""
        } else {
            permanentType = `\u202F\u25CB\u202F${permanentType}`
        }

        return `${type}${sortingGroup}${permanentType}`
    }

    const apiModules = apiItems.filter(
        (item) =>
            item.ItemType === "Module" &&
            ((item.ModuleType === "Permanent" && !item.NotUsed) || item.ModuleType !== "Permanent")
    ) as APIModule[]
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
                module.properties = getModuleProperties(module.APImodifiers)
                delete module.APImodifiers

                module.type = getModuleType(module)

                delete module.moduleType
                delete module.sortingGroup
                delete module.permanentType

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
                } else {
                    // console.log(module.id, module.name);
                }
            }

            modules.set(module.name + module.moduleLevel, dontSave ? {} : module)
        }
    })

    let result = [...modules.values()]
    result = result.filter((module) => Object.keys(module).length).sort(sortBy(["type", "id"]))
    const modulesGrouped = [...groupToMap(result, (module: ModuleEntity): string => module.type)]

    await saveJsonAsync(commonPaths.fileModules, modulesGrouped)
    await saveJsonAsync(commonPaths.fileWood, woods)
}

export const convertModules = (): void => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`))

    // noinspection JSIgnoredPromiseFromCall
    convertModulesAndWoodData()
}
