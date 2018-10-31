import polylabel from "polylabel";

import {
    capitalToCounty,
    convertCoordX,
    convertCoordY,
    rotationAngleInDegrees,
    readJson,
    saveJson
    // eslint-disable-next-line import/extensions
} from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    outDir = process.argv[4],
    date = process.argv[5];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`),
    APIPorts = readJson(`${inBaseFilename}-Ports-${date}.json`),
    APIShops = readJson(`${inBaseFilename}-Shops-${date}.json`),
    ItemNames = new Map();

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function getItemNames() {
    APIItems.filter(item => item.ItemType === "Material" || item.ItemType === "Resource").forEach(item => {
        ItemNames.set(item.Id, {
            name: item.Name.replaceAll("'", "’"),
            trading: item.SortingGroup === "Resource.Trading"
        });
    });
}

function convertPorts() {
    const counties = new Map(),
        regions = new Map();
    const geoJsonPort = {},
        geoJsonRegions = {},
        geoJsonCounties = {};

    geoJsonPort.type = "FeatureCollection";
    geoJsonRegions.type = "FeatureCollection";
    geoJsonCounties.type = "FeatureCollection";
    geoJsonPort.features = [];
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
     * @param {Object} port Port data.
     * @param {Array} portPos Port screen x/y coordinates.
     * @return {void}
     */
    function setPortFeature(port, portPos) {
        const portShop = APIShops.filter(shop => shop.Id === port.Id),
            circleAPos = [
                Math.round(convertCoordX(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z)),
                Math.round(convertCoordY(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z))
            ],
            angle = Math.round(rotationAngleInDegrees(portPos, circleAPos));

        const feature = {
            type: "Feature",
            id: port.Id,
            geometry: {
                type: "Point",
                coordinates: portPos
            },
            properties: {
                name: port.Name.replaceAll("'", "’"),
                angle,
                textAnchor: angle > 0 && angle < 180 ? "start" : "end",
                region: port.Location,
                countyCapitalName: port.CountyCapitalName,
                county: capitalToCounty.has(port.CountyCapitalName) ? capitalToCounty.get(port.CountyCapitalName) : "",
                countyCapital: port.Name === port.CountyCapitalName,
                shallow: port.Depth,
                availableForAll: port.AvailableForAll,
                brLimit: port.PortBattleBRLimit,
                portBattleStartTime: port.PortBattleStartTime,
                portBattleType: port.PortBattleType,
                nonCapturable: port.NonCapturable,
                conquestMarksPension: port.ConquestMarksPension,
                portTax: Math.round(port.PortTax * 100) / 100,
                taxIncome: port.LastTax,
                netIncome: port.LastTax - port.LastCost,
                tradingCompany: port.TradingCompany,
                laborHoursDiscount: port.LaborHoursDiscount,
                producesTrading: portShop.map(shop =>
                    shop.ResourcesProduced.filter(good => ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                dropsTrading: portShop.map(shop =>
                    shop.ResourcesAdded.filter(good => ItemNames.get(good.Template).trading)
                        .map(good => ItemNames.get(good.Template).name)
                        .sort()
                )[0],
                consumesTrading: portShop.map(shop =>
                    shop.ResourcesConsumed.filter(good => ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                producesNonTrading: portShop.map(shop =>
                    shop.ResourcesProduced.filter(good => !ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                dropsNonTrading: portShop.map(shop =>
                    shop.ResourcesAdded.filter(good => !ItemNames.get(good.Template).trading)
                        .map(good => ItemNames.get(good.Template).name)
                        .sort()
                )[0],
                consumesNonTrading: portShop.map(shop =>
                    shop.ResourcesConsumed.filter(good => !ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0]
            }
        };
        geoJsonPort.features.push(feature);
    }

    APIPorts.forEach(port => {
        const portPos = [
            Math.round(convertCoordX(port.Position.x, port.Position.z)),
            Math.round(convertCoordY(port.Position.x, port.Position.z))
        ];
        setCountyFeature(port, portPos);
        setRegionFeature(port, portPos);
        setPortFeature(port, portPos);
    });
    saveJson(outFilename, geoJsonPort);
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

getItemNames();
convertPorts();
