import { cleanName, readJson, saveJson, distancePoints, sortBy, nations } from "./common.mjs";

const date = "2019-04-24";
const numPorts = 3;
const inFilename = `build/API/api-eu1-Ports-${date}.json`;
const outFilename = "port-distances.json";

const ports = readJson(inFilename);

const portDistances = nations
    .filter(fromNation => !["NT"].includes(fromNation.short))
    .flatMap(fromNation =>
        ports
            .filter(fromPort =>
                fromNation.short === "FT"
                    ? fromPort.Nation === 9
                    : fromPort.Name === fromPort.CountyCapitalName && fromPort.Nation === fromNation.id
            )
            .flatMap(fromPort =>
                ports
                    .filter(
                        toPort =>
                            !toPort.NonCapturable &&
                            toPort.Nation !== fromPort.Nation &&
                            toPort.Name === toPort.CountyCapitalName
                    )
                    .map(toPort => ({
                        fromNation: fromNation.name,
                        fromPort: cleanName(fromPort.Name),
                        toNation: nations.find(nation => nation.id === toPort.Nation).name,
                        toPort: cleanName(toPort.Name),
                        distance: Math.round(
                            distancePoints(
                                { x: fromPort.Position.x, y: fromPort.Position.z },
                                { x: toPort.Position.x, y: toPort.Position.z }
                            ) / 1000
                        )
                    }))
                    .sort(sortBy(["distance"]))
                    .slice(0, numPorts)
            )
    )
    .sort(sortBy(["fromNation", "fromPort", "distance"]));

saveJson(outFilename, portDistances);
