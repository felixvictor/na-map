import d3Node from "d3-node";
const d3n = d3Node();
const { d3 } = d3n;

import { cleanName, readJson, saveJson, distancePoints, sortBy, nations, speedFactor } from "./common.mjs";

const date = "2019-04-24";
const numPorts = 3;
const inFilename = `build/API/api-eu1-Ports-${date}.json`;
const outFilename = "port-distances.json";

const outNations = ["NT"];

const ports = readJson(inFilename);

const findNationName = nationId => nations.find(nation => nation.id === nationId).name;

const getName = port => (port.CountyCapitalName ? port.CountyCapitalName : port.Name);

const getKDistanceFromF11 = (Pt1, Pt2) => Math.round(distancePoints(Pt1, Pt2) / (2.63 * speedFactor));

// Group port coordinates by county
// https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
const counties = ports.reduce(
    (r, a) =>
        Object.assign(r, {
            [getName(a)]: (r[getName(a)] || []).concat([[a.Position.x, a.Position.z]])
        }),
    {}
);
// console.log(counties);
const countyCentroids = new Map(
    Object.entries(counties).map(([key, value]) => {
        const polygon = d3.polygonHull(value);
        return [key, polygon ? d3.polygonCentroid(polygon) : value.flat()];
    })
);
// console.log(countyPolygons);

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
                        distance: getKDistanceFromF11(
                            // Distance based on county capital positions
                            { x: fromPort.Position.x, y: fromPort.Position.z },
                            { x: toPort.Position.x, y: toPort.Position.z }
                            /*
                                // Distance based on county centroids
                                { x: countyCentroids.get(fromPort.Name)[0], y: countyCentroids.get(fromPort.Name)[1] },
                                { x: countyCentroids.get(toPort.Name)[0], y: countyCentroids.get(toPort.Name)[1] }
                                 */
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
                        distance: getKDistanceFromF11(
                            // Distance based on county capital positions
                            { x: fromPort.Position.x, y: fromPort.Position.z },
                            { x: toPort.Position.x, y: toPort.Position.z }
                            /*
                                // Distance based on county centroids
                                { x: countyCentroids.get(fromPort.Name)[0], y: countyCentroids.get(fromPort.Name)[1] },
                                { x: countyCentroids.get(toPort.Name)[0], y: countyCentroids.get(toPort.Name)[1] }
                                 */
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
