/**
 * This file is part of na-map.
 *
 * @file      Convert special port data.
 * @module    convert-special-port-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import d3Node from "d3-node";
import polylabel from "polylabel";

import {
    capitalToCounty,
    cleanName,
    commonPaths,
    convertCoordX,
    convertCoordY,
    distanceMapSize,
    findNationById,
    nations,
    readJson,
    saveJson,
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
let apiPortPos = new Map();

const distancesFile = path.resolve(commonPaths.dirGen, `distances-${distanceMapSize}.json`);
const distances = readJson(distancesFile);

const counties = new Map();
const regions = new Map();
const portData = [];
const geoJsonRegions = { type: "FeatureCollection", features: [] };
const geoJsonCounties = { type: "FeatureCollection", features: [] };
const trades = [];

const getPortName = portId => apiPorts.find(({ Id }) => Number(Id) === portId).Name;

const getDistance = (fromPortId, toPortId) =>
    (distances.find(
        ([distanceFromPortId, distanceToPortId]) =>
            (distanceFromPortId === fromPortId && distanceToPortId === toPortId) ||
            (distanceFromPortId === toPortId && distanceToPortId === fromPortId)
    ) || {})[2] || 0;

const setAndSavePortData = () => {
    /**
     * Main port data
     * @type {object} Port data
     */

    const ports = apiPorts
        .map(apiPort => {
            /**
             * Position of the port battle circle A
             * @type {Point}
             */
            const circleAPos = [
                Math.trunc(convertCoordX(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z)),
                Math.trunc(convertCoordY(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z))
            ];
            const angle = Math.round(rotationAngleInDegrees(apiPortPos.get(Number(apiPort.Id)), circleAPos));
            return {
                id: Number(apiPort.Id),
                name: cleanName(apiPort.Name),
                coordinates: apiPortPos.get(Number(apiPort.Id)),
                angle,
                textAnchor: angle > 0 && angle < 180 ? "start" : "end",
                region: apiPort.Location,
                countyCapitalName: apiPort.CountyCapitalName,
                county: capitalToCounty.has(apiPort.CountyCapitalName)
                    ? capitalToCounty.get(apiPort.CountyCapitalName)
                    : "",
                countyCapital: apiPort.Name === apiPort.CountyCapitalName,
                shallow: apiPort.Depth === 1,
                availableForAll: apiPort.AvailableForAll,
                brLimit: apiPort.PortBattleBRLimit,
                portPoints: apiPort.PortPoints,
                portBattleStartTime: apiPort.PortBattleStartTime,
                portBattleType: apiPort.PortBattleType,
                nonCapturable: apiPort.NonCapturable,
                conquestMarksPension: apiPort.ConquestMarksPension
            };
        })
        .sort(sortBy(["id"]));

    saveJson(commonPaths.filePort, ports);
};

const getPBCircles = portBattleZonePositions =>
    portBattleZonePositions.map(pbCircle => [
        Math.trunc(convertCoordX(pbCircle.x, pbCircle.z)),
        Math.trunc(convertCoordY(pbCircle.x, pbCircle.z))
    ]);

const getForts = portElementsSlotGroups =>
    portElementsSlotGroups
        .filter(portElement => portElement.TemplateName === "Fort2")
        .flatMap(portElement =>
            portElement.PortElementsSlots.map(d => [
                Math.trunc(convertCoordX(d.Position.x, d.Position.z)),
                Math.trunc(convertCoordY(d.Position.x, d.Position.z))
            ])
        );

const getTowers = portElementsSlotGroups =>
    portElementsSlotGroups
        .filter(portElement => portElement.TemplateName !== "Fort2")
        .flatMap(portElement =>
            portElement.PortElementsSlots.map(d => [
                Math.trunc(convertCoordX(d.Position.x, d.Position.z)),
                Math.trunc(convertCoordY(d.Position.x, d.Position.z))
            ])
        );

const getJoinCircles = (id, rotation) => {
    const [x0, y0] = apiPortPos.get(id);
    const distance = 5;
    const degrees = 180 - rotation;
    const radians = (degrees * Math.PI) / 180;
    const x1 = Math.trunc(x0 + distance * Math.sin(radians));
    const y1 = Math.trunc(y0 + distance * Math.cos(radians));

    return [x1, y1];
};

const getRaidCircles = portRaidZonePositions =>
    portRaidZonePositions.map(raidCircle => [
        Math.trunc(convertCoordX(raidCircle.x, raidCircle.z)),
        Math.trunc(convertCoordY(raidCircle.x, raidCircle.z))
    ]);

const getRaidPoints = portRaidSpawnPoints =>
    portRaidSpawnPoints.map(raidPoint => [
        Math.trunc(convertCoordX(raidPoint.Position.x, raidPoint.Position.z)),
        Math.trunc(convertCoordY(raidPoint.Position.x, raidPoint.Position.z))
    ]);

