/**
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

import {
    baseAPIFilename,
    capitalToCounty,
    cleanName,
    commonPaths,
    convertCoordX,
    convertCoordY,
    distanceMapSize,
    readJson,
    rotationAngleInDegrees,
    saveJsonAsync,
    serverNames,
    serverStartDate as serverDate,
    sortBy
} from "./common.mjs";

let apiPorts = [];
let apiPortPos = new Map();

const counties = new Map();
const regions = new Map();
const geoJsonRegions = { type: "FeatureCollection", features: [] };
const geoJsonCounties = { type: "FeatureCollection", features: [] };

const getPortName = portId => apiPorts.find(({ Id }) => Number(Id) === portId).Name;

const setAndSavePortData = async () => {
    /**
     * Main port data
     * @type {object} Port data
     */

    const ports = apiPorts
        .map(apiPort => {
            /**
             * Position of the port battle circle A
             * @type {Point}
             */
            const circleAPos = [
                Math.trunc(convertCoordX(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z)),
                Math.trunc(convertCoordY(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z))
            ];
            const angle = Math.round(rotationAngleInDegrees(apiPortPos.get(Number(apiPort.Id)), circleAPos));
            const coordinates = apiPortPos.get(Number(apiPort.Id));
            return {
                id: Number(apiPort.Id),
                name: cleanName(apiPort.Name),
                coordinates: [coordinates.x, coordinates.y],
                angle,
                textAnchor: angle > 0 && angle < 180 ? "start" : "end",
                region: apiPort.Location,
                countyCapitalName: apiPort.CountyCapitalName,
                county: capitalToCounty.has(apiPort.CountyCapitalName)
                    ? capitalToCounty.get(apiPort.CountyCapitalName)
                    : "",
                countyCapital: apiPort.Name === apiPort.CountyCapitalName,
                shallow: apiPort.Depth === 1,
                availableForAll: apiPort.AvailableForAll,
                brLimit: apiPort.PortBattleBRLimit,
                portPoints: apiPort.PortPoints,
                portBattleStartTime: apiPort.PortBattleStartTime,
                portBattleType: apiPort.PortBattleType,
                nonCapturable: apiPort.NonCapturable,
                conquestMarksPension: apiPort.ConquestMarksPension
            };
        })
        .sort(sortBy(["id"]));

    await saveJsonAsync(commonPaths.filePort, ports);
};

const getPBCircles = portBattleZonePositions =>
    portBattleZonePositions.map(pbCircle => [
        Math.trunc(convertCoordX(pbCircle.x, pbCircle.z)),
        Math.trunc(convertCoordY(pbCircle.x, pbCircle.z))
    ]);

const getForts = portElementsSlotGroups =>
    portElementsSlotGroups
        .filter(portElement => portElement.TemplateName === "Fort2")
        .flatMap(portElement =>
            portElement.PortElementsSlots.map(d => [
                Math.trunc(convertCoordX(d.Position.x, d.Position.z)),
                Math.trunc(convertCoordY(d.Position.x, d.Position.z))
            ])
        );

const getTowers = portElementsSlotGroups =>
    portElementsSlotGroups
        .filter(portElement => portElement.TemplateName !== "Fort2")
        .flatMap(portElement =>
            portElement.PortElementsSlots.map(d => [
                Math.trunc(convertCoordX(d.Position.x, d.Position.z)),
                Math.trunc(convertCoordY(d.Position.x, d.Position.z))
            ])
        );

const getJoinCircles = (id, rotation) => {
    const { x0, y0 } = apiPortPos.get(id);
    const distance = 5;
    const degrees = 180 - rotation;
    const radians = (degrees * Math.PI) / 180;
    const x1 = Math.trunc(x0 + distance * Math.sin(radians));
    const y1 = Math.trunc(y0 + distance * Math.cos(radians));

    return [x1, y1];
};

const getRaidCircles = portRaidZonePositions =>
    portRaidZonePositions.map(raidCircle => [
        Math.trunc(convertCoordX(raidCircle.x, raidCircle.z)),
        Math.trunc(convertCoordY(raidCircle.x, raidCircle.z))
    ]);

const getRaidPoints = portRaidSpawnPoints =>
    portRaidSpawnPoints.map(raidPoint => [
        Math.trunc(convertCoordX(raidPoint.Position.x, raidPoint.Position.z)),
        Math.trunc(convertCoordY(raidPoint.Position.x, raidPoint.Position.z))
    ]);

