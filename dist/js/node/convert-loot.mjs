/*!
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as path from "path";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { getOrdinal } from "../common/common-math";
import { cleanName, sortBy } from "../common/common-node";
import { serverNames } from "../common/common-var";
let apiItems;
const secondsPerHour = 3600;
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
    const getItemNames = () => new Map(apiItems.map((item) => [Number(item.Id), getLootItemName(item.Name, item.ItemType)]));
    const itemNames = getItemNames();
    const getLootItems = (lootItems, itemProbability = []) => lootItems.map((item) => {
        var _a, _b, _c;
        return ({
            id: Number(item.Template),
            name: (_a = itemNames.get(Number(item.Template))) !== null && _a !== void 0 ? _a : "",
            chance: itemProbability.length > 0 ? Number(itemProbability[Number(item.Chance)]) : Number(item.Chance),
            amount: { min: Number((_b = item.Stack) === null || _b === void 0 ? void 0 : _b.Min), max: Number((_c = item.Stack) === null || _c === void 0 ? void 0 : _c.Max) },
        });
    });
    const getLootItemsFromChestLootTable = (chestLootTableId) => apiItems
        .filter((item) => Number(item.Id) === chestLootTableId)
        .flatMap((item) => { var _a; return getLootItems((_a = item.Items) !== null && _a !== void 0 ? _a : []); });
    const data = {};
    let types = ["ShipLootTableItem"];
    const loot = apiItems.filter((item) => !item.NotUsed && types.includes(item.ItemType));
    data.loot = loot
        .map((item) => {
        var _a, _b;
        return ({
            id: Number(item.Id),
            name: getLootName(Number(item.Class), item.EventLootTable),
            items: getLootItems((_a = item.Items) !== null && _a !== void 0 ? _a : [], (_b = item.itemProbability) !== null && _b !== void 0 ? _b : [0]).sort(sortBy(["chance", "id"])),
        });
    })
        .sort(sortBy(["name", "id"]));
    types = ["TimeBasedConvertibleItem"];
    const chests = apiItems.filter((item) => !item.NotUsed && types.includes(item.ItemType));
    data.chests = chests
        .map((item) => {
        var _a;
        return ({
            id: Number(item.Id),
            name: cleanName(item.Name),
            weight: Number(item.ItemWeight),
            lifetime: Number(item.LifetimeSeconds) / secondsPerHour,
            items: (_a = item.ExtendedLootTable) === null || _a === void 0 ? void 0 : _a.map((lootChestLootTableId) => getLootItemsFromChestLootTable(lootChestLootTableId)).reduce((acc, value) => acc.concat(value), []).sort(sortBy(["chance", "id"])),
        });
    })
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.fileLoot, data);
};
export const convertLootData = () => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
    convertLoot();
};
//# sourceMappingURL=convert-loot.js.map