const setAndSavePBZones = () => {
    const ports = apiPorts
        .filter(port => !port.NonCapturable)
        .map(port => ({
            id: Number(port.Id),
            position: apiPortPos.get(Number(port.Id)),
            pbCircles: getPBCircles(port.PortBattleZonePositions),
            forts: getForts(port.PortElementsSlotGroups),
            towers: getTowers(port.PortElementsSlotGroups),
            joinCircles: getJoinCircles(Number(port.Id), Number(port.Rotation)),
            raidCircles: getRaidCircles(port.PortRaidZonePositions),
            raidPoints: getRaidPoints(port.PortRaidSpawnPoints)
        }))
        .sort(sortBy(["id"]));

    saveJson(commonPaths.filePbZone, ports);
};

/**
 *
 * @param {Object} port Port data.
 * @param {Array} portPos Port screen x/y coordinates.
 * @return {void}
 */
const setCountyFeature = (countyCapitalName, portPos) => {
    const county = capitalToCounty.has(countyCapitalName) ? capitalToCounty.get(countyCapitalName) : "";
    if (county !== "") {
        if (counties.has(county)) {
            geoJsonCounties.features
                .filter(countyFeature => countyFeature.id === county)
                .some(countyFeature => countyFeature.geometry.coordinates.push(portPos));
        } else {
            counties.set(county, county);

            const feature = {
                type: "Feature",
                id: county,
                geometry: {
                    type: "Polygon",
                    coordinates: [portPos]
                }
            };
            geoJsonCounties.features.push(feature);
        }
    }
};

/**
 *
 * @param {Object} port Port data.
 * @param {Array} portPos Port screen x/y coordinates.
 * @return {void}
 */
const setRegionFeature = (location, portPos) => {
    if (regions.has(location)) {
        geoJsonRegions.features
            .filter(region => region.id === location)
            .some(region => region.geometry.coordinates.push(portPos));
    } else {
        regions.set(location, location);

        const feature = {
            type: "Feature",
            id: location,
            geometry: {
                type: "Polygon",
                coordinates: [portPos]
            }
        };
        geoJsonRegions.features.push(feature);
    }
};

/**
 *
 * @param {Object} apiPort Port data.
 * @return {void}
 */
const setPortFeature = apiPort => {
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

    const port = {
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
        if (!port[type].length) {
            delete port[type];
        }
    });
    portData.push(port);
};

const setAndSavePortCountyRegionData = serverName => {
    apiPorts.forEach(apiPort => {
        const portPos = apiPortPos.get(Number(apiPort.Id));
        setCountyFeature(apiPort.CountyCapitalName, portPos);
        setRegionFeature(apiPort.Location, portPos);
        setPortFeature(apiPort, portPos);
    });
    saveJson(`${commonPaths.dirData}/${serverName}.json`, portData);
    saveJson(`${commonPaths.dirGen}/regions.json`, geoJsonRegions);
    saveJson(`${commonPaths.dirGen}/counties.json`, geoJsonCounties);

    geoJsonRegions.features.forEach(region => {
        region.geometry.type = "Point";
        region.geometry.coordinates = polylabel([region.geometry.coordinates], 1).map(coordinate =>
            Math.trunc(coordinate)
        );
    });
    saveJson(`${commonPaths.dirGen}/region-labels.json`, geoJsonRegions);

    geoJsonCounties.features.forEach(county => {
        county.geometry.type = "Point";
        county.geometry.coordinates = polylabel([county.geometry.coordinates], 1).map(coordinate =>
            Math.trunc(coordinate)
        );
    });

    saveJson(`${commonPaths.dirGen}/county-labels.json`, geoJsonCounties);
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

    saveJson(`${commonPaths.dirData}/${serverName}-trades.json`, trades);
};

const setAndSaveFrontlines = () => {
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

    saveJson(commonPaths.fileFrontlines, {
        attacking: frontlineAttackingNationGroupedByToPort,
        defending: frontlineDefendingNation
    });
};

/**
 * Find all port with the same distance to two or more ports
 */
const getEquidistantPorts = () => {
    const distancesMap = new Map();

    distances.forEach(distance => {
        // const newPortRelation = [distance[0], distance[1]];
        const newPortRelation = `${getPortName(distance[0])} -> ${getPortName(distance[1])}`;
        // const key = `${distance[2]}-${distance[0]}`;
        const key = `${getPortName(distance[0])} (${distance[2]})`;

        let portRelations = distancesMap.get(key);
        if (portRelations) {
            portRelations.push(newPortRelation);
        } else {
            portRelations = [newPortRelation];
        }

        distancesMap.set(key, portRelations);
    });

    const out = [...distancesMap].filter(([, values]) => values.length > 1);
    saveJson("equidistant-ports.json", out);
};

export const convertPortData = (inBaseFilename, serverName, date) => {
    apiItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);
    apiPorts = readJson(`${inBaseFilename}-Ports-${date}.json`);
    apiShops = readJson(`${inBaseFilename}-Shops-${date}.json`);

    apiPortPos = new Map(
        apiPorts.map(apiPort => [
            Number(apiPort.Id),
            {
                x: apiPort.Position.x,
                y: apiPort.Position.z
            }
        ])
    );

    setAndSavePortData();
    setAndSavePBZones();
    setAndSavePortCountyRegionData(serverName);
    setAndSaveTradeData(serverName);
    setAndSaveFrontlines();
};
