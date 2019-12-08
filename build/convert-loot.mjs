/**
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { cleanName, getOrdinal, readJson, saveJson, sortBy } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

const getLootName = (classId, isMission) => {
    if (classId === -1) {
        return "Trader bot (open world)";
    }

    return `${getOrdinal(classId, false)} rate bot (${isMission ? "mission" : "open world"})`;
};

const getLootItemName = (name, type) => {
    let cleanedName = cleanName(name);

    if (type === "Recipe" && !cleanedName.endsWith("Blueprint")) {
        cleanedName = cleanedName.concat(" Blueprint");
    }

    return cleanedName;
};

function convertLoot() {
    /**
     * Get item names
     * @return {Map<number, string>} Item names<id, name>
     */
    const getItemNames = () =>
        new Map(APIItems.map(item => [Number(item.Id), getLootItemName(item.Name, item.ItemType)]));

    const itemNames = getItemNames();

    const getLootItemsFromChestLootTable = chestLootTableId =>
        APIItems.filter(item => Number(item.Id) === chestLootTableId).flatMap(item => getLootItems(item.Items));

    const getLootItems = (lootItems, itemProbability = []) =>
        lootItems.map(item => ({
            id: Number(item.Template),
            name: itemNames.has(Number(item.Template)) ? itemNames.get(Number(item.Template)) : Number(item.Template),
            chance: itemProbability.length ? Number(itemProbability[Number(item.Chance)]) : Number(item.Chance),
            amount: { min: Number(item.Stack.Min), max: Number(item.Stack.Max) }
        }));

    const data = {};

    let types = ["ShipLootTableItem"];
    data.loot = APIItems.filter(item => !item.NotUsed && types.includes(item.ItemType))
        .map(item => ({
            id: Number(item.Id),
            name: getLootName(Number(item.Class), item.EventLootTable),
            items: getLootItems(item.Items, item.itemProbability).sort(sortBy(["chance", "name"]))
        }))
        .sort(sortBy(["class", "name"]));

    types = ["TimeBasedConvertibleItem"];
    data.chests = APIItems.filter(item => !item.NotUsed && types.includes(item.ItemType))
        .map(item => ({
            id: Number(item.Id),
            name: cleanName(item.Name),
            weight: Number(item.ItemWeight),
            lifetime: Number(item.LifetimeSeconds) / (60 * 60),
            items: item.ExtendedLootTable.map(lootChestLootTableId =>
                getLootItemsFromChestLootTable(lootChestLootTableId)
            )
                .reduce((acc, value) => acc.concat(value), [])
                .sort(sortBy(["chance", "name"]))
        }))
        .sort(sortBy(["name"]));

    saveJson(outFilename, data);
}

convertLoot();
