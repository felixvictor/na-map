import { cleanName, readJson, saveJson, distancePoints, sortBy, nations } from "./common.mjs";

const date = "2019-06-08";
const numPorts = 3;
const inFilename = `build/API/api-eu1-Ports-${date}.json`;
const outFilename = "port-distances.json";

const outNations = ["NT"];

const ports = readJson(inFilename);

const findNationName = nationId => nations.find(nation => nation.id === nationId).name;

const portDistancesNations = nations
    .filter(fromNation => !outNations.includes(fromNation.short))
    .flatMap(fromNation =>
        ports
            // fromPort must be a county-capital owned by the fromNation
            .filter(
                fromPort =>
                    fromPort.Nation !== 9 &&
                    fromPort.Name === fromPort.CountyCapitalName &&
                    fromPort.Nation === fromNation.id
            )
            .flatMap(fromPort =>
                ports
                    // toPort must be a capturable county-capital from another nation than fromPort
                    .filter(
                        toPort =>
                            !toPort.NonCapturable &&
                            toPort.Name === toPort.CountyCapitalName &&
                            toPort.Nation !== fromPort.Nation
                    )
                    .map(toPort => ({
                        fromNation: fromNation.name,
                        fromPort: cleanName(fromPort.Name),
                        toNation: findNationName(toPort.Nation),
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
    );

const portDistancesFreeTowns = nations
    .filter(fromNation => !outNations.includes(fromNation.short) && fromNation.short !== "FT")
    .flatMap(fromNation =>
        ports
            // fromPort must be a free town
            .filter(fromPort => fromPort.Nation === 9)
            .flatMap(fromPort =>
                ports
                    // toPort must be a capturable county-capital from another nation than fromPort
                    .filter(
                        toPort =>
                            !toPort.NonCapturable &&
                            toPort.Name === toPort.CountyCapitalName &&
                            toPort.Nation !== fromNation.id
                    )
                    .map(toPort => ({
                        fromNation: fromNation.name,
                        fromPort: cleanName(fromPort.Name),
                        toNation: findNationName(toPort.Nation),
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
    );

const portDistances = [...portDistancesNations, ...portDistancesFreeTowns].sort(
    sortBy(["fromNation", "fromPort", "distance"])
);

saveJson(outFilename, portDistances);
