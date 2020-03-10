import * as path from "path";
import d3Node from "d3-node";
import dayjs from "dayjs";
import { cleanName, findNationById, nations, readJson, saveJsonAsync, serverNames, simpleSort, sortBy } from "../common";
import { baseAPIFilename, commonPaths, distanceMapSize, serverStartDate as serverDate } from "./common-node";
const minProfit = 30000;
const frontlinePorts = 2;
const d3n = d3Node();
const { d3 } = d3n;
let apiItems;
let apiPorts = [];
let apiShops = [];
const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`);
const distancesOrig = readJson(distancesFile);
let distances;
let numberPorts;
const portData = [];
const trades = [];
let itemNames;
let itemWeights;
const getDistance = (fromPortId, toPortId) => {
    var _a, _b;
    return fromPortId < toPortId
        ? (_a = distances.get(fromPortId * numberPorts + toPortId)) !== null && _a !== void 0 ? _a : 0 : (_b = distances.get(toPortId * numberPorts + fromPortId)) !== null && _b !== void 0 ? _b : 0;
};
const getPriceTierQuantity = (id) => { var _a, _b; return (_b = (_a = apiItems.find(item => item.Id === id)) === null || _a === void 0 ? void 0 : _a.PriceTierQuantity) !== null && _b !== void 0 ? _b : 0; };
const setPortFeaturePerServer = (apiPort) => {
    const portShop = apiShops.find(shop => shop.Id === apiPort.Id);
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
                ...new Set(portShop.ResourcesAdded.filter(good => { var _a; return itemNames.has(good.Template) && ((_a = itemNames.get(good.Template)) === null || _a === void 0 ? void 0 : _a.trading); })
                    .map(good => { var _a; return (_a = itemNames.get(good.Template)) === null || _a === void 0 ? void 0 : _a.name; })
                    .sort(simpleSort))
            ],
            consumesTrading: [
                ...new Set(portShop.ResourcesConsumed.filter(good => { var _a; return itemNames.has(good.Key) && ((_a = itemNames.get(good.Key)) === null || _a === void 0 ? void 0 : _a.trading); })
                    .map(good => { var _a; return (_a = itemNames.get(good.Key)) === null || _a === void 0 ? void 0 : _a.name; })
                    .sort(simpleSort))
            ],
            producesNonTrading: [
                ...new Set(portShop.ResourcesProduced.filter(good => { var _a; return itemNames.has(good.Key) && !((_a = itemNames.get(good.Key)) === null || _a === void 0 ? void 0 : _a.trading); })
                    .map(good => { var _a; return (_a = itemNames.get(good.Key)) === null || _a === void 0 ? void 0 : _a.name; })
                    .sort(simpleSort))
            ],
            dropsNonTrading: [
                ...new Set(portShop.ResourcesAdded.filter(good => { var _a; return itemNames.has(good.Template) && !((_a = itemNames.get(good.Template)) === null || _a === void 0 ? void 0 : _a.trading); })
                    .map(good => { var _a; return (_a = itemNames.get(good.Template)) === null || _a === void 0 ? void 0 : _a.name; })
                    .sort(simpleSort))
            ],
            inventory: portShop.RegularItems.filter(good => { var _a; return ((_a = itemNames.get(good.TemplateId)) === null || _a === void 0 ? void 0 : _a.itemType) !== "Cannon"; })
                .map(good => {
                var _a;
                return ({
                    name: (_a = itemNames.get(good.TemplateId)) === null || _a === void 0 ? void 0 : _a.name,
                    buyQuantity: good.Quantity === -1 ? good.BuyContractQuantity : good.Quantity,
                    buyPrice: Math.round(good.BuyPrice * (1 + apiPort.PortTax)),
                    sellPrice: Math.round(good.SellPrice / (1 + apiPort.PortTax)),
                    sellQuantity: good.SellContractQuantity === -1
                        ? getPriceTierQuantity(good.TemplateId)
                        : good.SellContractQuantity
                });
            })
                .sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0))
        };
        for (const type of ["dropsTrading", "consumesTrading", "producesNonTrading", "dropsNonTrading"]) {
            if (!portFeaturesPerServer[type].length) {
                delete portFeaturesPerServer[type];
            }
        }
        portData.push(portFeaturesPerServer);
    }
};
const setAndSavePortData = async (serverName) => {
    for (const apiPort of apiPorts) {
        setPortFeaturePerServer(apiPort);
    }
    await saveJsonAsync(`${commonPaths.dirGenServer}/${serverName}-ports.json`, portData);
};
const setAndSaveTradeData = async (serverName) => {
    for (const buyPort of portData) {
        buyPort.inventory
            .filter(buyGood => buyGood.buyQuantity > 0)
            .forEach(buyGood => {
            var _a;
            const { buyPrice, buyQuantity } = buyGood;
            for (const sellPort of portData) {
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
                            weightPerItem: (_a = itemWeights.get(buyGood.name)) !== null && _a !== void 0 ? _a : 0
                        };
                        trades.push(trade);
                    }
                }
            }
        });
    }
    trades.sort(sortBy(["profitTotal"]));
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-trades.json`), trades);
};
const ticks = 621355968000000000;
const setAndSavePortBattleData = async (serverName) => {
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
        .sort(sortBy(["id"]));
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-pb.json`), pb);
};
const setAndSaveFrontlines = async (serverName) => {
    const outNations = ["NT"];
    const frontlineAttackingNationGroupedByToPort = {};
    const frontlineAttackingNationGroupedByFromPort = {};
    nations
        .filter(({ short: nationShort }) => !outNations.includes(nationShort))
        .forEach(({ id: nationId, short: nationShortName }) => {
        const frontlinesFrom = apiPorts
            .filter(({ Nation: fromPortNation }) => fromPortNation === nationId || fromPortNation === 0 || fromPortNation === 9)
            .flatMap(fromPort => apiPorts
            .filter(toPort => !toPort.NonCapturable && toPort.Nation !== fromPort.Nation)
            .map(toPort => {
            var _a;
            return ({
                fromPortId: Number(fromPort.Id),
                fromPortName: fromPort.Name,
                toPortId: Number(toPort.Id),
                toPortName: toPort.Name,
                toPortNation: (_a = findNationById(toPort.Nation)) === null || _a === void 0 ? void 0 : _a.short,
                distance: getDistance(Number(fromPort.Id), Number(toPort.Id))
            });
        })
            .sort(sortBy(["distance"]))
            .slice(0, frontlinePorts));
        frontlineAttackingNationGroupedByToPort[nationShortName] = d3
            .nest()
            .key((d) => d.toPortId)
            .rollup((values) => values.map(value => value.fromPortId))
            .entries(frontlinesFrom);
        frontlineAttackingNationGroupedByFromPort[nationShortName] = d3
            .nest()
            .key((d) => d.fromPortId)
            .rollup((values) => values.map(value => ({ id: value.toPortId, nation: value.toPortNation })))
            .entries(frontlinesFrom);
    });
    const frontlineDefendingNationMap = new Map();
    for (const attackingNation of Object.keys(frontlineAttackingNationGroupedByFromPort)) {
        for (const fromPort of frontlineAttackingNationGroupedByFromPort[attackingNation]) {
            for (const toPort of fromPort.value) {
                const key = toPort.nation + String(toPort.id);
                let fromPorts = frontlineDefendingNationMap.get(key);
                if (fromPorts) {
                    fromPorts.add(fromPort.key);
                }
                else {
                    fromPorts = new Set([fromPort.key]);
                }
                frontlineDefendingNationMap.set(key, fromPorts);
            }
        }
    }
    const frontlineDefendingNation = {};
    for (const [key, fromPorts] of [...frontlineDefendingNationMap]) {
        const nationShortName = key.slice(0, 2);
        const toPortId = Number(key.slice(2));
        if (!frontlineDefendingNation[nationShortName]) {
            frontlineDefendingNation[nationShortName] = [];
        }
        frontlineDefendingNation[nationShortName].push({ key: toPortId, value: [...fromPorts].map(Number) });
    }
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-frontlines.json`), {
        attacking: frontlineAttackingNationGroupedByToPort,
        defending: frontlineDefendingNation
    });
};
export const convertServerPortData = () => {
    for (const serverName of serverNames) {
        apiItems = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-ItemTemplates-${serverDate}.json`));
        apiPorts = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));
        apiShops = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Shops-${serverDate}.json`));
        itemNames = new Map(apiItems.map(item => [
            item.Id,
            {
                name: cleanName(item.Name),
                weight: item.ItemWeight,
                itemType: item.ItemType,
                trading: item.SortingGroup === "Resource.Trading" ||
                    item.Name === "American Cotton" ||
                    item.Name === "Tobacco"
            }
        ]));
        itemWeights = new Map(apiItems
            .filter(apiItem => !apiItem.NotUsed &&
            (!apiItem.NotTradeable || apiItem.ShowInContractsSelector) &&
            apiItem.ItemType !== "RecipeResource")
            .map(apiItem => [cleanName(apiItem.Name), apiItem.ItemWeight]));
        numberPorts = apiPorts.length;
        distances = new Map(distancesOrig.map(([fromPortId, toPortId, distance]) => [fromPortId * numberPorts + toPortId, distance]));
        setAndSavePortData(serverName);
        setAndSaveTradeData(serverName);
        setAndSavePortBattleData(serverName);
        setAndSaveFrontlines(serverName);
    }
};
