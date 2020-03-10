/**
 * This file is part of na-map.
 *
 * @file      Convert server specific port data.
 * @module    convert-server-port-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"

import d3Node from "d3-node"
import dayjs from "dayjs"

import {
    cleanName,
    Distance,
    findNationById,
    nations,
    readJson,
    saveJsonAsync,
    serverNames,
    simpleSort,
    sortBy
} from "../common"
import { baseAPIFilename, commonPaths, distanceMapSize, serverStartDate as serverDate } from "./common-node"
import { APIItem } from "./api-item"
import { APIPort } from "./api-port"
import { APIShop } from "./api-shop"
import { PortBattlePerServer, PortPerServer, Trade } from "../gen-json"

interface Item {
    name: string
    weight: number
    itemType: string
    trading: boolean
}

const minProfit = 30000
const frontlinePorts = 2

const d3n = d3Node()
const { d3 } = d3n

let apiItems: APIItem[]
let apiPorts: APIPort[] = []
let apiShops: APIShop[] = []

const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`)
const distancesOrig = (readJson(distancesFile) as unknown) as Distance[]
let distances: Map<number, number>
let numberPorts: number

const portData: PortPerServer[] = []
const trades: Trade[] = []
let itemNames: Map<number, Item>
let itemWeights: Map<string, number>

const getDistance = (fromPortId: number, toPortId: number): number =>
    fromPortId < toPortId
        ? distances.get(fromPortId * numberPorts + toPortId) ?? 0
        : distances.get(toPortId * numberPorts + fromPortId) ?? 0

const getPriceTierQuantity = (id: number): number => apiItems.find(item => item.Id === id)?.PriceTierQuantity ?? 0

/**
 *
 * @param apiPort - Port data
 */
const setPortFeaturePerServer = (apiPort: APIPort): void => {
    const portShop = apiShops.find(shop => shop.Id === apiPort.Id)

    if (portShop) {
        const portFeaturesPerServer = {
            id: Number(apiPort.Id),
            portBattleStartTime: apiPort.PortBattleStartTime,
            portBattleType: apiPort.PortBattleType,
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
                        good => itemNames.has(good.Template) && itemNames.get(good.Template)?.trading
                    )
                        .map(good => itemNames.get(good.Template)?.name)
                        .sort(simpleSort)
                )
            ],
            consumesTrading: [
                ...new Set(
                    portShop.ResourcesConsumed.filter(
                        good => itemNames.has(good.Key) && itemNames.get(good.Key)?.trading
                    )
                        .map(good => itemNames.get(good.Key)?.name)
                        .sort(simpleSort)
                )
            ],
            producesNonTrading: [
                ...new Set(
                    portShop.ResourcesProduced.filter(
                        good => itemNames.has(good.Key) && !itemNames.get(good.Key)?.trading
                    )
                        .map(good => itemNames.get(good.Key)?.name)
                        .sort(simpleSort)
                )
            ],
            dropsNonTrading: [
                ...new Set(
                    portShop.ResourcesAdded.filter(
                        good => itemNames.has(good.Template) && !itemNames.get(good.Template)?.trading
                    )
                        .map(good => itemNames.get(good.Template)?.name)
                        .sort(simpleSort)
                )
            ],
            inventory: portShop.RegularItems.filter(good => itemNames.get(good.TemplateId)?.itemType !== "Cannon")
                .map(good => ({
                    name: itemNames.get(good.TemplateId)?.name,
                    buyQuantity: good.Quantity === -1 ? good.BuyContractQuantity : good.Quantity,
                    buyPrice: Math.round(good.BuyPrice * (1 + apiPort.PortTax)),
                    sellPrice: Math.round(good.SellPrice / (1 + apiPort.PortTax)),
                    sellQuantity:
                        good.SellContractQuantity === -1
                            ? getPriceTierQuantity(good.TemplateId)
                            : good.SellContractQuantity
                }))
                .sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0))
        } as PortPerServer
        // Delete empty entries
        for (const type of ["dropsTrading", "consumesTrading", "producesNonTrading", "dropsNonTrading"]) {
            if (!(portFeaturesPerServer[type] as string[]).length) {
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
    for (const buyPort of portData) {
        buyPort.inventory
            .filter(buyGood => buyGood.buyQuantity > 0)
            .forEach(buyGood => {
                const { buyPrice, buyQuantity } = buyGood
                for (const sellPort of portData) {
                    const sellGood = sellPort.inventory.find(good => good.name === buyGood.name)
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
                                weightPerItem: itemWeights.get(buyGood.name) ?? 0
                            } as Trade
                            trades.push(trade)
                        }
                    }
                }
            })
    }

    // @ts-ignore
    trades.sort(sortBy(["profitTotal"]))

    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-trades.json`), trades)
}

const ticks = 621355968000000000
const setAndSavePortBattleData = async (serverName: string): Promise<void> => {
    const pb = apiPorts
        .map(port => ({
            id: Number(port.Id),
            name: cleanName(port.Name),

            nation: nations[port.Nation].short,
            capturer: port.Capturer,
            lastPortBattle: dayjs((port.LastPortBattle - ticks) / 10000).format("YYYY-MM-DD HH:mm"),
            attackerNation: "",
            attackerClan: "",
            attackHostility: "",
            portBattle: ""
        }))
        .sort(sortBy(["id"])) as PortBattlePerServer[]
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-pb.json`), pb)
}

