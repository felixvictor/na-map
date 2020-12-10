/*!
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { getOrdinal } from "../common/common-math";
import { cleanName, sortBy } from "../common/common-node";
import { serverIds } from "../common/servers";
const secondsPerHour = 3600;
let apiItems;
let itemNames;
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
const getLootItems = (types) => apiItems.filter((item) => !item.NotUsed && types.includes(item.ItemType));
const getLootItemsChance = (chestLootTableId) => {
    const lootTable = apiItems.filter((item) => Number(item.Id) === chestLootTableId);
    return lootTable[0].Items[0].Chance;
};
const getLootContent = (lootItems, itemProbability) => lootItems.map((item) => ({
    id: Number(item.Template),
    name: itemNames.get(Number(item.Template)) ?? "",
    chance: itemProbability.length > 0 ? Number(itemProbability[Number(item.Chance)]) : Number(item.Chance),
    amount: { min: Number(item.Stack?.Min), max: Number(item.Stack?.Max) },
}));
const getChestItems = (lootItems) => lootItems.map((item) => ({
    id: Number(item.Template),
    name: itemNames.get(Number(item.Template)) ?? "",
    amount: { min: Number(item.Stack?.Min), max: Number(item.Stack?.Max) },
}));
const getChestItemsFromChestLootTable = (chestLootTableId) => apiItems.filter((item) => Number(item.Id) === chestLootTableId).flatMap((item) => getChestItems(item.Items ?? []));
const convertLoot = async () => {
    const data = {};
    const loot = getLootItems(["ShipLootTableItem"]);
    data.loot = loot
        .map((item) => ({
        id: Number(item.Id),
        name: getLootName(Number(item.Class), item.EventLootTable),
        items: getLootContent(item.Items ?? [], item.itemProbability ?? [0]).sort(sortBy(["chance", "id"])),
    }))
        .sort(sortBy(["id"]));
    const chests = getLootItems(["TimeBasedConvertibleItem"]);
    data.chests = chests
        .map((item) => ({
        id: Number(item.Id),
        name: cleanName(item.Name),
        weight: Number(item.ItemWeight),
        lifetime: Number(item.LifetimeSeconds) / secondsPerHour,
        itemGroup: item.ExtendedLootTable?.map((lootChestLootTableId) => ({
            chance: getLootItemsChance(lootChestLootTableId),
            items: getChestItemsFromChestLootTable(lootChestLootTableId).sort(sortBy(["id"])),
        })).sort(sortBy(["chance"])),
    }))
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileLoot, data);
};
export const convertLootData = () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`));
    itemNames = new Map(apiItems.map((item) => [Number(item.Id), getLootItemName(item.Name, item.ItemType)]));
    void convertLoot();
};
//# sourceMappingURL=convert-loot.js.map