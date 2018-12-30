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
        const x0 = convertCoordX(port.Position.x, port.Position.z),
            y0 = convertCoordY(port.Position.x, port.Position.z),
            distance = 5,
            degrees = 180 - port.Rotation,
            radians = (degrees * Math.PI) / 180,
            x1 = Math.round(x0 + distance * Math.sin(radians)),
            y1 = Math.round(y0 + distance * Math.cos(radians));

        pbJoinCircles.push([x1, y1]);
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
                        coordinates: port.features.find(features => element === features.type).coord
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
