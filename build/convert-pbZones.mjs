import fs from "fs";
import { convertCoordX, convertCoordY } from "./common.mjs";

const infileBaseName = process.argv[2],
    outDir = process.argv[3],
    date = process.argv[4];

const APIPorts = JSON.parse(fs.readFileSync(`${infileBaseName}-Ports-${date}.json`, "utf8"));

function saveJson(filename, data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(`${filename}.geojson`, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

function convertPBZones() {
    let ports = [],
        pbZones = [],
        pbForts = [],
        pbTowers = [];

    function createAndSaveGeoJson() {
        ["pbZones", "forts", "towers"].forEach(element => {
            const geoJson = {};
            geoJson.type = "FeatureCollection";
            geoJson.features = [];

            ports.forEach(port => {
                const feature = {
                    type: "Feature",
                    id: port.id,
                    geometry: {
                        type: "MultiPoint",
                        coordinates: port.features
                            .filter(features => element === features.type)
                            .map(features => features.coord)[0]
                    }
                };
                if (feature.geometry.coordinates.length > 0) {
                    geoJson.features.push(feature);
                }
            });
            saveJson(`${outDir}/${element}`, geoJson);
        });
    }

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

    ports = APIPorts.map(port => {
        pbZones = [];
        pbForts = [];
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

    createAndSaveGeoJson(ports);
}

convertPBZones();
