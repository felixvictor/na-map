let fs = require("fs");

const infileBaseName = process.argv[2],
    outDir = process.argv[3],
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

let APIPorts = require(`${infileBaseName}-Ports-${date}.json`);

// F11 coord to svg coord
function convertCoordX(x, y) {
    return Trans.A * x + Trans.B * y + Trans.C;
}
// F11 coord to svg coord
function convertCoordY(x, y) {
    return Trans.B * x - Trans.A * y + Trans.D;
}

function saveJson(filename, data) {
    fs.writeFile(`${filename}.geojson`, JSON.stringify(data), "utf8", function(err) {
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
                if (feature.geometry.coordinates.length > 0) {
                    geoJson["features"].push(feature);
                }
            });
            saveJson(`${outDir}/${element}`, geoJson);
        });
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
}

convertPBZones();
