import { readJson, saveJson } from "./common.mjs";

const itemsFilename = process.argv[2],
    outDir = process.argv[3],
    date = process.argv[4];

const APIItems = readJson(`${itemsFilename}-ItemTemplates-${date}.json`);

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
        woodJson = {};

    woodJson.trim = [];
    woodJson.frame = [];

    levels.set("Universal", "U");
    levels.set("Regular", "R");
    levels.set("LightShips", "S");
    levels.set("Medium", "M");
    levels.set("Lineships", "L");

    modifiers.set("ARMOR_ALL_SIDES ARMOR_THICKNESS", "Thickness");
    modifiers.set("ARMOR_ALL_SIDES MODULE_BASE_HP", "Structure health");
    modifiers.set("CREW MODULE_BASE_HP", "Crew");
    modifiers.set("INTERNAL_STRUCTURE MODULE_BASE_HP", "Side armour");
    modifiers.set("NONE CREW_DAMAGE_RECEIVED_DECREASE_PERCENT", "Crew damage");
    modifiers.set("NONE GROG_MORALE_BONUS", "Grog morale bonus");
    modifiers.set("NONE RUDDER_HALFTURN_TIME", "Rudder speed");
    modifiers.set("NONE SHIP_MAX_SPEED", "Ship speed");
    modifiers.set("NONE SHIP_PHYSICS_ACC_COEF", "Acceleration");
    modifiers.set("NONE SHIP_TURNING_SPEED", "Turn speed");
    modifiers.set("SAIL MAST_THICKNESS", "Mast thickness");
    modifiers.set("STRUCTURE FIRE_INCREASE_RATE", "Fire probability");
    modifiers.set("STRUCTURE SHIP_PHYSICS_ACC_COEF", "Acceleration");
    modifiers.set("STRUCTURE SHIP_STRUCTURE_LEAKS_PER_SECOND", "Leak resistance");

    APIItems.filter(item => item.ItemType === "Module").forEach(APImodule => {
        const module = {
            id: APImodule.Id,
            name: APImodule.Name.replaceAll("'", "’"),
            usageType: APImodule.UsageType,
            modifiers: APImodule.Modifiers,
            // maxItems: APImodule.MaxItems,
            // maxStack: APImodule.MaxStack,
            sortingGroup: APImodule.SortingGroup,
            bIsBowFigure: APImodule.bIsBowFigure,
            bCanBeSetWithSameType: APImodule.bCanBeSetWithSameType,
            // minResourcesAmount: APImodule.MinResourcesAmount,
            // maxResourcesAmount: APImodule.MaxResourcesAmount,
            // breakUpItemsAmount: APImodule.BreakUpItemsAmount,
            // canBeBreakedUp: APImodule.CanBeBreakedUp,
            // bCanBeBreakedUp: APImodule.bCanBeBreakedUp,
            // maxModulesCountOnShip: APImodule.MaxModulesCountOnShip,
            moduleType: APImodule.ModuleType,
            moduleLevel: APImodule.ModuleLevel
        };

        module.moduleLevel = levels.get(module.moduleLevel);

        // Ignore double entries
        if (!modules.get(module.name + module.moduleLevel)) {
            if (
                module.name.includes(" Planking") ||
                module.name.includes(" Wood Type") ||
                module.name === "Crew Space"
            ) {
                const wood = {};
                wood.properties = [];
                module.modifiers.forEach(modifier => {
                    // Add modifier if in modifier map
                    if (modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`)) {
                        wood.properties.push({
                            modifier: modifiers.get(`${modifier.Slot} ${modifier.MappingIds}`),
                            amount: modifier.Percentage
                        });
                    }
                });

                if (module.name.includes(" Planking") || module.name === "Crew Space") {
                    wood.type = "Trim";
                    wood.name = module.name.replace(" Planking", "");
                    woodJson.trim.push(wood);
                } else {
                    wood.type = "Frame";
                    wood.name = module.name.replace(" Wood Type", "");
                    woodJson.frame.push(wood);
                }
            }

            modules.set(module.name + module.moduleLevel, module);
        }
    });

    saveJson(`${outDir}/modules.json`, Array.from(modules.values()));
    saveJson(`${outDir}/woods.json`, woodJson);
}

convertModules();
