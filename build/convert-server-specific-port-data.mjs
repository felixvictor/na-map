/**
 * This file is part of na-map.
 *
 * @file      Convert server specific port data.
 * @module    convert-server-specific-port-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import d3Node from "d3-node";

import {
    cleanName,
    commonPaths,
    distanceMapSize,
    findNationById,
    nations,
    readJson,
    saveJson,
    serverNames,
    serverStartDate as serverDate,
    simpleSort,
    sortBy
} from "./common.mjs";

const minProfit = 3e4;
const frontlinePorts = 2;

const d3n = d3Node();
const { d3 } = d3n;

let apiItems = [];
let apiPorts = [];
let apiShops = [];

const distancesFile = path.resolve(commonPaths.dirGen, `distances-${distanceMapSize}.json`);
const distances = readJson(distancesFile);

const portData = [];
const trades = [];

const getDistance = (fromPortId, toPortId) =>
    (distances.find(
        ([distanceFromPortId, distanceToPortId]) =>
            (distanceFromPortId === fromPortId && distanceToPortId === toPortId) ||
            (distanceFromPortId === toPortId && distanceToPortId === fromPortId)
    ) || {})[2] || 0;

/**
 *
 * @param {Object} apiPort Port data.
 * @return {void}
 */
const setPortFeaturePerServer = apiPort => {
    /**
     * Item names
     * @type {Map<number, string>} Item names<id, name>
     */
    const itemNames = new Map(
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
    );

    const portShop = apiShops.find(shop => shop.Id === apiPort.Id);

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
                    good => itemNames.has(good.Template) && itemNames.get(good.Template).trading
                )
                    .map(good => itemNames.get(good.Template).name)
                    .sort(simpleSort)
            )
        ],
        consumesTrading: [
            ...new Set(
                portShop.ResourcesConsumed.filter(good => itemNames.has(good.Key) && itemNames.get(good.Key).trading)
                    .map(good => itemNames.get(good.Key).name)
                    .sort(simpleSort)
            )
        ],
        producesNonTrading: [
            ...new Set(
                portShop.ResourcesProduced.filter(good => itemNames.has(good.Key) && !itemNames.get(good.Key).trading)
                    .map(good => itemNames.get(good.Key).name)
                    .sort(simpleSort)
            )
        ],
        dropsNonTrading: [
            ...new Set(
                portShop.ResourcesAdded.filter(
                    good => itemNames.has(good.Template) && !itemNames.get(good.Template).trading
                )
                    .map(good => itemNames.get(good.Template).name)
                    .sort(simpleSort)
            )
        ],
        inventory: portShop.RegularItems.filter(good => itemNames.get(good.TemplateId).itemType !== "Cannon")
            .map(good => ({
                name: itemNames.get(good.TemplateId).name,
                buyQuantity: good.Quantity === -1 ? good.BuyContractQuantity : good.Quantity,
                buyPrice: Math.round(good.BuyPrice * (1 + apiPort.PortTax)),
                sellPrice: Math.round(good.SellPrice / (1 + apiPort.PortTax)),
                sellQuantity: good.SellContractQuantity === -1 ? good.PriceTierQuantity : good.SellContractQuantity
            }))
            .sort(sortBy(["name"]))
    };
    // Delete empty entries
    ["dropsTrading", "consumesTrading", "producesNonTrading", "dropsNonTrading"].forEach(type => {
        if (!portFeaturesPerServer[type].length) {
            delete portFeaturesPerServer[type];
        }
    });
    portData.push(portFeaturesPerServer);
};

const setAndSavePortData = serverName => {
    apiPorts.forEach(apiPort => {
        setPortFeaturePerServer(apiPort);
    });
    saveJson(`${commonPaths.dirData}/${serverName}.json`, portData);
};

