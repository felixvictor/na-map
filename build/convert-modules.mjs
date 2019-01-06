// eslint-disable-next-line import/extensions
import { groupBy, readJson, saveJson, capitalizeFirstLetter } from "./common.mjs";

const itemsFilename = process.argv[2],
    outDir = process.argv[3],
    date = process.argv[4];

const apiItems = readJson(`${itemsFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 * Convert API module data and save sorted as JSON
 * @returns {void}
 */
function convertModules() {
    const modules = new Map(),
        levels = new Map(),
        modifiers = new Map(),
        woodJson = {},
        moduleRate = [
            {
                level: "L",
                names: [" (1-3 rates)", "1-3rd"]
            },
            {
                level: "M",
                names: [" (4-5 rates)", "4-5th"]
            },
            {
                level: "S",
                names: [" (6-7 rates)", "6-7th"]
            }
        ];

    woodJson.trim = [];
    woodJson.frame = [];

    levels.set("Universal", "U");
    levels.set("Regular", "R");
    levels.set("LightShips", "S");
    levels.set("Medium", "M");
    levels.set("LineShips", "L");

    // Woods
    modifiers.set("ARMOR_ALL_SIDES ARMOR_THICKNESS", "Thickness");
    modifiers.set("ARMOR_ALL_SIDES MODULE_BASE_HP", "Side armour");
    modifiers.set("CREW MODULE_BASE_HP", "Crew");
    modifiers.set("INTERNAL_STRUCTURE MODULE_BASE_HP", "Hull strength");
    modifiers.set("NONE CREW_DAMAGE_RECEIVED_DECREASE_PERCENT", "Crew protection");
    modifiers.set("NONE GROG_MORALE_BONUS", "Boarding morale");
    modifiers.set("NONE RUDDER_HALFTURN_TIME", "Rudder speed");
    modifiers.set("NONE SHIP_MAX_SPEED", "Ship speed");
    modifiers.set("NONE SHIP_PHYSICS_ACC_COEF", "Acceleration");
    modifiers.set("NONE SHIP_TURNING_SPEED", "Turn speed");
    modifiers.set("SAIL MAST_THICKNESS", "Mast thickness");
    modifiers.set("STRUCTURE FIRE_INCREASE_RATE", "Fire resistance");
    modifiers.set("STRUCTURE SHIP_PHYSICS_ACC_COEF", "Acceleration");
    modifiers.set("STRUCTURE SHIP_STRUCTURE_LEAKS_PER_SECOND", "Leak resistance");

    // Modules
    modifiers.set("ARMOR_ALL_SIDES REPAIR_MODULE_TIME", "Side armour repair time");
    modifiers.set("ARMOR_BACK ARMOR_THICKNESS", "Back armour thickness");
    modifiers.set("ARMOR_FRONT ARMOR_THICKNESS", "Front armour thickness");
    modifiers.set("DECK_ALL CANNON_BASIC_PENETRATION", "Cannon ball penetration");
    modifiers.set("DECK_ALL CANNON_CREW_REQUIRED", "Cannon crew required");
    modifiers.set("DECK_ALL CANNON_DISPERSION_PER100M", "Cannon dispersion per 100m");
    modifiers.set(
        "DECK_ALL CANNON_DISPERSION_PER100M,CANNON_DISPERSION_VERTICAL_PER100M",
        "Cannon dispersion per 100m, cannon vertical dispersion per 100m"
    );
    modifiers.set("DECK_ALL CANNON_DISPERSION_REDUCTION_SPEED", "Cannon dispersion reduction speed");
    modifiers.set("DECK_ALL CANNON_DISPERSION_VERTICAL_PER100M", "Cannon vertical dispersion per 100m");
    modifiers.set("DECK_ALL CANNON_MIN_ANGLE,CANNON_MAX_ANGLE", "Cannon min/max angle");
    modifiers.set("DECK_ALL CANNON_RELOAD_TIME", "Cannon reload time");
    modifiers.set("DECK_ALL FIRE_PROBABILITY", "Fire probability");
    modifiers.set(
        "DECK_CENTRAL CANNON_DISPERSION_PER100M,CANNON_DISPERSION_VERTICAL_PER100M",
        "Mortar dispersion per 100m, Mortar vertical dispersion per 100m"
    );
    modifiers.set("DECK_CENTRAL CANNON_DISPERSION_REDUCTION_SPEED", "Mortar dispersion reduction speed");
    modifiers.set("MAST MAST_BOTTOM_SECTION_HP,MAST_MIDDLE_SECTION_HP,MAST_TOP_SECTION_HP", "Mast health");
    modifiers.set("MAST MAST_TOP_SECTION_HP,MAST_MIDDLE_SECTION_HP,MAST_BOTTOM_SECTION_HP", "Mast health");
    modifiers.set("NONE AXES_ATTACK_BONUS", "Boarding attack");
    modifiers.set("NONE AXES_DISENGAGE_DURATION", "Boarding disengage time");
    modifiers.set("NONE BARRICADES_FIREPOWER_BONUS", "Boarding firepower");
    modifiers.set("NONE BARRICADES_MELEE_BONUS", "Boarding melee");
    modifiers.set("NONE BOARDING_ATTACK_BONUS", "Boarding attack");
    modifiers.set("NONE BOARDING_DEFENSE_BONUS", "Boarding defense");
    modifiers.set("NONE CREW_TRANSFER_SPEED", "Crew transfer speed");
    modifiers.set("NONE DECK_GUNS_ACCURACY_BONUS", "Deck guns accuracy");
    modifiers.set("NONE FIRE_DECREASE_RATE", "Fire resistance");
    modifiers.set("NONE FIREZONE_MAX_HORIZONTAL_ANGLE", "Firezone max horizontal angle");
    modifiers.set("NONE GLOBAL_SIDEBOARD_WATER_FLOW", "Sideboard water flow");
    modifiers.set("NONE GRENADES_BONUS", "Grenades");
    modifiers.set("NONE GROG_ACCURACY_PENALTY", "Accuracy");
    modifiers.set("NONE GROG_ATTACK_BONUS", "Boarding attack");
    modifiers.set("NONE HANDBOOK_ATTACK_BONUS", "Boarding attack");
    modifiers.set("NONE HANDBOOK_DEFENSE_BONUS", "Boarding defense");
    modifiers.set("NONE HANDBOOK_MORALE_BONUS", "Boarding morale");
    modifiers.set("NONE HOLE_DECREASE_RATE,RAM_DECREASE_RATE", "Hole and ram decrease rate");
    modifiers.set("NONE LADDERS_MELEE_PENALTY_REDUCE", "Boarding melee");
    modifiers.set("NONE MARINES_FIREPOWER_MODIFIER", "Boarding firepower");
    modifiers.set("NONE MARINES_LEVEL", "Marines level");
    modifiers.set("NONE MARINES_MELEE_MODIFIER", "Boarding melee");
    modifiers.set("NONE MARINES_PERCENTAGE", "Marines");
    modifiers.set("NONE MAST_PHYSICS_JIB_SAIL_FORCE_BONUS", "Jib force");
    modifiers.set("NONE MAST_PHYSICS_MAIN_SAIL_FORCE_BONUS", "Main sail force");
    modifiers.set("NONE MAST_PHYSICS_MAIN_SAIL_TORQUE_BONUS", "Main sail torque");
    modifiers.set("NONE MAST_PHYSICS_SPANKER_SAIL_FORCE_BONUS", "Spanker sail force");
    modifiers.set("NONE MUSKETS_ACCURACY_BONUS", "Muskets accuracy");
    modifiers.set("NONE MUSKETS_PERCENTAGE_OF_CREW", "Crew with muskets");
    modifiers.set("NONE PERK_BOARDING_ATTACK_COST_MODIFIER", "Boarding attack cost");
    modifiers.set("NONE PERK_BOARDING_DEFEND_COST_MODIFIER", "Boarding defend cost");
    modifiers.set("NONE PERK_BOARDING_ENEMY_EXTRA_CREW_REQUIREMENT", "Enemy boarding crew needed");
    modifiers.set("NONE PERK_BOARDING_ENEMY_MORALE_LOSS_MODIFIER", "Enemy boarding morale loss");
    modifiers.set("NONE PERK_CARRONADE_DISPERSION_MODIFIER", "Carronade dispersion");
    modifiers.set("NONE PERK_CONTROL_EXIT_TIMER_OVERRIDE_DISTANCE", "Control distance");
    modifiers.set("NONE PERK_CRAFT_CREW_HIRE_COST_MODIFIER", "Crew hire cost");
    modifiers.set("NONE PERK_CRAFT_DROP_RECIPE_CHANCE_MODIFIER", "CRAFT_DROP_RECIPE_CHANCE_MODIFIER");
    modifiers.set("NONE PERK_CRAFT_FRIGATE_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft frigate");
    modifiers.set("NONE PERK_CRAFT_LIGHT_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft unrated ship");
    modifiers.set("NONE PERK_CRAFT_LINE_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft ship of the line");
    modifiers.set("NONE PERK_CRAFT_SHIP_LABOR_PRICE_MODIFIER", "Labour hours to craft any ship");
    modifiers.set("NONE PERK_CREW_REPAIR_PERCENT_MODIFIER", "Crew repair");
    modifiers.set("NONE PERK_DONT_CONSUME_BATTLE_REPAIRS", "DONT_CONSUME_BATTLE_REPAIRS");
    modifiers.set("NONE PERK_EMERGENCY_REPAIR_COOLDOWN_MODIFIER", "Emergency repair cooldown");
    modifiers.set("NONE PERK_ENABLE_DOUBLE_CHARGE", "Double charge");
    modifiers.set("NONE PERK_ENABLE_DOUBLE_SHOT", "Double shot");
    modifiers.set("NONE PERK_FISHING_DROP_CHANCE_MODIFIER", "Fish");
    modifiers.set("NONE PERK_HEEL_DEGREES_MODIFIER", "Heel degrees");
    modifiers.set("NONE PERK_HOLD_MAX_WEIGHT_MODIFIER", "Hold weight");
    modifiers.set("NONE PERK_HULL_REPAIR_PERCENT_MODIFIER", "Hull repair amount");
    modifiers.set("NONE PERK_LABOR_HOURS_GENERATION_MODIFIER", "Labour hour generation");
    modifiers.set("NONE PERK_LABOR_HOURS_WALLET_MODIFIER", "Labour hour wallet");
    modifiers.set("NONE PERK_MAX_FLEET_SIZE_MODIFIER", "Fleet ships");
    modifiers.set("NONE PERK_MORTAR_BALL_COUNT_MODIFIER", "Additional mortar balls");
    modifiers.set("NONE PERK_MORTAR_DISPERSION_MODIFIER", "Mortar dispension");
    modifiers.set("NONE PERK_MORTAR_RELOAD_TIME_MODIFIER", "Mortar reload time");
    modifiers.set("NONE PERK_NATIONAL_HUNTER_SPEED_ADD_MODIFIER", "National hunter speed modifier");
    modifiers.set("NONE PERK_PIRATE_HUNTER_RELOAD_TIME_MODIFIER", "Pirate hunter reload time");
    modifiers.set("NONE PERK_PRESS_GANG", "Press gang");
    modifiers.set("NONE PERK_PUMP_WATER_BAILING_MODIFIER", "Pump water bailing");
    modifiers.set("NONE PERK_RECOVER_LOST_CREW_PERCENT", "Recover lost crew");
    modifiers.set("NONE PERK_SAIL_DAMAGE_MODIFIER", "Sail damage");
    modifiers.set("NONE PERK_SAIL_REPAIR_PERCENT_MODIFIER", "Sail repair amount");
    modifiers.set("NONE PERK_SHIP_EXTRA_CHAIN_UNITS", "Additional chains");
    modifiers.set("NONE PERK_SHIP_EXTRA_DOBULE_CHARGE_UNITS", "Additional double charges"); // typo
    modifiers.set("NONE PERK_SHIP_EXTRA_DOUBLE_CHARGE_UNITS", "Additional double charges");
    modifiers.set("NONE PERK_SHIP_EXTRA_DOUBLE_SHOT_UNITS", "Additional double shots");
    modifiers.set("NONE PERK_SHIP_MASTER_CLASS_TYPE", "Ship master class type");
    modifiers.set("NONE PERK_SHIP_MASTER_RELOAD_TIME_MODIFIER", "Ship master reload time modifier");
    modifiers.set("NONE PERK_SHIP_MASTER_REPAIR_COUNT_ADD_MODIFIER", "Additional repairs");
    modifiers.set("NONE PERK_SHIP_MASTER_SPEED_ADD_MODIFIER", "Ship master speed add modifier");
    modifiers.set("NONE PERK_SOLD_SHIP_PRICE_MODIFIER", "Ship sell price");
    modifiers.set("NONE PERK_START_ALL_GUNS_LOADED", "Guns loaded at start");
    modifiers.set("NONE PREPARATION_BONUS_PER_ROUND", "Preparation bonus per round");
    modifiers.set("NONE RHEA_TURN_SPEED", "Yard turn speed");
    modifiers.set("NONE SAIL_RISING_SPEED", "Sail rising speed");
    modifiers.set("NONE SHIP_BOARDING_PREPARATION_BONUS", "Boarding preparation bonus");
    modifiers.set("NONE SHIP_EXTRA_CHAIN_UNITS", "Additional chains");
    modifiers.set("NONE SHIP_EXTRA_DOBULE_CHARGE_UNITS", "Additional double charges"); // typo
    modifiers.set("NONE SHIP_EXTRA_DOUBLE_CHARGE_UNITS", "Additional double charges");
    modifiers.set("NONE SHIP_EXTRA_DOUBLE_SHOT_UNITS", "Additional double shots");
    modifiers.set("NONE SHIP_MATERIAL", "Ship material");
    modifiers.set("NONE SHIP_MAX_ROLL_ANGLE", "Max roll angle");
    modifiers.set("NONE SHIP_PHYSICS_DEC_COEF", "Speed decrease");
    modifiers.set("NONE SHIP_REPAIR_SAIL_CREW_REQUIREMENT,SHIP_REPAIR_ARMOR_CREW_REQUIREMENT", "Repair crew needed");
    modifiers.set("NONE SHIP_TURNING_SPEED_RHEAS", "Yard turn speed");
    modifiers.set("NONE WATER_PUMP_BAILING", "Water pump bailing");
    modifiers.set("POWDER POWDER_RADIUS", "Powder radius");
    modifiers.set("POWDER REPAIR_MODULE_TIME", "Powder repair module time");
    modifiers.set("REPAIR_ARMOR REPAIR_PERCENT", "Armour repair");
    modifiers.set("REPAIR_GENERIC REPAIR_PERCENT", "Generic repair amount");
    modifiers.set("REPAIR_SAIL REPAIR_PERCENT", "Sail repair");
    modifiers.set("RUDDER MODULE_BASE_HP", "Rudder health");
    modifiers.set("RUDDER REPAIR_MODULE_TIME", "Rudder repair time");
    modifiers.set("SAIL MODULE_BASE_HP", "Sail health");
    modifiers.set("SAIL REPAIR_MODULE_TIME", "Sail repair time");
    modifiers.set("SAIL SAILING_CREW_REQUIRED", "Sailing crew");
    modifiers.set("STRUCTURE CANNON_MASS", "Cannon mass");
    modifiers.set("STRUCTURE SHIP_CANNON_DESTROY_PROBABILITY", "Cannon destroy probability");
    modifiers.set("WATER_PUMP MODULE_BASE_HP", "Water pump health");
    modifiers.set("WATER_PUMP REPAIR_MODULE_TIME", "Water pump repair time");

    /**
     * Set wood properties
     * @param {Object} module Module data.
     * @returns {void}
     */
    function setWood(module) {
        const wood = {};
        wood.id = module.id;
        wood.properties = [];
        module.APImodifiers.forEach(modifier => {
            // Add modifier if in modifier map
            if (modifiers.has(`${modifier.Slot} ${modifier.MappingIds}`)) {
                let amount = modifier.Percentage;
                if (
                    modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Fire resistance" ||
                    modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Leak resistance" ||
                    modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Rudder speed"
                ) {
                    amount = -amount;
                } else if (modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Crew protection") {
                    amount = modifier.Absolute * 100;
                }
                wood.properties.push({
                    modifier: modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`),
                    amount
                });
            }
        });
        if (module.name.endsWith(" Planking") || module.name === "Crew Space") {
            wood.type = "Trim";
            wood.name = module.name.replace(" Planking", "");
            woodJson.trim.push(wood);
        } else {
            wood.type = "Frame";
            wood.name = module.name.replace(" Frame", "");
            woodJson.frame.push(wood);
        }
        // Sort by modifier
        ["frame", "trim"].forEach(type => {
            woodJson[type].forEach(APIwood => {
                APIwood.properties.sort((a, b) => {
                    if (a.modifier < b.modifier) {
                        return -1;
                    }
                    if (a.modifier > b.modifier) {
                        return 1;
                    }
                    return 0;
                });
            });
        });
    }

    /**
     * Set module modifier properties
     * @param {Object} module Module data.
     * @returns {void}
     */
    function setModuleModifier(module) {
        // eslint-disable-next-line no-param-reassign
        module.properties = [];
        module.APImodifiers.forEach(modifier => {
            if (!modifiers.has(`${modifier.Slot} ${modifier.MappingIds}`)) {
                console.log(`${modifier.Slot} ${modifier.MappingIds} modifier undefined`);
            }
            let amount =
                modifier.Absolute !== 0
                    ? Math.abs(modifier.Absolute) >= 1
                        ? modifier.Absolute
                        : Math.round(modifier.Absolute * 10000) / 100
                    : modifier.Percentage;
            if (
                modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Fire resistance" ||
                modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Leak resistance" ||
                modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Rudder speed"
            ) {
                amount = -amount;
            } else if (modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`) === "Crew protection") {
                amount = Math.round(modifier.Absolute * 10000) / 100;
            }
            module.properties.push({
                modifier: modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`),
                amount,
                absolute: modifier.Absolute !== 0 && modifier.Absolute >= 1
            });
        });
        // eslint-disable-next-line no-param-reassign
        delete module.APImodifiers;
    }

    /**
     * Set module type
     * @param {Object} module Module data.
     * @returns {void}
     */
    function setModuleType(module) {
        // Correct module types
        if (module.name.endsWith("French Rig Refit") || module.name === "Bridgetown Frame Refit") {
            module.sortingGroup = "survival";
        }

        if (
            module.usageType === "All" &&
            module.sortingGroup === "speed_turn" &&
            module.moduleLevel === "U" &&
            module.moduleType === "Hidden"
        ) {
            module.type = "Ship trim";
        } else if (module.isBowFigure) {
            module.type = "Bow figure";
        } else if (module.moduleType === "Permanent" && !module.name.endsWith(" Bonus") && !module.isBowFigure) {
            module.type = "Permanent";
        } else if (
            module.usageType === "All" &&
            module.sortingGroup === "" &&
            module.moduleLevel === "U" &&
            module.moduleType === "Hidden"
        ) {
            module.type = "Perk";
        } else if (module.moduleType === "Regular") {
            module.type = "Ship knowledge";
        } else {
            module.type = "Not used";
        }

        module.sortingGroup =
            module.sortingGroup && module.type !== "Ship trim"
                ? `\u202f\u2013\u202f${capitalizeFirstLetter(module.sortingGroup).replace("_", "/")}`
                : "";
        module.type = `${module.type}${module.sortingGroup}`;

        moduleRate.forEach(rate => {
            rate.names.forEach(name => {
                if (module.name.endsWith(name)) {
                    module.name = module.name.replace(name, "");
                    module.moduleLevel = rate.level;
                }
            });
        });

        delete module.isBowFigure;
        delete module.moduleType;
        delete module.sortingGroup;
    }

    apiItems.filter(item => item.ItemType === "Module").forEach(apiMpdule => {
        let dontSave = false;
        const module = {
            id: apiMpdule.Id,
            name: apiMpdule.Name.replaceAll("'", "’").replace("Bow figure - ", ""),
            usageType: apiMpdule.UsageType,
            APImodifiers: apiMpdule.Modifiers,
            sortingGroup: apiMpdule.SortingGroup.replace("module:", ""),
            isBowFigure: apiMpdule.bIsBowFigure,
            isStackable: apiMpdule.bCanBeSetWithSameType,
            // minResourcesAmount: APImodule.MinResourcesAmount,
            // maxResourcesAmount: APImodule.MaxResourcesAmount,
            // breakUpItemsAmount: APImodule.BreakUpItemsAmount,
            // canBeBreakedUp: APImodule.CanBeBreakedUp,
            // bCanBeBreakedUp: APImodule.bCanBeBreakedUp,
            moduleType: apiMpdule.ModuleType,
            moduleLevel: levels.get(apiMpdule.ModuleLevel)
        };

        // Ignore double entries
        if (!modules.has(module.name + module.moduleLevel)) {
            // Check for wood module
            if (module.name.endsWith(" Planking") || module.name.endsWith(" Frame") || module.name === "Crew Space") {
                setWood(module);
                dontSave = true;
            } else {
                setModuleModifier(module);
                setModuleType(module);
                if (
                    module.type.startsWith("Not used") ||
                    module.name === "Gifted" ||
                    module.name === "Coward" ||
                    module.name === "Doctor" ||
                    module.name === "Dreadful" ||
                    module.name === "Expert Surgeon" ||
                    module.name === "Frigate Master" ||
                    module.name === "Gifted" ||
                    module.name === "Light Ship Master" ||
                    module.name === "Lineship Master" ||
                    module.name === "Press Gang" ||
                    module.name === "Signaling" ||
                    module.name === "Thrifty" ||
                    module.name === "Lead Sheating" ||
                    module.name === "TEST MODULE SPEED IN OW" ||
                    module.name === "Cannon nation module - France" ||
                    module.name.endsWith(" - OLD")
                ) {
                    dontSave = true;
                } else {
                    // console.log(module.id, module.name);
                }
            }
            modules.set(module.name + module.moduleLevel, dontSave ? {} : module);
        }
    });

    let result = Array.from(modules.values());
    result = result
        .filter(module => Object.keys(module).length)
        .sort((a, b) => {
            if (a.type < b.type) {
                return -1;
            }
            if (a.type > b.type) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            if (a.moduleLevel < b.moduleLevel) {
                return -1;
            }
            if (a.moduleLevel > b.moduleLevel) {
                return 1;
            }
            return 0;
        });
    const grouped = Array.from(groupBy(result, module => module.type));

    saveJson(`${outDir}/modules.json`, grouped);
    saveJson(`${outDir}/woods.json`, woodJson);
}

convertModules();
