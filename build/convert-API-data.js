let fs = require("fs"),
    d3 = require("d3");

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

console.log(`inBaseFilename: ${inBaseFilename}`);
console.log(`outFilename: ${outFilename}`);
console.log(`date: ${date}`);

const Trans = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
};

let APIItems = require(`${inBaseFilename}-ItemTemplates-${date}.json`);
let APIPorts = require(`${inBaseFilename}-Ports-${date}.json`);
let APIShops = require(`${inBaseFilename}-Shops-${date}.json`);

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

    let geoJson = {};
    geoJson["type"] = "FeatureCollection";
    geoJson["features"] = [];

    APIPorts.map(port => {
        /*
        $global:PortData[d.Name].dx = Get-MinMax-X -t ($global:PortData[d.Name].Longitude - $pbZones[0].x)
    #$global:PortData[d.Name].dx = $global:PortData[d.Name].dx + 4
        $global:PortData[d.Name].dy = Get-MinMax-Y -t ($global:PortData[d.Name].Latitude - $pbZones[0].y)
    #$global:PortData[d.Name].dy = $global:PortData[d.Name].dy - 4
        #        $global:PortData[d.Name].dx = ($global:PortData[d.Name].Longitude - $pbZones[0].x)
    #        $global:PortData[d.Name].dy = ($global:PortData[d.Name].Latitude - $pbZones[0].y)
        $global:PortName[d.Id] = @{
            Name = d.Name
        }
    }
    $global:ShopData | ForEach-Object {
    # Loop only over relevant ports as in $Port
        $PortName = $global:PortName[d.Id].Name
        d.ResourcesProduced | ForEach-Object {
            $global:PortData[$PortName].Produces += $global:Item[d.key].Name
        }
        $global:PortData[$PortName].Produces = $global:PortData[$PortName].Produces | Sort-Object

        d.ResourcesAdded | ForEach-Object {
            $global:PortData[$PortName].Drops += $global:Item[d.Template].Name
        }
        $global:PortData[$PortName].Drops = $global:PortData[$PortName].Drops | Sort-Object

        d.ResourcesConsumed | ForEach-Object {
            $global:PortData[$PortName].Consumes += $global:Item[d.key].Name
        }
        $global:PortData[$PortName].Consumes = $global:PortData[$PortName].Consumes | Sort-Object
    }
    */

        let feature = {
            type: "Feature",
            id: port.id,
            geometry: {
                type: "Point",
                coordinates: [
                    Math.round(convertCoordX(port.Position.x, port.Position.z)),
                    Math.round(convertCoordY(port.Position.x, port.Position.z))
                ]
            },
            properties: {
                name: port.Name.replace("'", "’"),
                nation: nation[port.Nation],
                countyCapital: port.Name === port.CountyCapitalName,
                shallow: port.Depth,
                availableForAll: port.AvailableForAll,
                portBattleBRLimit: port.PortBattleBRLimit,
                portBattleType: port.PortBattleType,
                portBattleStartTime: port.PortBattleStartTime,
                conquestMarksPension: port.ConquestMarksPension,
                capturer: port.Capturer,
                nonCapturable: port.NonCapturable,
                portTax: Math.round(port.PortTax * 100) / 100,
                tradingCompany: port.TradingCompany,
                laborHoursDiscount: port.LaborHoursDiscount,
                dx: GetMinMaxX(port.Position.x - port.PortBattleZonePositions[0].x),
                dy: GetMinMaxY(port.Position.z - port.PortBattleZonePositions[0].z),
                Produces: APIShops.filter(shop => shop.Id === port.Id).map(shop => shop.ResourcesProduced),
                Drops: "",
                Consumes: ""
            }
        };
        geoJson["features"].push(feature);
    });
    saveJson(geoJson);
}

convertPorts();
