/**
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { getOrdinal, readJson, saveJson, sortBy } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertLoot() {
    /**
     * Get item names
     * @return {Map<number, string>} Item names<id, name>
     */
    const getItemNames = () => new Map(APIItems.map(item => [item.Id, item.Name.replaceAll("'", "’")]));

    const itemNames = getItemNames();

    const getLootItemsFromChestLootTable = chestLootTableId =>
        APIItems.filter(item => item.Id === chestLootTableId).flatMap(item => getLootItems(item.Items));

    const getLootItems = lootItems =>
        lootItems.map(item => ({
            id: item.Template,
            name: itemNames.has(item.Template) ? itemNames.get(item.Template) : item.Template,
            chance: item.Chance,
            amount: { min: item.Stack.Min, max: item.Stack.Max }
        }));
    const data = {};

    data.loot = APIItems.filter(item => !item.NotUsed && item.ItemType === "ShipLootTableItem")
        .map(item => ({
            id: item.Id,
            name: `${getOrdinal(item.Class, false)} rate AI${item.EventLootTable ? " (mission)" : ""}`,
            itemProbability: item.itemProbability,
            items: getLootItems(item.Items).sort(sortBy(["chance", "name"]))
        }))
        .sort(sortBy(["class", "name"]));

    data.chests = APIItems.filter(item => !item.NotUsed && item.ItemType === "TimeBasedConvertibleItem")
        .map(item => ({
            id: item.Id,
            name: item.Name,
            weight: item.ItemWeight,
            lifetime: item.LifetimeSeconds / (60 * 60),
            items: item.ExtendedLootTable.map(lootChestLootTableId =>
                getLootItemsFromChestLootTable(lootChestLootTableId)
            )
                .reduce((acc, val) => acc.concat(val), [])
                .sort(sortBy(["chance", "name"]))
        }))
        .sort(sortBy(["name"]));

    saveJson(outFilename, data);
}

convertLoot();
