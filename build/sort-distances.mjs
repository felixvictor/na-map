import { readJson, saveJson, distancePoints, sortBy, nations } from "./common.mjs";

const date = "2019-04-28";
const numPorts = 3;
const inFilename = `build/API/api-eu1-Ports-${date}.json`;
const outFilename = "port-distances.json";

const ports = readJson(inFilename);

const portDistances = nations
    .filter(fromNation => !["NT"].includes(fromNation.short))
    .map(fromNation =>
        ports
            .filter(fromPort =>
                fromNation.short === "FT"
                    ? fromPort.Nation === 9
                    : fromPort.Name === fromPort.CountyCapitalName && fromPort.Nation === fromNation.id
            )
            .map(fromPort =>
                ports
                    .filter(
                        toPort =>
                            !toPort.NonCapturable &&
                            toPort.Nation !== fromPort.Nation &&
                            toPort.Name === toPort.CountyCapitalName
                    )
                    .map(toPort => ({
                        fromNation: fromNation.name,
                        fromPort: fromPort.Name,
                        toPort: toPort.Name,
                        toNation: nations.find(nation => nation.id === toPort.Nation).name,
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
            .flat()
            .sort(sortBy(["nation", "from", "distance"]))
    )
    .flat();

saveJson(outFilename, portDistances);
