/*
    convert-loot.mjs
 */

import { readJson, saveJson } from "./common.mjs";
import { sortBy } from "./common";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`),
    ItemNames = new Map();

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertLoot() {
    function getItemNames() {
        APIItems.forEach(item => {
            ItemNames.set(item.Id, {
                name: item.Name.replaceAll("'", "’"),
                trading: item.SortingGroup === "Resource.Trading"
            });
        });
    }

    const data = {};
    data.loot = [];
    getItemNames();

    APIItems.filter(item => item.ItemType === "ShipLootTableItem").forEach(item => {
        const loot = {
            id: item.Id,
            name: item.Name,
            class: item.Class,
            lootProbability: item.lootProbability,
            itemProbability: item.itemProbability,
            quantityProbability: item.quantityProbability,
            eventLootTable: item.EventLootTable,
            items: item.Items.map(dropItem => ({
                name: ItemNames.get(dropItem.Template).name,
                chance: dropItem.Chance,
                amount: { min: dropItem.Stack.Min, max: dropItem.Stack.Max }
            }))
        };
        loot.items.sort(sortBy(["chance", "name"]));
        data.loot.push(loot);
    });
    data.loot.sort(sortBy(["class", "name"]));
    saveJson(outFilename, data);
}

convertLoot();
