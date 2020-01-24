/**
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import {
    cleanName,
    commonPaths,
    getOrdinal,
    readJson,
    saveJsonAsync,
    sortBy,
    baseAPIFilename,
    serverNames,
    serverStartDate as serverDate
} from "./common.mjs";

let apiItems = [];

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

const convertLoot = async () => {
    /**
     * Get item names
     * @return {Map<number, string>} Item names<id, name>
     */
    const getItemNames = () =>
        new Map(apiItems.map(item => [Number(item.Id), getLootItemName(item.Name, item.ItemType)]));

    const itemNames = getItemNames();

    const getLootItemsFromChestLootTable = chestLootTableId =>
        apiItems.filter(item => Number(item.Id) === chestLootTableId).flatMap(item => getLootItems(item.Items));

    const getLootItems = (lootItems, itemProbability = []) =>
        lootItems.map(item => ({
            id: Number(item.Template),
            name: itemNames.has(Number(item.Template)) ? itemNames.get(Number(item.Template)) : Number(item.Template),
            chance: itemProbability.length ? Number(itemProbability[Number(item.Chance)]) : Number(item.Chance),
            amount: { min: Number(item.Stack.Min), max: Number(item.Stack.Max) }
        }));

    const data = {};

    let types = ["ShipLootTableItem"];
    data.loot = apiItems
        .filter(item => !item.NotUsed && types.includes(item.ItemType))
        .map(item => ({
            id: Number(item.Id),
            name: getLootName(Number(item.Class), item.EventLootTable),
            items: getLootItems(item.Items, item.itemProbability).sort(sortBy(["chance", "id"]))
        }))
        .sort(sortBy(["class", "id"]));

    types = ["TimeBasedConvertibleItem"];
    data.chests = apiItems
        .filter(item => !item.NotUsed && types.includes(item.ItemType))
        .map(item => ({
            id: Number(item.Id),
            name: cleanName(item.Name),
            weight: Number(item.ItemWeight),
            lifetime: Number(item.LifetimeSeconds) / (60 * 60),
            items: item.ExtendedLootTable.map(lootChestLootTableId =>
                getLootItemsFromChestLootTable(lootChestLootTableId)
            )
                .reduce((acc, value) => acc.concat(value), [])
                .sort(sortBy(["chance", "id"]))
        }))
        .sort(sortBy(["id"]));

    await saveJsonAsync(commonPaths.fileLoot, data);
};

export const convertLootData = () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));

    convertLoot();
};