const setAndSavePBZones = async () => {
    const ports = apiPorts
        .filter(port => !port.NonCapturable)
        .map(port => ({
            id: Number(port.Id),
            position: apiPortPos.get(Number(port.Id)),
            pbCircles: getPBCircles(port.PortBattleZonePositions),
            forts: getForts(port.PortElementsSlotGroups),
            towers: getTowers(port.PortElementsSlotGroups),
            joinCircles: getJoinCircles(Number(port.Id), Number(port.Rotation)),
            raidCircles: getRaidCircles(port.PortRaidZonePositions),
            raidPoints: getRaidPoints(port.PortRaidSpawnPoints)
        }))
        .sort(sortBy(["id"]));

    await saveJsonAsync(commonPaths.filePbZone, ports);
};

/**
 *
 * @param {Object} port Port data.
 * @param {Array} portPos Port screen x/y coordinates.
 * @return {void}
 */
const setCountyFeature = (countyCapitalName, portPos) => {
    const county = capitalToCounty.has(countyCapitalName) ? capitalToCounty.get(countyCapitalName) : "";
    if (county !== "") {
        if (counties.has(county)) {
            geoJsonCounties.features
                .filter(countyFeature => countyFeature.id === county)
                .some(countyFeature => countyFeature.geometry.coordinates.push(portPos));
        } else {
            counties.set(county, county);

            const feature = {
                type: "Feature",
                id: county,
                geometry: {
                    type: "Polygon",
                    coordinates: [portPos]
                }
            };
            geoJsonCounties.features.push(feature);
        }
    }
};

/**
 *
 * @param {Object} port Port data.
 * @param {Array} portPos Port screen x/y coordinates.
 * @return {void}
 */
const setRegionFeature = (location, portPos) => {
    if (regions.has(location)) {
        geoJsonRegions.features
            .filter(region => region.id === location)
            .some(region => region.geometry.coordinates.push(portPos));
    } else {
        regions.set(location, location);

        const feature = {
            type: "Feature",
            id: location,
            geometry: {
                type: "Polygon",
                coordinates: [portPos]
            }
        };
        geoJsonRegions.features.push(feature);
    }
};

const setAndSaveCountyRegionData = async () => {
    apiPorts.forEach(apiPort => {
        const portPos = apiPortPos.get(Number(apiPort.Id));
        setCountyFeature(apiPort.CountyCapitalName, portPos);
        setRegionFeature(apiPort.Location, portPos);
    });
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/regions.json`, geoJsonRegions);
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/counties.json`, geoJsonCounties);

    geoJsonRegions.features.forEach(region => {
        region.geometry.type = "Point";
        region.geometry.coordinates = polylabel([region.geometry.coordinates], 1).map(coordinate =>
            Math.trunc(coordinate)
        );
    });
    await saveJsonAsync(`${commonPaths.dirGenGeneric}/region-labels.json`, geoJsonRegions);

    geoJsonCounties.features.forEach(county => {
        county.geometry.type = "Point";
        county.geometry.coordinates = polylabel([county.geometry.coordinates], 1).map(coordinate =>
            Math.trunc(coordinate)
        );
    });

    await saveJsonAsync(`${commonPaths.dirGenGeneric}/county-labels.json`, geoJsonCounties);
};

/**
 * Find all port with the same distance to two or more ports
 */
const getEquidistantPorts = async () => {
    const distancesFile = path.resolve(commonPaths.dirGenGeneric, `distances-${distanceMapSize}.json`);
    const distances = readJson(distancesFile);
    const distancesMap = new Map();

    distances.forEach(distance => {
        // const newPortRelation = [distance[0], distance[1]];
        const newPortRelation = `${getPortName(distance[0])} -> ${getPortName(distance[1])}`;
        // const key = `${distance[2]}-${distance[0]}`;
        const key = `${getPortName(distance[0])} (${distance[2]})`;

        let portRelations = distancesMap.get(key);
        if (portRelations) {
            portRelations.push(newPortRelation);
        } else {
            portRelations = [newPortRelation];
        }

        distancesMap.set(key, portRelations);
    });

    const out = [...distancesMap].filter(([, values]) => values.length > 1);
    await saveJsonAsync("equidistant-ports.json", out);
};

export const convertGenericPortData = () => {
    apiPorts = readJson(path.resolve(baseAPIFilename, `${serverNames[0]}-Ports-${serverDate}.json`));

    apiPortPos = new Map(
        apiPorts.map(apiPort => [
            Number(apiPort.Id),
            {
                x: Math.trunc(convertCoordX(apiPort.Position.x, apiPort.Position.z)),
                y: Math.trunc(convertCoordY(apiPort.Position.x, apiPort.Position.z))
            }
        ])
    );

    setAndSavePortData();
    setAndSavePBZones();
    setAndSaveCountyRegionData();
};
