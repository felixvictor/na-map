/*!
 * This file is part of na-map.
 *
 * @file      Convert server specific port data.
 * @module    convert-server-port-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"
import dayjs from "dayjs"

import d3Collection from "d3-collection"
const { nest: d3Nest } = d3Collection

import { findNationById, nations, nationShortName, NationShortName } from "../common/common"
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir"
import { readJson, saveJsonAsync } from "../common/common-file"
import { Distance } from "../common/common-math"
import { cleanName, simpleStringSort, sortBy } from "../common/common-node"
import { distanceMapSize, serverNames } from "../common/common-var"

import { APIItemGeneric } from "./api-item"
import { APIPort } from "./api-port"
import { APIShop } from "./api-shop"
import { InventoryEntity, NationList, PortBattlePerServer, PortPerServer, Trade } from "../common/gen-json"

interface Item {
    name: string
    weight: number
    itemType: string
    trading: boolean
}

const minProfit = 30000
const frontlinePorts = 2

let apiItems: APIItemGeneric[]
let apiPorts: APIPort[]
let apiShops: APIShop[]

const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`)
const distancesOrig: Distance[] = readJson(distancesFile)
let distances: Map<number, number>
let numberPorts: number

let portData: PortPerServer[]
let itemNames: Map<number, Item>
let itemWeights: Map<string, number>

const getDistance = (fromPortId: number, toPortId: number): number =>
    fromPortId < toPortId
        ? distances.get(fromPortId * numberPorts + toPortId) ?? 0
        : distances.get(toPortId * numberPorts + fromPortId) ?? 0

const getPriceTierQuantity = (id: number): number => apiItems.find((item) => item.Id === id)?.PriceTierQuantity ?? 0

/**
 *
 * @param apiPort - Port data
 */
const setPortFeaturePerServer = (apiPort: APIPort): void => {
    const portShop = apiShops.find((shop) => shop.Id === apiPort.Id)

    if (portShop) {
        const portFeaturesPerServer = {
            id: Number(apiPort.Id),
            portBattleStartTime: apiPort.PortBattleStartTime,
            nonCapturable: apiPort.NonCapturable,
            conquestMarksPension: apiPort.ConquestMarksPension,
            portTax: Math.round(apiPort.PortTax * 100) / 100,
            taxIncome: apiPort.LastTax,
            netIncome: apiPort.LastTax - apiPort.LastCost,
            tradingCompany: apiPort.TradingCompany,
            laborHoursDiscount: apiPort.LaborHoursDiscount,
            dropsTrading: [
                ...new Set(
                    portShop.ResourcesAdded.filter(
                        (good) => itemNames.has(good.Template) && itemNames.get(good.Template)?.trading
                    )
                        .map((good) => itemNames.get(good.Template)?.name)
                        .sort(simpleStringSort)
                ),
            ],
            consumesTrading: [
                ...new Set(
                    portShop.ResourcesConsumed.filter(
                        (good) => itemNames.has(good.Key) && itemNames.get(good.Key)?.trading
                    )
                        .map((good) => itemNames.get(good.Key)?.name)
                        .sort(simpleStringSort)
                ),
            ],
            producesNonTrading: [
                ...new Set(
                    portShop.ResourcesProduced.filter(
                        (good) => itemNames.has(good.Key) && !itemNames.get(good.Key)?.trading
                    )
                        .map((good) => itemNames.get(good.Key)?.name)
                        .sort(simpleStringSort)
                ),
            ],
            dropsNonTrading: [
                ...new Set(
                    portShop.ResourcesAdded.filter(
                        (good) => itemNames.has(good.Template) && !itemNames.get(good.Template)?.trading
                    )
                        .map((good) => itemNames.get(good.Template)?.name)
                        .sort(simpleStringSort)
                ),
            ],
            inventory: portShop.RegularItems.filter((good) => itemNames.get(good.TemplateId)?.itemType !== "Cannon")
                .map(
                    (good) =>
                        ({
                            name: itemNames.get(good.TemplateId)?.name,
                            buyQuantity: good.Quantity === -1 ? good.BuyContractQuantity : good.Quantity,
                            buyPrice: Math.round(good.BuyPrice * (1 + apiPort.PortTax)),
                            sellPrice: Math.round(good.SellPrice / (1 + apiPort.PortTax)),
                            sellQuantity:
                                good.SellContractQuantity === -1
                                    ? getPriceTierQuantity(good.TemplateId)
                                    : good.SellContractQuantity,
                        } as InventoryEntity)
                )
                .sort(sortBy(["name"])),
        } as PortPerServer
        // Delete empty entries
        for (const type of ["dropsTrading", "consumesTrading", "producesNonTrading", "dropsNonTrading"]) {
            if ((portFeaturesPerServer[type] as string[]).length === 0) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete portFeaturesPerServer[type]
            }
        }

        portData.push(portFeaturesPerServer)
    }
}

