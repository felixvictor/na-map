/**
 * This file is part of na-map.
 *
 * @file      Convert ports.
 * @module    build/convert-ports
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import {
    capitalToCounty,
    cleanName,
    convertCoordX,
    convertCoordY,
    rotationAngleInDegrees,
    readJson,
    saveJson
} from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const apiPorts = readJson(`${inBaseFilename}-Ports-${date}.json`);

function convertPorts() {
    /**
     * Get ports
     * @return {object} Port data
     */
    const getPorts = () =>
        apiPorts.map(apiPort => {
            /**
             * Position of the port
             * @type {Point}
             */
            const portPos = [
                Math.round(convertCoordX(apiPort.Position.x, apiPort.Position.z)),
                Math.round(convertCoordY(apiPort.Position.x, apiPort.Position.z))
            ];

            /**
             * Position of the port battle circle A
             * @type {Point}
             */
            const circleAPos = [
                Math.round(convertCoordX(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z)),
                Math.round(convertCoordY(apiPort.PortBattleZonePositions[0].x, apiPort.PortBattleZonePositions[0].z))
            ];
            const angle = Math.round(rotationAngleInDegrees(portPos, circleAPos));
            return {
                id: Number(apiPort.Id),
                name: cleanName(apiPort.Name),
                coordinates: portPos,
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
        });
    const ports = getPorts();

    saveJson(outFilename, ports);
}

convertPorts();
