/**
 * This file is part of na-map.
 *
 * @file      Convert port battle zones.
 * @module    convert-pbZones
 * @author    iB aka Felix Victor
 * @copyright 2017-2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { convertCoordX, convertCoordY, readJson, saveJson } from "./common.mjs";

const infileBaseName = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIPorts = readJson(`${infileBaseName}-Ports-${date}.json`);

function convertPBZones() {
    const getPBCircles = port =>
        port.PortBattleZonePositions.map(pbCircle => [
            Math.round(convertCoordX(pbCircle.x, pbCircle.z)),
            Math.round(convertCoordY(pbCircle.x, pbCircle.z))
        ]);

    const getForts = port =>
        port.PortElementsSlotGroups.filter(portElement => portElement.TemplateName === "Fort2").flatMap(portElement =>
            portElement.PortElementsSlots.map(d => [
                Math.round(convertCoordX(d.Position.x, d.Position.z)),
                Math.round(convertCoordY(d.Position.x, d.Position.z))
            ])
        );

    const getTowers = port =>
        port.PortElementsSlotGroups.filter(portElement => portElement.TemplateName !== "Fort2").flatMap(portElement =>
            portElement.PortElementsSlots.map(d => [
                Math.round(convertCoordX(d.Position.x, d.Position.z)),
                Math.round(convertCoordY(d.Position.x, d.Position.z))
            ])
        );

    const getJoinCircles = port => {
        const x0 = convertCoordX(port.Position.x, port.Position.z);
        const y0 = convertCoordY(port.Position.x, port.Position.z);
        const distance = 5;
        const degrees = 180 - port.Rotation;
        const radians = (degrees * Math.PI) / 180;
        const x1 = Math.round(x0 + distance * Math.sin(radians));
        const y1 = Math.round(y0 + distance * Math.cos(radians));

        return [x1, y1];
    };

    const getRaidCircles = port =>
        port.PortRaidZonePositions.map(raidCircle => [
            Math.round(convertCoordX(raidCircle.x, raidCircle.z)),
            Math.round(convertCoordY(raidCircle.x, raidCircle.z))
        ]);

    const getRaidPoints = port =>
        port.PortRaidSpawnPoints.map(raidPoint => [
            Math.round(convertCoordX(raidPoint.Position.x, raidPoint.Position.z)),
            Math.round(convertCoordY(raidPoint.Position.x, raidPoint.Position.z))
        ]);

    const ports = APIPorts.filter(port => !port.NonCapturable).map(port => ({
        id: port.Id,
        position: [
            Math.round(convertCoordX(port.Position.x, port.Position.z)),
            Math.round(convertCoordY(port.Position.x, port.Position.z))
        ],
        pbCircles: getPBCircles(port),
        forts: getForts(port),
        towers: getTowers(port),
        joinCircles: getJoinCircles(port),
        raidCircles: getRaidCircles(port),
        raidPoints: getRaidPoints(port)
    }));

    saveJson(outFilename, ports);
}

convertPBZones();
