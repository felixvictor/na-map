/**
 * This file is part of na-map.
 *
 * @file      Convert loot tables.
 * @module    build/convert-loot
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"
import { cleanName, getOrdinal, readJson, saveJsonAsync, serverNames, sortBy } from "../common"
import { commonPaths, baseAPIFilename, serverStartDate as serverDate } from "./common-node"
import { APIItem, ItemsEntity, APIShipLootTableItem, APITimeBasedConvertibleItem } from "./api-item"
import { Loot, LootChestsEntity, LootItemsEntity, LootLootEntity } from "../gen-json"

let apiItems: APIItem[]
const secondsPerHour = 3600

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

const convertLoot = async () => {
    /**
     * Get item names
     * @returns Item names Map<id, name>
     */
    const getItemNames = (): Map<number, string> =>
        new Map(apiItems.map(item => [Number(item.Id), getLootItemName(item.Name, item.ItemType)]))

    const itemNames = getItemNames()

    const getLootItems = (lootItems: ItemsEntity[], itemProbability: number[] = []): LootItemsEntity[] =>
        lootItems.map(
            (item): LootItemsEntity => ({
                id: Number(item.Template),
                name: itemNames.get(Number(item.Template)) ?? "",
                chance: itemProbability.length ? Number(itemProbability[Number(item.Chance)]) : Number(item.Chance),
                amount: { min: Number(item.Stack?.Min), max: Number(item.Stack?.Max) }
            })
        )

    const getLootItemsFromChestLootTable = (chestLootTableId: number) =>
        apiItems.filter(item => Number(item.Id) === chestLootTableId).flatMap(item => getLootItems(item.Items ?? []))

    const data = {} as Loot

    let types = ["ShipLootTableItem"]
    const loot = (apiItems.filter(
        item => !item.NotUsed && types.includes(item.ItemType)
    ) as unknown) as APIShipLootTableItem[]
    data.loot = loot
        .map(
            (item): LootLootEntity => ({
                id: Number(item.Id),
                name: getLootName(Number(item.Class), item.EventLootTable),
                // @ts-ignore
                items: getLootItems(item.Items ?? [], item.itemProbability ?? [0]).sort(sortBy(["chance", "id"]))
            })
        )
        // @ts-ignore
        .sort(sortBy(["class", "id"]))

    types = ["TimeBasedConvertibleItem"]
    const chests = (apiItems.filter(
        item => !item.NotUsed && types.includes(item.ItemType)
    ) as unknown) as APITimeBasedConvertibleItem[]
    data.chests = chests
        .map(
            (item): LootChestsEntity => ({
                id: Number(item.Id),
                name: cleanName(item.Name),
                weight: Number(item.ItemWeight),
                lifetime: Number(item.LifetimeSeconds) / secondsPerHour,
                items: item.ExtendedLootTable?.map(lootChestLootTableId =>
                    getLootItemsFromChestLootTable(lootChestLootTableId)
                )
                    .reduce((acc, value) => acc.concat(value), [])
                    // @ts-ignore
                    .sort(sortBy(["chance", "id"]))
            })
        )
        // @ts-ignore
        .sort(sortBy(["id"]))

    await saveJsonAsync(commonPaths.fileLoot, data)
}

export const convertLootData = () => {
    apiItems = (readJson(
        path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`)
    ) as unknown) as APIItem[]

    convertLoot()
}
