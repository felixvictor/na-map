/*!
 * This file is part of na-map.
 *
 * @file      Convert generic port data.
 * @module    convert-generic-port-data
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import * as path from "path";
import polylabel from "polylabel";
import { capitalToCounty } from "../common/common";
import { baseAPIFilename, commonPaths, serverStartDate as serverDate } from "../common/common-dir";
import { readJson, saveJsonAsync } from "../common/common-file";
import { cleanName, sortBy } from "../common/common-node";
import { convertCoordX, convertCoordY, degreesHalfCircle, rotationAngleInDegrees, } from "../common/common-math";
import { serverNames } from "../common/common-var";
let apiPorts = [];
let apiPortPos = new Map();
const counties = new Map();
const regions = new Map();
const geoJsonRegions = { type: "FeatureCollection", features: [] };
const geoJsonCounties = { type: "FeatureCollection", features: [] };
const setAndSavePortData = async () => {
    const ports = apiPorts
        .map((apiPort) => {
        const circleAPos = [
            Math.trunc(convertCoordX(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z)),
            Math.trunc(convertCoordY(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z)),
        ];
        const { x, y } = apiPortPos.get(Number(apiPort.Id));
        const angle = Math.round(rotationAngleInDegrees([x, y], circleAPos));
        const coordinates = apiPortPos.get(Number(apiPort.Id));
        return {
            id: Number(apiPort.Id),
            name: cleanName(apiPort.Name),
            coordinates: [coordinates.x, coordinates.y],
            angle,
            textAnchor: angle > 0 && angle < degreesHalfCircle ? "start" : "end",
            region: apiPort.Location,
            countyCapitalName: cleanName(apiPort.CountyCapitalName),
            county: capitalToCounty.has(apiPort.CountyCapitalName)
                ? capitalToCounty.get(apiPort.CountyCapitalName)
                : "",
            countyCapital: apiPort.Name === apiPort.CountyCapitalName,
            shallow: apiPort.Depth === 1,
            availableForAll: apiPort.AvailableForAll,
            brLimit: apiPort.PortBattleBRLimit,
            portPoints: apiPort.PortPoints,
            portBattleType: apiPort.PortBattleType,
        };
    })
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.filePort, ports);
};
const getPBCircles = (portBattleZonePositions) => portBattleZonePositions.map((pbCircle) => [
    Math.trunc(convertCoordX(pbCircle.x, pbCircle.z)),
    Math.trunc(convertCoordY(pbCircle.x, pbCircle.z)),
]);
const getForts = (portElementsSlotGroups) => portElementsSlotGroups
    .filter((portElement) => portElement.TemplateName === "Fort2")
    .flatMap((portElement) => portElement.PortElementsSlots.map((d) => [
    Math.trunc(convertCoordX(d.Position.x, d.Position.z)),
    Math.trunc(convertCoordY(d.Position.x, d.Position.z)),
]));
const getTowers = (portElementsSlotGroups) => portElementsSlotGroups
    .filter((portElement) => portElement.TemplateName !== "Fort2")
    .flatMap((portElement) => portElement.PortElementsSlots.map((d) => [
    Math.trunc(convertCoordX(d.Position.x, d.Position.z)),
    Math.trunc(convertCoordY(d.Position.x, d.Position.z)),
]));
const getJoinCircle = (id, rotation) => {
    const { x: x0, y: y0 } = apiPortPos.get(id);
    const distance = 5;
    const degrees = degreesHalfCircle - rotation;
    const radians = (degrees * Math.PI) / degreesHalfCircle;
    const x1 = Math.trunc(x0 + distance * Math.sin(radians));
    const y1 = Math.trunc(y0 + distance * Math.cos(radians));
    return [x1, y1];
};
const getRaidCircles = (portRaidZonePositions) => portRaidZonePositions.map((raidCircle) => [
    Math.trunc(convertCoordX(raidCircle.x, raidCircle.z)),
    Math.trunc(convertCoordY(raidCircle.x, raidCircle.z)),
]);
const getRaidPoints = (portRaidSpawnPoints) => portRaidSpawnPoints.map((raidPoint) => [
    Math.trunc(convertCoordX(raidPoint.Position.x, raidPoint.Position.z)),
    Math.trunc(convertCoordY(raidPoint.Position.x, raidPoint.Position.z)),
]);
const setAndSavePBZones = async () => {
    const ports = apiPorts
        .filter((port) => !port.NonCapturable)
        .map((port) => {
        const { x, y } = apiPortPos.get(Number(port.Id));
        return {
            id: Number(port.Id),
            position: [x, y],
            pbCircles: getPBCircles(port.PortBattleZonePositions),
            forts: getForts(port.PortElementsSlotGroups),
            towers: getTowers(port.PortElementsSlotGroups),
            joinCircle: getJoinCircle(Number(port.Id), Number(port.Rotation)),
            raidCircles: getRaidCircles(port.PortRaidZonePositions),
            raidPoints: getRaidPoints(port.PortRaidSpawnPoints),
        };
    })
        .sort(sortBy(["id"]));
    await saveJsonAsync(commonPaths.filePbZone, ports);
};
const setCountyFeature = (countyCapitalName, portPos) => {
    const county = capitalToCounty.has(countyCapitalName) ? capitalToCounty.get(countyCapitalName) : "";
    if (county !== "") {
        if (counties.has(county)) {
            geoJsonCounties.features
                .filter((countyFeature) => countyFeature.id === county)
                .some((countyFeature) => countyFeature.geometry.coordinates.push(portPos));
        }
        else {
            counties.set(county, county);
            const feature = {
                type: "Feature",
                id: county,
                geometry: {
                    type: "Polygon",
                    coordinates: [portPos],
                },
            };
            geoJsonCounties.features.push(feature);
        }
    }
};
const setRegionFeature = (location, portPos) => {
    if (regions.has(location)) {
        geoJsonRegions.features
            .filter((region) => region.id === location)
            .some((region) => region.geometry.coordinates.push(portPos));
    }
    else {
        regions.set(location, location);
        const feature = {
            type: "Feature",
            id: location,
            geometry: {
                type: "Polygon",
                coordinates: [portPos],
            },
        };
        geoJsonRegions.features.push(feature);
    }
};
const setAndSaveCountyRegionData = async () => {
    apiPorts.forEach((apiPort) => {
        const { x, y } = apiPortPos.get(Number(apiPort.Id));
        setCountyFeature(apiPort.CountyCapitalName, [x, y]);
        setRegionFeature(apiPort.Location, [x, y]);
    });
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/regions.json`, geoJsonRegions);
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/counties.json`, geoJsonCounties);
    geoJsonRegions.features.forEach((region) => {
        region.geometry.type = "Point";
        region.geometry.coordinates = [
            polylabel([region.geometry.coordinates], 1).map((coordinate) => Math.trunc(coordinate)),
        ];
    });
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/region-labels.json`, geoJsonRegions);
    geoJsonCounties.features.forEach((county) => {
        county.geometry.type = "Point";
        county.geometry.coordinates = [
            polylabel([county.geometry.coordinates], 1).map((coordinate) => Math.trunc(coordinate)),
        ];
    });
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/county-labels.json`, geoJsonCounties);
};
export const convertGenericPortData = () => {
    apiPorts = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));
    apiPortPos = new Map(apiPorts.map((apiPort) => [
        Number(apiPort.Id),
        {
            x: Math.trunc(convertCoordX(apiPort.Position.x, apiPort.Position.z)),
            y: Math.trunc(convertCoordY(apiPort.Position.x, apiPort.Position.z)),
        },
    ]));
    setAndSavePortData();
    setAndSavePBZones();
    setAndSaveCountyRegionData();
};
//# sourceMappingURL=convert-generic-port-data.js.map