const setAndSaveFrontlines = async (serverName: string): Promise<void> => {
    interface DistanceExtended {
        fromPortId: number
        fromPortName: string
        toPortId: number
        toPortName: string
        toPortNation: string
        distance: number
    }
    const outNations = ["NT"]
    const frontlineAttackingNationGroupedByToPort = {} as { [key: string]: any[] }
    const frontlineAttackingNationGroupedByFromPort = {} as { [key: string]: any[] }

    nations
        .filter(({ short: nationShort }) => !outNations.includes(nationShort))
        .forEach(({ id: nationId, short: nationShortName }) => {
            const frontlinesFrom = apiPorts
                .filter(
                    ({ Nation: fromPortNation }) =>
                        fromPortNation === nationId || fromPortNation === 0 || fromPortNation === 9
                )
                .flatMap(fromPort =>
                    apiPorts
                        // toPort must be a capturable port from a nation other than fromNation
                        .filter(toPort => !toPort.NonCapturable && toPort.Nation !== fromPort.Nation)
                        .map(
                            toPort =>
                                ({
                                    fromPortId: Number(fromPort.Id),
                                    fromPortName: fromPort.Name,
                                    toPortId: Number(toPort.Id),
                                    toPortName: toPort.Name,
                                    toPortNation: findNationById(toPort.Nation)?.short,
                                    distance: getDistance(Number(fromPort.Id), Number(toPort.Id))
                                } as DistanceExtended)
                        )
                        // @ts-ignore
                        .sort(sortBy(["distance"]))
                        .slice(0, frontlinePorts)
                )

            frontlineAttackingNationGroupedByToPort[nationShortName] = d3
                .nest()
                // .key((d: DistanceExtended) => `${d.toPortId} ${d.toPortName}`)
                .key((d: DistanceExtended) => d.toPortId)
                // .rollup((values: DistanceExtended[]) => values.map(value => [value.fromPortId, value.fromPortName, value.distance]))
                .rollup((values: DistanceExtended[]) => values.map(value => value.fromPortId))
                .entries(frontlinesFrom)

            frontlineAttackingNationGroupedByFromPort[nationShortName] = d3
                .nest()
                // .key((d: DistanceExtended) => `${d.fromPortId} ${d.fromPortName}`)
                .key((d: DistanceExtended) => d.fromPortId)
                .rollup((values: DistanceExtended[]) =>
                    values.map(value => ({ id: value.toPortId, nation: value.toPortNation }))
                )
                .entries(frontlinesFrom)
        })

    const frontlineDefendingNationMap = new Map()
    for (const attackingNation of Object.keys(frontlineAttackingNationGroupedByFromPort)) {
        for (const fromPort of frontlineAttackingNationGroupedByFromPort[attackingNation]) {
            for (const toPort of fromPort.value) {
                const key = toPort.nation + String(toPort.id)
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

    const frontlineDefendingNation = {} as { [key: string]: any[] }
    for (const [key, fromPorts] of [...frontlineDefendingNationMap]) {
        const nationShortName = key.slice(0, 2)
        const toPortId = Number(key.slice(2))
        if (!frontlineDefendingNation[nationShortName]) {
            frontlineDefendingNation[nationShortName] = []
        }

        frontlineDefendingNation[nationShortName].push({ key: toPortId, value: [...fromPorts].map(Number) })
        // frontlineDefendingNation[nationShortName].push({ key: toPortId, value: [...fromPorts] });
    }

    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-frontlines.json`), {
        attacking: frontlineAttackingNationGroupedByToPort,
        defending: frontlineDefendingNation
    })
}

export const convertServerPortData = () => {
    for (const serverName of serverNames) {
        apiItems = (readJson(
            path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`)
        ) as unknown) as APIItem[]
        apiPorts = (readJson(
            path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`)
        ) as unknown) as APIPort[]
        apiShops = (readJson(
            path.resolve(baseAPIFilename, `${serverNames[0]}-Shops-${serverDate}.json`)
        ) as unknown) as APIShop[]

        /**
         * Item names
         */
        itemNames = new Map(
            apiItems.map(item => [
                item.Id,
                {
                    name: cleanName(item.Name),
                    weight: item.ItemWeight,
                    itemType: item.ItemType,
                    trading:
                        item.SortingGroup === "Resource.Trading" ||
                        item.Name === "American Cotton" ||
                        item.Name === "Tobacco"
                }
            ])
        )

        // noinspection OverlyComplexBooleanExpressionJS
        itemWeights = new Map(
            apiItems
                .filter(
                    apiItem =>
                        !apiItem.NotUsed &&
                        (!apiItem.NotTradeable || apiItem.ShowInContractsSelector) &&
                        apiItem.ItemType !== "RecipeResource"
                )
                .map(apiItem => [cleanName(apiItem.Name), apiItem.ItemWeight])
        )

        numberPorts = apiPorts.length
        distances = new Map(
            distancesOrig.map(([fromPortId, toPortId, distance]) => [fromPortId * numberPorts + toPortId, distance])
        )

        console.log("setAndSavePortData")
        // noinspection JSIgnoredPromiseFromCall
        setAndSavePortData(serverName)
        console.log("setAndSaveTradeData")
        // noinspection JSIgnoredPromiseFromCall
        setAndSaveTradeData(serverName)
        console.log("setAndSavePortBattleData")
        // noinspection JSIgnoredPromiseFromCall
        setAndSavePortBattleData(serverName)
        console.log("setAndSaveFrontlines")
        // noinspection JSIgnoredPromiseFromCall
        setAndSaveFrontlines(serverName)
    }
}
