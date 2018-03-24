import fs from "fs";
import moment from "moment";
import { convertCoordX, convertCoordY, nations } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = JSON.parse(fs.readFileSync(`${inBaseFilename}-ItemTemplates-${date}.json`, "utf8")),
    APIPorts = JSON.parse(fs.readFileSync(`${inBaseFilename}-Ports-${date}.json`, "utf8")),
    APIShops = JSON.parse(fs.readFileSync(`${inBaseFilename}-Shops-${date}.json`, "utf8")),
    ItemNames = new Map();

function saveJson(data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(outFilename, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

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
    function GetMinMaxX(t) {
        if (t < 0) {
            return Math.max(Math.min(t, -5), -10);
        }
        return Math.min(Math.max(t, 5), 10);
    }

    function GetMinMaxY(t) {
        if (t < 0) {
            return Math.max(Math.min(t, -5), -10);
        }
        return Math.min(Math.max(t, 5), 10);
    }

    const geoJson = {};
    geoJson.type = "FeatureCollection";
    geoJson.features = [];
    const ticks = 621355968000000000;
    APIPorts.forEach(port => {
        const feature = {
            type: "Feature",
            id: port.Id,
            geometry: {
                type: "Point",
                coordinates: [
                    Math.round(convertCoordX(port.Position.x, port.Position.z)),
                    Math.round(convertCoordY(port.Position.x, port.Position.z))
                ]
            },
            properties: {
                name: port.Name.replaceAll("'", "’"),
                dx: GetMinMaxX(
                    Math.round(
                        convertCoordX(port.Position.x, port.Position.z) -
                            convertCoordX(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z)
                    )
                ),
                dy: GetMinMaxY(
                    Math.round(
                        convertCoordY(port.Position.x, port.Position.z) -
                            convertCoordY(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z)
                    )
                ),
                nation: nations[port.Nation].short,
                countyCapital: port.Name === port.CountyCapitalName,
                shallow: port.Depth,
                availableForAll: port.AvailableForAll,
                brLimit: port.PortBattleBRLimit,
                portBattleStartTime: port.PortBattleStartTime,
                capturer: port.Capturer,
                lastPortBattle: moment((port.LastPortBattle - ticks) / 10000).format("YYYY-MM-DD HH:mm"),
                nonCapturable: port.NonCapturable,
                conquestMarksPension: port.ConquestMarksPension,
                portTax: Math.round(port.PortTax * 100) / 100,
                taxIncome: port.LastTax,
                netIncome: port.LastTax - port.LastCost,
                tradingCompany: port.TradingCompany,
                laborHoursDiscount: port.LaborHoursDiscount,
                producesTrading: APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                    shop.ResourcesProduced.filter(good => ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                dropsTrading: APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                    shop.ResourcesAdded.filter(good => ItemNames.get(good.Template).trading)
                        .map(good => ItemNames.get(good.Template).name)
                        .sort()
                )[0],
                consumesTrading: APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                    shop.ResourcesConsumed.filter(good => ItemNames.get(good.Key).trading)
                        .map(good => `${ItemNames.get(good.Key).name}\u202f(${good.Value})`)
                        .sort()
                )[0],
                producesNonTrading: APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                    shop.ResourcesProduced.filter(good => !ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                dropsNonTrading: APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                    shop.ResourcesAdded.filter(good => !ItemNames.get(good.Template).trading)
                        .map(good => ItemNames.get(good.Template).name)
                        .sort()
                )[0],
                consumesNonTrading: APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                    shop.ResourcesConsumed.filter(good => !ItemNames.get(good.Key).trading)
                        .map(good => `${ItemNames.get(good.Key).name}\u202f(${good.Value})`)
                        .sort()
                )[0]
            }
        };
        geoJson.features.push(feature);
    });
    saveJson(geoJson);
}

getItemNames();
convertPorts();
