import fs from "fs";
import moment from "moment";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const nation = {
    0: "NT",
    1: "PR",
    2: "ES",
    3: "FR",
    4: "GB",
    5: "VP",
    6: "DK",
    7: "SE",
    8: "US",
    9: "FT",
    10: "RU",
    11: "DE",
    12: "PL"
};

const Trans = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
};

const APIItems = JSON.parse(fs.readFileSync(`${inBaseFilename}-ItemTemplates-${date}.json`, "utf8")),
    APIPorts = JSON.parse(fs.readFileSync(`${inBaseFilename}-Ports-${date}.json`, "utf8")),
    APIShops = JSON.parse(fs.readFileSync(`${inBaseFilename}-Shops-${date}.json`, "utf8")),
    ItemNames = new Map();

// F11 coord to svg coord
function convertCoordX(x, y) {
    return Trans.A * x + Trans.B * y + Trans.C;
}
// F11 coord to svg coord
function convertCoordY(x, y) {
    return Trans.B * x - Trans.A * y + Trans.D;
}

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

    // https://gist.github.com/Nishchit14/4c6a7349b3c778f7f97b912629a9f228
    // eslint-disable-next-line prefer-spread
    const flattenArray = arr => [].concat.apply([], arr.map(element => element));
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
                nation: nation[port.Nation],
                countyCapital: port.Name === port.CountyCapitalName,
                shallow: port.Depth,
                availableForAll: port.AvailableForAll,
                brLimit: port.PortBattleBRLimit,
                portBattleType: port.PortBattleType,
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
                producesTrading: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesProduced.filter(good => ItemNames.get(good.Key).trading)
                            .map(good => ItemNames.get(good.Key).name)
                            .sort()
                    )
                ),
                dropsTrading: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesAdded.filter(good => ItemNames.get(good.Template).trading)
                            .map(good => ItemNames.get(good.Template).name)
                            .sort()
                    )
                ),
                consumesTrading: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesConsumed.filter(good => ItemNames.get(good.Key).trading)
                            .map(good => ItemNames.get(good.Key).name)
                            .sort()
                    )
                ),
                producesNonTrading: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesProduced.filter(good => !ItemNames.get(good.Key).trading)
                            .map(good => ItemNames.get(good.Key).name)
                            .sort()
                    )
                ),
                dropsNonTrading: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesAdded.filter(good => !ItemNames.get(good.Template).trading)
                            .map(good => ItemNames.get(good.Template).name)
                            .sort()
                    )
                ),
                consumesNonTrading: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesConsumed.filter(good => !ItemNames.get(good.Key).trading)
                            .map(good => ItemNames.get(good.Key).name)
                            .sort()
                    )
                )
            }
        };
        geoJson.features.push(feature);
    });
    saveJson(geoJson);
}

getItemNames();
convertPorts();
