/*
	convert-pbZones.mjs
*/

import { convertCoordX, convertCoordY, readJson, saveJson } from "./common.mjs";

const infileBaseName = process.argv[2],
    outDir = process.argv[3],
    date = process.argv[4];

const APIPorts = readJson(`${infileBaseName}-Ports-${date}.json`);

function convertPBZones() {
    let ports = [],
        pbCircles = [],
        pbForts = [],
        pbTowers = [],
        pbJoinCircles = [];

    function setPBCircles(port) {
        port.PortBattleZonePositions.forEach(pbCircle => {
            pbCircles.push([
                Math.round(convertCoordX(pbCircle.x, pbCircle.z)),
                Math.round(convertCoordY(pbCircle.x, pbCircle.z))
            ]);
        });
    }

    function setPortElements(port) {
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

    function setJoinCircles(port) {
        pbJoinCircles.push([
            Math.round(convertCoordX(port.EntrancePosition.x, port.EntrancePosition.z)),
            Math.round(convertCoordY(port.EntrancePosition.x, port.EntrancePosition.z))
        ]);
    }

    function createAndSaveGeoJson() {
        ["pbCircles", "forts", "towers", "joinCircles"].forEach(element => {
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
            saveJson(`${outDir}/${element}.geojson`, geoJson);
        });
    }

    ports = APIPorts.map(port => {
        pbCircles = [];
        pbForts = [];
        pbTowers = [];
        pbJoinCircles = [];

        setPBCircles(port);
        setPortElements(port);
        setJoinCircles(port);
        return {
            id: port.Id,
            features: [
                { type: "pbCircles", coord: pbCircles },
                { type: "forts", coord: pbForts },
                { type: "towers", coord: pbTowers },
                { type: "joinCircles", coord: pbJoinCircles }
            ]
        };
    });

    createAndSaveGeoJson(ports);
}

convertPBZones();