const setAndSavePortData = async (serverName: string): Promise<void> => {
    for (const apiPort of apiPorts) {
        setPortFeaturePerServer(apiPort)
    }

    await saveJsonAsync(`${commonPaths.dirGenServer}/${serverName}-ports.json`, portData)
}

const setAndSaveTradeData = async (serverName: string): Promise<void> => {
    const trades: Trade[] = []
    for (const buyPort of portData) {
        buyPort.inventory
            .filter((buyGood) => buyGood.buyQuantity > 0)
            .forEach((buyGood) => {
                const { buyPrice, buyQuantity } = buyGood
                for (const sellPort of portData) {
                    const sellGood = sellPort.inventory.find((good) => good.name === buyGood.name)
                    if (sellPort.id !== buyPort.id && sellGood) {
                        const { sellPrice, sellQuantity } = sellGood
                        const quantity = Math.min(buyQuantity, sellQuantity)
                        const profitPerItem = sellPrice - buyPrice
                        const profitTotal = profitPerItem * quantity
                        if (profitTotal >= minProfit) {
                            const trade = {
                                good: buyGood.name,
                                source: { id: Number(buyPort.id), grossPrice: buyPrice },
                                target: { id: Number(sellPort.id), grossPrice: sellPrice },
                                distance: getDistance(buyPort.id, sellPort.id),
                                profitTotal,
                                quantity,
                                weightPerItem: itemWeights.get(buyGood.name) ?? 0,
                            } as Trade
                            trades.push(trade)
                        }
                    }
                }
            })
    }

    trades.sort(sortBy(["profitTotal"]))

    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-trades.json`), trades)
}

const ticks = 621355968000000000
const setAndSavePortBattleData = async (serverName: string): Promise<void> => {
    const pb = apiPorts
        .map(
            (port) =>
                ({
                    id: Number(port.Id),
                    name: cleanName(port.Name),

                    nation: nations[port.Nation].short,
                    capturer: port.Capturer,
                    lastPortBattle: dayjs((port.LastPortBattle - ticks) / 10000).format("YYYY-MM-DD HH:mm"),
                    attackerNation: "",
                    attackerClan: "",
                    attackHostility: 0,
                    portBattle: "",
                } as PortBattlePerServer)
        )
        .sort(sortBy(["id"]))
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-pb.json`), pb)
}

