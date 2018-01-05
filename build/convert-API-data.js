let fs = require("fs");
let moment = require("moment");

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

let APIItems = require(`${inBaseFilename}-ItemTemplates-${date}.json`);
let APIPorts = require(`${inBaseFilename}-Ports-${date}.json`);
let APIShops = require(`${inBaseFilename}-Shops-${date}.json`);
let ItemNames = new Map();

// F11 coord to svg coord
function convertCoordX(x, y) {
    return Trans.A * x + Trans.B * y + Trans.C;
}
// F11 coord to svg coord
function convertCoordY(x, y) {
    return Trans.B * x - Trans.A * y + Trans.D;
}

function saveJson(data) {
    fs.writeFile(outFilename, JSON.stringify(data), "utf8", function(err) {
        if (err) {
            return console.log(err);
        }
    });
}

function getItemNames() {
    APIItems.filter(item => item.ItemType === "Material" || item.ItemType === "Resource").map(item => {
        ItemNames.set(item.Id, item.Name.replace("'", "’"));
    });
}

function convertPorts() {
    function GetMinMaxX(t) {
        if (t < 0) {
            return Math.max(Math.min(t, -14), -20);
        } else {
            return Math.min(Math.max(t, 14), 20);
        }
    }

    function GetMinMaxY(t) {
        if (t < 0) {
            return Math.max(Math.min(t, -10), -16);
        } else {
            return Math.min(Math.max(t, 18), 24);
        }
    }
    // https://gist.github.com/Nishchit14/4c6a7349b3c778f7f97b912629a9f228
    const flattenArray = arr => [].concat.apply([], arr.map(element => element));
    let geoJson = {};
    geoJson["type"] = "FeatureCollection";
    geoJson["features"] = [];
    const ticks = 621355968000000000;
    APIPorts.map(port => {
        let feature = {
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
                name: port.Name.replace("'", "’"),
                dx: GetMinMaxX(
                    convertCoordX(port.Position.x, port.Position.z) -
                        convertCoordX(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z)
                ),
                dy: GetMinMaxY(
                    convertCoordY(port.Position.x, port.Position.z) -
                        convertCoordY(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z)
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
                tradingCompany: port.TradingCompany,
                laborHoursDiscount: port.LaborHoursDiscount,
                produces: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesProduced.map(good => ItemNames.get(good.Key)).sort()
                    )
                ),
                drops: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesAdded.map(good => ItemNames.get(good.Template)).sort()
                    )
                ),
                consumes: flattenArray(
                    APIShops.filter(shop => shop.Id === port.Id).map(shop =>
                        shop.ResourcesConsumed.map(good => ItemNames.get(good.Key)).sort()
                    )
                )
            }
        };
        geoJson["features"].push(feature);
    });
    saveJson(geoJson);
}

getItemNames();
convertPorts();
