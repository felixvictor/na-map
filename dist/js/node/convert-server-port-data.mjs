/*!
 * This file is part of na-map.
 *
 * @file      Convert server specific port data.
 * @module    convert-server-port-data
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import dayjs from "dayjs";
import { group as d3Group } from "d3-array";
import { currentServerStartDate as serverDate, findNationById, nations, nationShortName, sortBy, } from "../common/common";
import { getCommonPaths } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { baseAPIFilename, cleanItemName, cleanName, simpleNumberSort } from "../common/common-node";
import { serverTwitterNames } from "../common/common-var";
import { serverIds } from "../common/servers";
const minProfit = 30_000;
const frontlinePorts = 2;
let apiItems;
let apiPorts;
let apiShops;
const commonPaths = getCommonPaths();
const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances.json`);
const distancesOrig = readJson(distancesFile);
let distances;
let numberPorts;
let portData;
let itemNames;
let itemWeights;
let portBonuses;
const getDistance = (fromPortId, toPortId) => fromPortId < toPortId
    ? distances.get(fromPortId * numberPorts + toPortId) ?? 0
    : distances.get(toPortId * numberPorts + fromPortId) ?? 0;
const getPriceTierQuantity = (id) => apiItems.find((item) => item.Id === id)?.PriceTierQuantity ?? 0;
const isTradeItem = (item) => item.SortingGroup === "Resource.Trading" || item.Name === "American Cotton" || item.Name === "Tobacco";
const setPortFeaturePerServer = (apiPort) => {
    const portShop = apiShops.find((shop) => shop.Id === apiPort.Id);
    if (portShop) {
        const portFeaturesPerServer = {
            id: Number(apiPort.Id),
            portBattleStartTime: apiPort.PortBattleStartTime,
            availableForAll: apiPort.AvailableForAll,
            conquestMarksPension: apiPort.ConquestMarksPension,
            portTax: Math.round(apiPort.PortTax * 100) / 100,
            taxIncome: apiPort.LastTax,
            netIncome: apiPort.LastTax - apiPort.LastCost,
            tradingCompany: apiPort.TradingCompany,
            laborHoursDiscount: apiPort.LaborHoursDiscount,
            dropsTrading: [
                ...new Set(portShop.ResourcesAdded.filter((good) => itemNames.get(good.Template) ? itemNames.get(good.Template)?.trading : true).map((good) => good.Template)),
            ].sort(simpleNumberSort),
            consumesTrading: [
                ...new Set(portShop.ResourcesConsumed.filter((good) => itemNames.get(good.Key) ? itemNames.get(good.Key)?.trading : true).map((good) => good.Key)),
            ].sort(simpleNumberSort),
            producesNonTrading: [
                ...new Set(portShop.ResourcesProduced.filter((good) => {
                    return itemNames.get(good.Key) ? !itemNames.get(good.Key)?.trading : false;
                }).map((good) => good.Key)),
            ].sort(simpleNumberSort),
            dropsNonTrading: [
                ...new Set(portShop.ResourcesAdded.filter((good) => itemNames.get(good.Template) ? !itemNames.get(good.Template)?.trading : false).map((good) => good.Template)),
            ].sort(simpleNumberSort),
            inventory: portShop.RegularItems.filter((good) => itemNames.get(good.TemplateId)?.itemType !== "Cannon")
                .map((good) => ({
                id: good.TemplateId,
                buyQuantity: good.Quantity === -1 ? good.BuyContractQuantity : good.Quantity,
                buyPrice: Math.round(good.BuyPrice * (1 + apiPort.PortTax)),
                sellPrice: Math.round(good.SellPrice / (1 + apiPort.PortTax)),
                sellQuantity: good.SellContractQuantity === -1
                    ? getPriceTierQuantity(good.TemplateId)
                    : good.SellContractQuantity,
            }))
                .sort(sortBy(["id"])),
        };
        if (portBonuses.has(portFeaturesPerServer.id)) {
            portFeaturesPerServer.portBonus = portBonuses.get(portFeaturesPerServer.id);
        }
        for (const type of ["dropsTrading", "consumesTrading", "producesNonTrading", "dropsNonTrading"]) {
            if (portFeaturesPerServer[type].length === 0) {
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
    await saveJsonAsync(`${commonPaths.dirGenServer}/${serverName}-ports.json`, portData.sort(sortBy(["id"])));
};
const setAndSaveTradeData = async (serverName) => {
    const trades = [];
    for (const buyPort of portData) {
        for (const buyGood of buyPort.inventory.filter((buyGood) => buyGood.buyQuantity > 0)) {
            const { buyPrice, buyQuantity, id: buyGoodId } = buyGood;
            for (const sellPort of portData) {
                const sellGood = sellPort.inventory.find((good) => good.id === buyGoodId);
                if (sellPort.id !== buyPort.id && sellGood) {
                    const { sellPrice, sellQuantity } = sellGood;
                    const quantity = Math.min(buyQuantity, sellQuantity);
                    const profitPerItem = sellPrice - buyPrice;
                    const profitTotal = profitPerItem * quantity;
                    if (profitTotal >= minProfit) {
                        const trade = {
                            good: buyGoodId,
                            source: { id: Number(buyPort.id), grossPrice: buyPrice },
                            target: { id: Number(sellPort.id), grossPrice: sellPrice },
                            distance: getDistance(buyPort.id, sellPort.id),
                            profitTotal,
                            quantity,
                            weightPerItem: itemWeights.get(buyGoodId) ?? 0,
                        };
                        trades.push(trade);
                    }
                }
            }
        }
    }
    trades.sort(sortBy(["profitTotal"]));
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-trades.json`), trades);
};
const setAndSaveDroppedItems = async (serverName) => {
    const allowedItems = new Set([
        600,
        988,
        1009,
        1537,
        1758,
        2226,
    ]);
    const items = apiItems
        .filter((item) => !item.NotUsed && ((item.CanBeSoldToShop && item.BasePrice > 0) || allowedItems.has(item.Id)))
        .map((item) => {
        const tradeItem = {
            id: item.Id,
            name: isTradeItem(item) ? cleanItemName(item.Name) : cleanName(item.Name),
            buyPrice: item.BasePrice,
        };
        if (item.PortPrices.Consumed.SellPrice.Min > 0) {
            tradeItem.sellPrice = item.PortPrices.Consumed.SellPrice.Min;
        }
        if (item.PortPrices.RangePct) {
            tradeItem.distanceFactor = item.PortPrices.RangePct;
        }
        if (item.ItemWeight) {
            tradeItem.weight = item.ItemWeight;
        }
        return tradeItem;
    });
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-items.json`), items);
};
const baseTimeInTicks = 621_355_968_000_000_000;
const getTimeFromTicks = (timeInTicks) => {
    return dayjs.utc((timeInTicks - baseTimeInTicks) / 10_000).format("YYYY-MM-DD HH:mm");
};
const setAndSavePortBattleData = async (serverName) => {
    const pb = apiPorts
        .map((port) => {
        const portData = {
            id: Number(port.Id),
            name: cleanName(port.Name),
            nation: nations[port.Nation].short,
        };
        if (port.Capturer !== "") {
            portData.capturer = port.Capturer;
        }
        if (port.LastPortBattle > 0) {
            portData.captured = getTimeFromTicks(port.LastPortBattle);
        }
        else if (port.LastRaidStartTime > 0) {
            portData.captured = getTimeFromTicks(port.LastRaidStartTime);
            portData.capturer = "RAIDER";
        }
        return portData;
    })
        .sort(sortBy(["id"]));
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-pb.json`), pb);
};
const setAndSaveFrontlines = async (serverName) => {
    const outNations = new Set(["NT"]);
    const frontlineAttackingNationGroupedByToPort = {};
    const frontlineAttackingNationGroupedByFromPort = {};
    const filteredNations = nations.filter(({ short: nationShort }) => !outNations.has(nationShort));
    for (const { id: nationId, short: nationShortName } of filteredNations) {
        const frontlinesFrom = apiPorts
            .filter(({ Nation: fromPortNation }) => fromPortNation === nationId || fromPortNation === 0 || fromPortNation === 9)
            .flatMap((fromPort) => apiPorts
            .filter((toPort) => !toPort.NonCapturable && toPort.Nation !== fromPort.Nation)
            .map((toPort) => ({
            fromPortId: Number(fromPort.Id),
            fromPortName: fromPort.Name,
            toPortId: Number(toPort.Id),
            toPortName: toPort.Name,
            toPortNation: findNationById(toPort.Nation)?.short,
            distance: getDistance(Number(fromPort.Id), Number(toPort.Id)),
        }))
            .sort(sortBy(["distance"]))
            .slice(0, frontlinePorts));
        frontlineAttackingNationGroupedByToPort[nationShortName] = [
            ...d3Group(frontlinesFrom, (d) => String(d.toPortId)),
        ].map(([key, value]) => ({
            key,
            value: value.map((port) => port.fromPortId),
        }));
        frontlineAttackingNationGroupedByFromPort[nationShortName] = [
            ...d3Group(frontlinesFrom, (d) => String(d.fromPortId)),
        ].map(([key, value]) => ({
            key,
            value: value.map((port) => ({
                id: port.toPortId,
                nation: port.toPortNation,
            })),
        }));
    }
    const frontlineDefendingNationMap = new Map();
    for (const attackingNation of nationShortName) {
        if (frontlineAttackingNationGroupedByFromPort[attackingNation]) {
            for (const fromPort of frontlineAttackingNationGroupedByFromPort[attackingNation]) {
                if (fromPort.value) {
                    for (const toPort of fromPort.value) {
                        const key = String(toPort.nation) + String(toPort.id);
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
        }
    }
    const frontlineDefendingNation = {};
    for (const [key, fromPorts] of frontlineDefendingNationMap) {
        const nationShortName = key.slice(0, 2);
        const toPortId = Number(key.slice(2));
        if (!frontlineDefendingNation[nationShortName]) {
            frontlineDefendingNation[nationShortName] = [];
        }
        frontlineDefendingNation[nationShortName].push({
            key: toPortId,
            value: [...fromPorts].map((element) => Number(element)),
        });
    }
    await saveJsonAsync(path.resolve(commonPaths.dirGenServer, `${serverName}-frontlines.json`), {
        attacking: frontlineAttackingNationGroupedByToPort,
        defending: frontlineDefendingNation,
    });
};
export const convertServerPortData = () => {
    for (const serverName of serverIds) {
        apiItems = readJson(path.resolve(baseAPIFilename, `${serverName}-ItemTemplates-${serverDate}.json`));
        apiPorts = readJson(path.resolve(baseAPIFilename, `${serverName}-Ports-${serverDate}.json`));
        apiShops = readJson(path.resolve(baseAPIFilename, `${serverName}-Shops-${serverDate}.json`));
        if (serverTwitterNames.has(serverName)) {
            const portBonusesJson = readJson(commonPaths.filePortBonus);
            portBonuses = new Map(portBonusesJson.map((port) => [port.id, port.portBonus]));
        }
        else {
            portBonuses = new Map();
        }
        itemNames = new Map(apiItems
            .filter((item) => !item.NotUsed)
            .map((item) => [
            item.Id,
            {
                name: cleanName(item.Name),
                weight: item.ItemWeight,
                itemType: item.ItemType,
                buyPrice: item.BasePrice,
                trading: isTradeItem(item),
            },
        ]));
        itemWeights = new Map(apiItems
            .filter((apiItem) => !apiItem.NotUsed &&
            (!apiItem.NotTradeable || apiItem.ShowInContractsSelector) &&
            apiItem.ItemType !== "RecipeResource")
            .map((apiItem) => [apiItem.Id, apiItem.ItemWeight]));
        portData = [];
        numberPorts = apiPorts.length;
        distances = new Map(distancesOrig.map(([fromPortId, toPortId, distance]) => [fromPortId * numberPorts + toPortId, distance]));
        setAndSavePortData(serverName);
        setAndSaveTradeData(serverName);
        setAndSaveDroppedItems(serverName);
        setAndSavePortBattleData(serverName);
        setAndSaveFrontlines(serverName);
    }
};
//# sourceMappingURL=convert-server-port-data.js.map