let fs = require("fs"),
    d3 = require("d3");

const infileBaseName = process.argv[2],
    outfileBaseName = process.argv[3],
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

console.log(`infileBaseName: ${infileBaseName}`);
console.log(`outfileBaseName: ${outfileBaseName}`);
console.log(`date: ${date}`);

const Trans = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
};

let APIItems = require(`${infileBaseName}-ItemTemplates-${date}.json`);
let APIPorts = require(`${infileBaseName}-Ports-${date}.json`);
let APIShops = require(`${infileBaseName}-Shops-${date}.json`);

// F11 coord to svg coord
function convertCoordX(x, y) {
    return Trans.A * x + Trans.B * y + Trans.C;
}
// F11 coord to svg coord
function convertCoordY(x, y) {
    return Trans.B * x - Trans.A * y + Trans.D;
}

function saveJson(filename, data) {
    fs.writeFile(`${filename}.json`, JSON.stringify(data), "utf8", function(err) {
        if (err) {
            return console.log(err);
        }
    });
}

function convertPBZones() {
    function createAndSaveGeoJson() {
        // https://gist.github.com/Nishchit14/4c6a7349b3c778f7f97b912629a9f228
        const flattenArray = arr => [].concat.apply([], arr.map(element => element));

        ["pbZones", "forts", "towers"].forEach(element => {
            let geoJson = {};
            geoJson["type"] = "FeatureCollection";
            geoJson["features"] = [];

            ports.map(port => {
                let feature = {
                    type: "Feature",
                    id: port.id,
                    geometry: {
                        type: "MultiPoint",
                        coordinates: flattenArray(
                            port.features.filter(features => element === features.type).map(features => features.coord)
                        )
                    }
                };
                geoJson["features"].push(feature);
            });
            saveJson(element, geoJson);
        });
    }

    function combineGeoJson() {

        topojson.topology();
/*
        $(yarn bin local)/geo2topo --verbose \
	   -o ${OUT_PB_ZONES} \
	   pbzones.json \
	   towers.json \
	   forts.json
	   */
    }

    let ports = APIPorts.map(port => {
        function getPBZones(port) {
            port.PortBattleZonePositions.forEach(pbZone => {
                pbZones.push([
                    Math.round(convertCoordX(pbZone.x, pbZone.z)),
                    Math.round(convertCoordY(pbZone.x, pbZone.z))
                ]);
            });
        }

        function getPortElements(port) {
            port.PortElementsSlotGroups.forEach(portElement => {
                if (portElement.TemplateName === "Fort2") {
                    portElement.PortElementsSlots.forEach(d => {
                        pbForts.push([
                            Math.round(convertCoordX(d.Position.x, d.Position.z)),
                            Math.round(convertCoordY(d.Position.x, d.Position.z))
                        ]);
                    });
                } else {
                    portElement.PortElementsSlots.forEach(d => {
                        pbTowers.push([
                            Math.round(convertCoordX(d.Position.x, d.Position.z)),
                            Math.round(convertCoordY(d.Position.x, d.Position.z))
                        ]);
                    });
                }
            });
        }

        let pbZones = [],
            pbForts = [],
            pbTowers = [];

        getPBZones(port);
        getPortElements(port);
        return {
            id: port.Id,
            features: [
                { type: "pbZones", coord: pbZones },
                { type: "forts", coord: pbForts },
                { type: "towers", coord: pbTowers }
            ]
        };
    });

    createAndSaveGeoJson();
    combineGeoJson();
}

function convertPorts() {

    let ports = APIPorts.map(port => {
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


        let geoJson = {};
        geoJson["type"] = "FeatureCollection";
        geoJson["features"] = [];

            let feature = {
                type: "Feature",
                id: port.id,
                geometry: {
                    type: "Point",
                    coordinates: [Math.round(convertCoordX(d.Position.x, d.Position.z)),
                    Math.round(convertCoordY(d.Position.x, d.Position.z))]
                    
                },
                properties: {
                    name                 : d.Name.replace("'", "’"),
                    nation               : nation[d.Nation],
            countyCapital        : (d.Name === d.CountyCapitalName),
            shallow              : (d.Depth),
            availableForAll      : d.AvailableForAll,
            portBattleBRLimit    : d.PortBattleBRLimit,
            portBattleType       : d.PortBattleType,
            portBattleStartTime  : d.PortBattleStartTime,
            conquestMarksPension : d.ConquestMarksPension,
            capturer             : d.Capturer,
            nonCapturable        : d.NonCapturable,
            portTax              : Math.round(d.PortTax * 100) / 100,
            tradingCompany       : d.TradingCompany,
            laborHoursDiscount   : d.LaborHoursDiscount,
            dx                   : 0,
            dy                   : 0,
            Produces             : d.ResourcesProduced,
            Drops                : @(),
            Consumes             : @()
                }
            };
            geoJson["features"].push(feature);
        });
        saveJson(element, geoJson);
}

convertPorts();
convertPBZones();

/*
let serverPorts = require(outfileBaseName);

serverPorts.objects.ports.geometries.forEach(function(d) {
    let t = APIPorts.filter(function(api) {
        return api.Id === d.id;
    });
    d.properties.availableForAll = t[0].AvailableForAll;
    d.properties.brLimit = t[0].PortBattleBRLimit;
    d.properties.capturer = t[0].Capturer;
    d.properties.laborHoursDiscount = t[0].LaborHoursDiscount;
    d.properties.nation = nation[t[0].Nation];
    d.properties.portBattleStartTime = t[0].PortBattleStartTime;
    d.properties.portTax = Math.round(t[0].PortTax * 100) / 100;
    d.properties.tradingCompany = t[0].TradingCompany;
});
//console.log("serverPorts: " + JSON.stringify(serverPorts));


*/
