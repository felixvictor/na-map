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
    convertCoordX,
    convertCoordY,
    rotationAngleInDegrees,
    readJson,
    saveJson
    // eslint-disable-next-line import/extensions
} from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const apiPorts = readJson(`${inBaseFilename}-Ports-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertPorts() {
    /**
     * Get ports
     * @return {object}
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
                id: +apiPort.Id,
                name: apiPort.Name.replaceAll("'", "’"),
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