const setAndSaveTradeData = serverName => {
    const apiItemWeight = new Map(
        apiItems
            .filter(apiItem => !apiItem.NotUsed && !apiItem.NotTradeable && apiItem.ItemType !== "RecipeResource")
            .map(apiItem => [cleanName(apiItem.Name), apiItem.ItemWeight])
    );

    portData.forEach(buyPort => {
        buyPort.inventory
            .filter(buyGood => buyGood.buyQuantity > 0)
            .forEach(buyGood => {
                const { buyPrice, buyQuantity } = buyGood;
                portData.forEach(sellPort => {
                    const sellGood = sellPort.inventory.find(good => good.name === buyGood.name);
                    if (sellPort.id !== buyPort.id && sellGood) {
                        const { sellPrice, sellQuantity } = sellGood;
                        const quantity = Math.min(buyQuantity, sellQuantity);
                        const profitPerItem = sellPrice - buyPrice;
                        const profitTotal = profitPerItem * quantity;
                        if (profitTotal >= minProfit) {
                            const trade = {
                                good: buyGood.name,
                                source: { id: Number(buyPort.id), grossPrice: buyPrice },
                                target: { id: Number(sellPort.id), grossPrice: sellPrice },
                                distance: getDistance(buyPort.id, sellPort.id),
                                profitTotal,
                                quantity,
                                weightPerItem: apiItemWeight.get(buyGood.name)
                            };
                            trades.push(trade);
                        }
                    }
                });
            });
    });
    trades.sort(sortBy(["profitTotal"]));

    saveJson(path.resolve(commonPaths.dirGen, `${serverName}-trades.json`), trades);
};

const setAndSaveFrontlines = serverName => {
    const outNations = ["NT"];
    const frontlineAttackingNationGroupedByToPort = {};
    const frontlineAttackingNationGroupedByFromPort = {};

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
                        .map(toPort => ({
                            fromPortId: Number(fromPort.Id),
                            fromPortName: fromPort.Name,
                            toPortId: Number(toPort.Id),
                            toPortName: toPort.Name,
                            toPortNation: findNationById(toPort.Nation).short,
                            distance: getDistance(Number(fromPort.Id), Number(toPort.Id))
                        }))
                        .sort(sortBy(["distance"]))
                        .slice(0, frontlinePorts)
                );

            frontlineAttackingNationGroupedByToPort[nationShortName] = d3
                .nest()
                // .key(d => `${d.toPortId} ${d.toPortName}`)
                .key(d => d.toPortId)
                // .rollup(values => values.map(value => [value.fromPortId, value.fromPortName, value.distance]))
                .rollup(values => values.map(value => value.fromPortId))
                .entries(frontlinesFrom);

            frontlineAttackingNationGroupedByFromPort[nationShortName] = d3
                .nest()
                // .key(d => `${d.fromPortId} ${d.fromPortName}`)
                .key(d => d.fromPortId)
                .rollup(values => values.map(value => ({ id: value.toPortId, nation: value.toPortNation })))
                .entries(frontlinesFrom);
        });

    const frontlineDefendingNationMap = new Map();
    Object.keys(frontlineAttackingNationGroupedByFromPort).forEach(attackingNation => {
        frontlineAttackingNationGroupedByFromPort[attackingNation].forEach(fromPort => {
            fromPort.value.forEach(toPort => {
                const key = toPort.nation + String(toPort.id);
                let fromPorts = frontlineDefendingNationMap.get(key);
                if (fromPorts) {
                    fromPorts.add(fromPort.key);
                } else {
                    fromPorts = new Set([fromPort.key]);
                }

                frontlineDefendingNationMap.set(key, fromPorts);
            });
        });
    });

    const frontlineDefendingNation = {};
    for (const [key, fromPorts] of [...frontlineDefendingNationMap]) {
        const nationShortName = key.slice(0, 2);
        const toPortId = Number(key.slice(2));
        if (!frontlineDefendingNation[nationShortName]) {
            frontlineDefendingNation[nationShortName] = [];
        }

        frontlineDefendingNation[nationShortName].push({ key: toPortId, value: [...fromPorts].map(Number) });
        // frontlineDefendingNation[nationShortName].push({ key: toPortId, value: [...fromPorts] });
    }

    saveJson(path.resolve(commonPaths.dirGen, `${serverName}-frontlines.json`), {
        attacking: frontlineAttackingNationGroupedByToPort,
        defending: frontlineDefendingNation
    });
};

export const convertServerSpecificPortData = inBaseFilename => {
    serverNames.forEach(serverName => {
        console.log(path.resolve(inBaseFilename, `${serverName}-ItemTemplates-${serverDate}.json`));
        apiItems = readJson(path.resolve(inBaseFilename, `${serverName}-ItemTemplates-${serverDate}.json`));
        console.log(path.resolve(inBaseFilename, `${serverName}-Ports-${serverDate}.json`));
        apiPorts = readJson(path.resolve(inBaseFilename, `${serverName}-Ports-${serverDate}.json`));
        console.log(path.resolve(inBaseFilename, `${serverName}-Shops-${serverDate}.json`));
        apiShops = readJson(path.resolve(inBaseFilename, `${serverName}-Shops-${serverDate}.json`));

        setAndSavePortData(serverName);
        setAndSaveTradeData(serverName);
        setAndSaveFrontlines(serverName);
    });
};
