import fs from "fs";
import { convertCoordX, convertCoordY, rotationAngleInDegrees } from "./common.mjs";

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
    const geoJson = {};
    geoJson.type = "FeatureCollection";
    geoJson.features = [];
    APIPorts.forEach(port => {
        const portShop = APIShops.filter(shop => shop.Id === port.Id),
            portPos = [
                Math.round(convertCoordX(port.Position.x, port.Position.z)),
                Math.round(convertCoordY(port.Position.x, port.Position.z))
            ],
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
        geoJson.features.push(feature);
    });
    saveJson(geoJson);
}

getItemNames();
convertPorts();
