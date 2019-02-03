import polylabel from "polylabel";

import {
    capitalToCounty,
    convertCoordX,
    convertCoordY,
    distancePoints,
    speedFactor,
    readJson,
    saveJson
    // eslint-disable-next-line import/extensions
} from "./common.mjs";

const inBaseFilename = process.argv[2],
    serverName = process.argv[3],
    outDir = process.argv[4],
    date = process.argv[5];

const apiItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);
const apiPorts = readJson(`${inBaseFilename}-Ports-${date}.json`);
const apiShops = readJson(`${inBaseFilename}-Shops-${date}.json`);

const minProfit = 3e4;

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 * Get item names
 * @return {Map<number, string>} Item names<id, name>
 */
const getItemNames = () =>
    new Map(
        apiItems.map(item => [
            item.Id,
            {
                name: item.Name.replaceAll("'", "’"),
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
            if (!counties.has(county)) {
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
            } else {
                geoJsonCounties.features
                    .filter(countyFeature => countyFeature.id === county)
                    .some(countyFeature => countyFeature.geometry.coordinates.push(portPos));
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
        if (!regions.has(port.Location)) {
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
        } else {
            geoJsonRegions.features
                .filter(region => region.id === port.Location)
                .some(region => region.geometry.coordinates.push(portPos));
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
            id: +apiPort.Id,
            portBattleStartTime: apiPort.PortBattleStartTime,
            portBattleType: apiPort.PortBattleType,
            nonCapturable: apiPort.NonCapturable,
            conquestMarksPension: apiPort.ConquestMarksPension,
            portTax: Math.round(apiPort.PortTax * 100) / 100,
            taxIncome: apiPort.LastTax,
            netIncome: apiPort.LastTax - apiPort.LastCost,
            tradingCompany: apiPort.TradingCompany,
            laborHoursDiscount: apiPort.LaborHoursDiscount,
            dropsTrading: portShop.ResourcesAdded.filter(
                good => itemNames.has(good.Template) && itemNames.get(good.Template).trading
            )
                .map(good => itemNames.get(good.Template).name)
                .sort(sort),
            consumesTrading: portShop.ResourcesConsumed.filter(
                good => itemNames.has(good.Key) && itemNames.get(good.Key).trading
            )
                .map(good => itemNames.get(good.Key).name)
                .sort(sort),
            producesNonTrading: portShop.ResourcesProduced.filter(
                good => itemNames.has(good.Key) && !itemNames.get(good.Key).trading
            )
                .map(good => itemNames.get(good.Key).name)
                .sort(sort),
            dropsNonTrading: portShop.ResourcesAdded.filter(
                good => itemNames.has(good.Template) && !itemNames.get(good.Template).trading
            )
                .map(good => itemNames.get(good.Template).name)
                .sort(sort),
            inventory: portShop.RegularItems.filter(good => itemNames.get(good.TemplateId).itemType !== "Cannon")
                .map(good => ({
                    name: itemNames.get(good.TemplateId).name,
                    buyQuantity: good.Quantity !== -1 ? good.Quantity : good.BuyContractQuantity,
                    buyPrice: Math.round(good.BuyPrice * (1 + apiPort.PortTax)),
                    sellPrice: Math.round(good.SellPrice / (1 + apiPort.PortTax)),
                    sellQuantity: good.SellContractQuantity !== -1 ? good.SellContractQuantity : good.PriceTierQuantity
                }))
                .sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                })
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
    saveJson(`${outDir}/${serverName}.json`, portData);

    const apiPortPos = new Map(
        apiPorts.map(apiPort => [
            +apiPort.Id,
            {
                x: apiPort.Position.x,
                y: apiPort.Position.z
            }
        ])
    );

    const apiItemWeight = new Map(
        apiItems
            .filter(apiItem => !apiItem.NotUsed && !apiItem.NotTradeable && apiItem.ItemType !== "RecipeResource")
            .map(apiItem => [apiItem.Name.replaceAll("'", "’"), apiItem.ItemWeight])
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
                                source: { id: +buyPort.id, grossPrice: buyPrice },
                                target: { id: +sellPort.id, grossPrice: sellPrice },
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

    saveJson(`${outDir}/${serverName}-trades.json`, trades);

    saveJson(`${outDir}/regions.json`, geoJsonRegions);
    saveJson(`${outDir}/counties.json`, geoJsonCounties);

    geoJsonRegions.features.forEach(region => {
        // eslint-disable-next-line no-param-reassign
        region.geometry.type = "Point";
        // eslint-disable-next-line no-param-reassign
        region.geometry.coordinates = polylabel([region.geometry.coordinates], 1.0).map(coordinate =>
            Math.round(coordinate)
        );
    });
    saveJson(`${outDir}/region-labels.json`, geoJsonRegions);

    geoJsonCounties.features.forEach(county => {
        // eslint-disable-next-line no-param-reassign
        county.geometry.type = "Point";
        // eslint-disable-next-line no-param-reassign
        county.geometry.coordinates = polylabel([county.geometry.coordinates], 1.0).map(coordinate =>
            Math.round(coordinate)
        );
    });
    saveJson(`${outDir}/county-labels.json`, geoJsonCounties);
}

convertPorts();
