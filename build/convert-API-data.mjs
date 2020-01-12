import polylabel from "polylabel";

import {
    capitalToCounty,
    cleanName,
    convertCoordX,
    convertCoordY,
    distancePoints,
    speedFactor,
    readJson,
    saveJson,
    sortBy
} from "./common.mjs";

const inBaseFilename = process.argv[2];
const serverName = process.argv[3];
const genDir = process.argv[4];
const dataDir = process.argv[5];
const date = process.argv[6];

const apiItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);
const apiPorts = readJson(`${inBaseFilename}-Ports-${date}.json`);
const apiShops = readJson(`${inBaseFilename}-Shops-${date}.json`);

const minProfit = 3e4;

/**
 * Get item names
 * @return {Map<number, string>} Item names<id, name>
 */
const getItemNames = () =>
    new Map(
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

const itemNames = getItemNames();

function convertPorts() {
    const counties = new Map();
    const regions = new Map();
    const portData = [];
    const geoJsonRegions = {};
    const geoJsonCounties = {};
    const trades = [];

    geoJsonRegions.type = "FeatureCollection";
    geoJsonCounties.type = "FeatureCollection";
    geoJsonRegions.features = [];
    geoJsonCounties.features = [];

    /**
     *
     * @param {Object} port Port data.
     * @param {Array} portPos Port screen x/y coordinates.
     * @return {void}
     */
    function setCountyFeature(port, portPos) {
        const county = capitalToCounty.has(port.CountyCapitalName) ? capitalToCounty.get(port.CountyCapitalName) : "";
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
    }

    /**
     *
     * @param {Object} port Port data.
     * @param {Array} portPos Port screen x/y coordinates.
     * @return {void}
     */
    function setRegionFeature(port, portPos) {
        if (regions.has(port.Location)) {
            geoJsonRegions.features
                .filter(region => region.id === port.Location)
                .some(region => region.geometry.coordinates.push(portPos));
        } else {
            regions.set(port.Location, port.Location);

            const feature = {
                type: "Feature",
                id: port.Location,
                geometry: {
                    type: "Polygon",
                    coordinates: [portPos]
                }
            };
            geoJsonRegions.features.push(feature);
        }
    }

    /**
     *
     * @param {Object} apiPort Port data.
     * @return {void}
     */
    const setPortFeature = apiPort => {
        const sort = (a, b) => {
            if (a < b) {
                return -1;
            }

            if (a > b) {
                return 1;
            }

            return 0;
        };

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
                        .sort(sort)
                )
            ],
            consumesTrading: [
                ...new Set(
                    portShop.ResourcesConsumed.filter(
                        good => itemNames.has(good.Key) && itemNames.get(good.Key).trading
                    )
                        .map(good => itemNames.get(good.Key).name)
                        .sort(sort)
                )
            ],
            producesNonTrading: [
                ...new Set(
                    portShop.ResourcesProduced.filter(
                        good => itemNames.has(good.Key) && !itemNames.get(good.Key).trading
                    )
                        .map(good => itemNames.get(good.Key).name)
                        .sort(sort)
                )
            ],
            dropsNonTrading: [
                ...new Set(
                    portShop.ResourcesAdded.filter(
                        good => itemNames.has(good.Template) && !itemNames.get(good.Template).trading
                    )
                        .map(good => itemNames.get(good.Template).name)
                        .sort(sort)
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

    apiPorts.forEach(port => {
        const portPos = [
            Math.round(convertCoordX(port.Position.x, port.Position.z)),
            Math.round(convertCoordY(port.Position.x, port.Position.z))
        ];
        setCountyFeature(port, portPos);
        setRegionFeature(port, portPos);
        setPortFeature(port);
    });
    saveJson(`${dataDir}/${serverName}.json`, portData);

    const apiPortPos = new Map(
        apiPorts.map(apiPort => [
            Number(apiPort.Id),
            {
                x: apiPort.Position.x,
                y: apiPort.Position.z
            }
        ])
    );

    const apiItemWeight = new Map(
        apiItems
            .filter(apiItem => !apiItem.NotUsed && !apiItem.NotTradeable && apiItem.ItemType !== "RecipeResource")
            .map(apiItem => [cleanName(apiItem.Name), apiItem.ItemWeight])
    );

    portData.forEach(buyPort => {
        const buyPortPos = apiPortPos.get(buyPort.id);
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
                            const sellPortPos = apiPortPos.get(sellPort.id);
                            const trade = {
                                good: buyGood.name,
                                source: { id: Number(buyPort.id), grossPrice: buyPrice },
                                target: { id: Number(sellPort.id), grossPrice: sellPrice },
                                distance: Math.round(distancePoints(buyPortPos, sellPortPos) / (2.63 * speedFactor)),
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
    trades.sort((a, b) => b.profitTotal - a.profitTotal);

    saveJson(`${dataDir}/${serverName}-trades.json`, trades);

    saveJson(`${genDir}/regions.json`, geoJsonRegions);
    saveJson(`${genDir}/counties.json`, geoJsonCounties);

    geoJsonRegions.features.forEach(region => {
        // eslint-disable-next-line no-param-reassign
        region.geometry.type = "Point";
        // eslint-disable-next-line no-param-reassign
        region.geometry.coordinates = polylabel([region.geometry.coordinates], 1).map(coordinate =>
            Math.round(coordinate)
        );
    });
    saveJson(`${genDir}/region-labels.json`, geoJsonRegions);

    geoJsonCounties.features.forEach(county => {
        // eslint-disable-next-line no-param-reassign
        county.geometry.type = "Point";
        // eslint-disable-next-line no-param-reassign
        county.geometry.coordinates = polylabel([county.geometry.coordinates], 1).map(coordinate =>
            Math.round(coordinate)
        );
    });
    saveJson(`${genDir}/county-labels.json`, geoJsonCounties);
}

convertPorts();