const setAndSaveFrontlines = async (serverName: string): Promise<void> => {
    interface DistanceExtended {
        [index: string]: number | string
        fromPortId: number
        fromPortName: string
        toPortId: number
        toPortName: string
        toPortNation: NationShortName
        distance: number
    }

    interface FANToPort {
        key: string // To port id
        value: number[] | undefined
    }

    interface FANFromPort {
        key: string // From port id
        value: FANValue[] | undefined
    }

    interface FANValue {
        id: number
        nation: NationShortName
    }

    interface FDNPort {
        key: number // From port id
        value: number[] // Port ids
    }

    const outNations = new Set(["NT"])
    const frontlineAttackingNationGroupedByToPort = {} as NationList<FANToPort[]>
    const frontlineAttackingNationGroupedByFromPort = {} as NationList<FANFromPort[]>

    nations
        .filter(({ short: nationShort }) => !outNations.has(nationShort))
        .forEach(({ id: nationId, short: nationShortName }) => {
            const frontlinesFrom = apiPorts
                .filter(
                    ({ Nation: fromPortNation }) =>
                        fromPortNation === nationId || fromPortNation === 0 || fromPortNation === 9
                )
                .flatMap((fromPort) =>
                    apiPorts
                        // toPort must be a capturable port from a nation other than fromNation
                        .filter((toPort) => !toPort.NonCapturable && toPort.Nation !== fromPort.Nation)
                        .map(
                            (toPort) =>
                                ({
                                    fromPortId: Number(fromPort.Id),
                                    fromPortName: fromPort.Name,
                                    toPortId: Number(toPort.Id),
                                    toPortName: toPort.Name,
                                    toPortNation: findNationById(toPort.Nation)?.short,
                                    distance: getDistance(Number(fromPort.Id), Number(toPort.Id)),
                                } as DistanceExtended)
                        )
                        .sort(sortBy(["distance"]))
                        .slice(0, frontlinePorts)
                )

            frontlineAttackingNationGroupedByToPort[nationShortName] = d3Nest<DistanceExtended, number[]>()
                // .key(d => `${d.toPortId} ${d.toPortName}`)
                .key((d) => String(d.toPortId))
                // .rollup(values => values.map(value => [value.fromPortId, value.fromPortName, value.distance]))
                .rollup((values) => values.map((value) => value.fromPortId))
                .entries(frontlinesFrom)

            frontlineAttackingNationGroupedByFromPort[nationShortName] = d3Collection
                .nest<DistanceExtended, FANValue[]>()
                // .key((d: DistanceExtended) => `${d.fromPortId} ${d.fromPortName}`)
                .key((d) => String(d.toPortId))
                .rollup((values) =>
                    values.map(
                        (value) =>
                            ({
                                id: value.toPortId,
                                nation: value.toPortNation,
                            } as FANValue)
                    )
                )
                .entries(frontlinesFrom)
        })

    const frontlineDefendingNationMap: Map<string, Set<string>> = new Map()
    for (const attackingNation of nationShortName) {
        if (frontlineAttackingNationGroupedByFromPort[attackingNation]) {
            for (const fromPort of frontlineAttackingNationGroupedByFromPort[attackingNation]) {
                if (fromPort.value) {
                    for (const toPort of fromPort.value) {
                        const key = String(toPort.nation) + String(toPort.id)
                        let fromPorts = frontlineDefendingNationMap.get(key)
                        if (fromPorts) {
                            fromPorts.add(fromPort.key)
                        } else {
                            fromPorts = new Set([fromPort.key])
                        }

                        frontlineDefendingNationMap.set(key, fromPorts)
                    }
                }
            }
        }
    }

    const frontlineDefendingNation = {} as NationList<FDNPort[]>
    for (const [key, fromPorts] of [...frontlineDefendingNationMap]) {
        const nationShortName = key.slice(0, 2) as NationShortName
        const toPortId = Number(key.slice(2))
        if (!frontlineDefendingNation[nationShortName]) {
            frontlineDefendingNation[nationShortName] = []
        }

        frontlineDefendingNation[nationShortName].push({
            key: toPortId,
            value: [...fromPorts].map(Number),
        })
        // frontlineDefendingNation[nationShortName].push({ key: toPortId, value: [...fromPorts] });
    }

    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-frontlines.json`), {
        attacking: frontlineAttackingNationGroupedByToPort,
        defending: frontlineDefendingNation,
    })
}

export const convertServerPortData = (): void => {
    distances = new Map(
        distancesOrig.map(([fromPortId, toPortId, distance]) => [fromPortId * numberPorts + toPortId, distance])
    )

    for (const serverName of serverNames) {
        apiItems = readJson(path.resolve(baseAPIFilename, `${serverName}-ItemTemplates-${serverDate}.json`))
        apiPorts = readJson(path.resolve(baseAPIFilename, `${serverName}-Ports-${serverDate}.json`))
        apiShops = readJson(path.resolve(baseAPIFilename, `${serverName}-Shops-${serverDate}.json`))
        /**
         * Item names
         */
        itemNames = new Map(
            apiItems.map((item) => [
                item.Id,
                {
                    name: cleanName(item.Name),
                    weight: item.ItemWeight,
                    itemType: item.ItemType,
                    trading:
                        item.SortingGroup === "Resource.Trading" ||
                        item.Name === "American Cotton" ||
                        item.Name === "Tobacco",
                },
            ])
        )

        // noinspection OverlyComplexBooleanExpressionJS
        itemWeights = new Map(
            apiItems
                .filter(
                    (apiItem) =>
                        !apiItem.NotUsed &&
                        (!apiItem.NotTradeable || apiItem.ShowInContractsSelector) &&
                        apiItem.ItemType !== "RecipeResource"
                )
                .map((apiItem) => [cleanName(apiItem.Name), apiItem.ItemWeight])
        )

        portData = []
        numberPorts = apiPorts.length

        // noinspection JSIgnoredPromiseFromCall
        setAndSavePortData(serverName)
        // noinspection JSIgnoredPromiseFromCall
        setAndSaveTradeData(serverName)
        // noinspection JSIgnoredPromiseFromCall
        setAndSavePortBattleData(serverName)
        // noinspection JSIgnoredPromiseFromCall
        setAndSaveFrontlines(serverName)
    }
}
