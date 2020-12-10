/*!
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import path from "path"

import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { readJson, saveJsonAsync } from "../common/common-file"
import { getOrdinal } from "../common/common-math"
import { cleanName, sortBy } from "../common/common-node"
import { serverIds } from "../common/servers"

import {
    APIItemGeneric,
    ItemsEntity,
    APILootTableItem,
    APITimeBasedConvertibleItem,
    APIShipLootTableItem,
} from "./api-item"
import { LootChestItemsEntity, Loot, LootChestsEntity, LootLootItemsEntity, LootLootEntity } from "../common/gen-json"

const secondsPerHour = 3600

let apiItems: APIItemGeneric[]
let itemNames: Map<number, string>

const getLootName = (classId: number, isMission: boolean): string => {
    if (classId === -1) {
        return "Trader bot (open world)"
    }

    return `${getOrdinal(classId, false)} rate bot (${isMission ? "mission" : "open world"})`
}

const getLootItemName = (name: string, type: string): string => {
    let cleanedName = cleanName(name)

    if (type === "Recipe" && !cleanedName.endsWith("Blueprint")) {
        cleanedName = cleanedName.concat(" Blueprint")
    }

    return cleanedName
}

const getLootItems = (types: string[]) => apiItems.filter((item) => !item.NotUsed && types.includes(item.ItemType))

const getLootItemsChance = (chestLootTableId: number): number => {
    const lootTable = apiItems.filter((item) => Number(item.Id) === chestLootTableId) as APILootTableItem[]
    return lootTable[0].Items[0].Chance
}

const getLootContent = (lootItems: ItemsEntity[], itemProbability: number[]): LootLootItemsEntity[] =>
    lootItems.map(
        (item): LootLootItemsEntity => ({
            id: Number(item.Template),
            name: itemNames.get(Number(item.Template)) ?? "",
            chance: itemProbability.length > 0 ? Number(itemProbability[Number(item.Chance)]) : Number(item.Chance),
            amount: { min: Number(item.Stack?.Min), max: Number(item.Stack?.Max) },
        })
    )

const getChestItems = (lootItems: ItemsEntity[]): LootChestItemsEntity[] =>
    lootItems.map((item) => ({
        id: Number(item.Template),
        name: itemNames.get(Number(item.Template)) ?? "",
        amount: { min: Number(item.Stack?.Min), max: Number(item.Stack?.Max) },
    }))

const getChestItemsFromChestLootTable = (chestLootTableId: number): LootChestItemsEntity[] =>
    apiItems.filter((item) => Number(item.Id) === chestLootTableId).flatMap((item) => getChestItems(item.Items ?? []))

const convertLoot = async (): Promise<void> => {
    const data = {} as Loot

    // Loot
    const loot = getLootItems(["ShipLootTableItem"]) as APIShipLootTableItem[]
    data.loot = loot
        .map(
            (item) =>
                ({
                    id: Number(item.Id),
                    name: getLootName(Number(item.Class), item.EventLootTable),
                    items: getLootContent(item.Items ?? [], item.itemProbability ?? [0]).sort(sortBy(["chance", "id"])),
                } as LootLootEntity)
        )
        .sort(sortBy(["id"]))

    // Chests
    const chests = getLootItems(["TimeBasedConvertibleItem"]) as APITimeBasedConvertibleItem[]
    data.chests = chests
        .map(
            (item) =>
                ({
                    id: Number(item.Id),
                    name: cleanName(item.Name),
                    weight: Number(item.ItemWeight),
                    lifetime: Number(item.LifetimeSeconds) / secondsPerHour,
                    itemGroup: item.ExtendedLootTable?.map((lootChestLootTableId) => ({
                        chance: getLootItemsChance(lootChestLootTableId),
                        items: getChestItemsFromChestLootTable(lootChestLootTableId).sort(sortBy(["id"])),
                    })).sort(sortBy(["chance"])),
                } as LootChestsEntity)
        )
        .sort(sortBy(["id"]))

    await saveJsonAsync(commonPaths.fileLoot, data)
}

export const convertLootData = (): void => {
    apiItems = readJson(path.resolve(baseAPIFilename, `${serverIds[0]}-ItemTemplates-${serverDate}.json`))
    itemNames = new Map(apiItems.map((item) => [Number(item.Id), getLootItemName(item.Name, item.ItemType)]))

    void convertLoot()
}
