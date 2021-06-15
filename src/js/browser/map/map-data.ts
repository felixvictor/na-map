import { Point } from "common/common-math"

export interface Area {
    name: string
    centroid: Point
    angle: number
}

export interface PatrolZone {
    name: string
    coordinates: Point
    radius: number
    shallow: boolean
    shipClass?: MinMax<number>
}

interface MinMax<amount> {
    min: amount
    max: amount
}

/*
// Automatic calculation of text position
// https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
const counties = this._portDataDefault
    .filter(port => port.county !== "")
    .reduce(
        (r, a) =>
            Object.assign(r, {
                [a.county]: (r[a.county] || []).concat([a.coordinates])
            }),
        {}
    );
this._countyPolygon = [];
Object.entries(counties).forEach(([key, value]) => {
    this._countyPolygon.push({
        name: key,
        polygon: d3PolygonHull(value),
        centroid: d3PolygonCentroid(d3PolygonHull(value)),
        angle: 0
    });
});
 */

// noinspection SpellCheckingInspection
export const countyPolygon = [
    { name: "Abaco", centroid: [4500, 1953], angle: 0 },
    { name: "Andros", centroid: [3870, 2350], angle: 0 },
    { name: "Apalache", centroid: [2800, 1330], angle: 0 },
    { name: "Bacalar", centroid: [2050, 3646], angle: 0 },
    { name: "Baracoa", centroid: [4750, 3320], angle: 25 },
    { name: "Basse-Terre", centroid: [7540, 4450], angle: 0 },
    { name: "Belize", centroid: [1900, 4300], angle: 0 },
    { name: "Benedenwinds", centroid: [6187, 5340], angle: 0 },
    { name: "Bermuda", centroid: [7550, 210], angle: 0 },
    { name: "Bovenwinds", centroid: [7280, 4180], angle: 350 },
    { name: "Campeche", centroid: [980, 3791], angle: 0 },
    { name: "Cap-Français", centroid: [5270, 3480], angle: 0 },
    { name: "Caracas", centroid: [6430, 5750], angle: 0 },
    { name: "Cartagena", centroid: [4450, 6024], angle: 0 },
    { name: "Caymans", centroid: [3116, 3811], angle: 0 },
    { name: "Cayos del Golfo", centroid: [1240, 3120], angle: 0 },
    { name: "Comayaqua", centroid: [1920, 4500], angle: 0 },
    { name: "Cornwall", centroid: [4100, 3845], angle: 0 },
    { name: "Costa de los Calos", centroid: [2850, 1928], angle: 0 },
    { name: "Costa del Fuego", centroid: [3700, 1670], angle: 70 },
    { name: "Costa Rica", centroid: [3140, 5920], angle: 0 },
    { name: "Crooked", centroid: [4925, 2950], angle: 0 },
    { name: "Ciudad de Cuba", centroid: [4500, 3495], angle: 0 },
    { name: "Cumaná", centroid: [7280, 5770], angle: 0 },
    { name: "Dominica", centroid: [7640, 4602], angle: 0 },
    { name: "Exuma", centroid: [4700, 2560], angle: 0 },
    { name: "Filipina", centroid: [2850, 3100], angle: 340 },
    { name: "Florida Occidental", centroid: [2172, 1200], angle: 0 },
    { name: "Georgia", centroid: [3670, 747], angle: 0 },
    { name: "Golfo de Maracaibo", centroid: [5635, 5601], angle: 0 },
    { name: "Grand Bahama", centroid: [3950, 1850], angle: 320 },
    { name: "Grande-Terre", centroid: [8000, 4400], angle: 35 },
    { name: "Gustavia", centroid: [7720, 3990], angle: 0 },
    { name: "Inagua", centroid: [4970, 3220], angle: 0 },
    { name: "Isla de Pinos", centroid: [3150, 3300], angle: 0 },
    { name: "Kidd’s Island", centroid: [5950, 1120], angle: 0 },
    { name: "La Habana", centroid: [2850, 2800], angle: 340 },
    { name: "La Vega", centroid: [5830, 3530], angle: 20 },
    { name: "Lago de Maracaibo", centroid: [5550, 6040], angle: 0 },
    { name: "Leeward Islands", centroid: [7850, 4150], angle: 0 },
    { name: "Les Cayes", centroid: [5145, 4050], angle: 0 },
    { name: "Los Llanos", centroid: [3640, 2770], angle: 30 },
    { name: "Los Martires", centroid: [3300, 2360], angle: 0 },
    { name: "Louisiane", centroid: [1420, 1480], angle: 0 },
    { name: "Margarita", centroid: [7150, 5584], angle: 0 },
    { name: "Martinique", centroid: [7700, 4783], angle: 0 },
    { name: "Mérida", centroid: [1858, 3140], angle: 0 },
    { name: "New Providence", centroid: [4500, 2330], angle: 0 },
    { name: "North Carolina", centroid: [4580, 150], angle: 0 },
    { name: "North Mosquito", centroid: [2420, 4480], angle: 0 },
    { name: "Nuevitas del Principe", centroid: [4350, 3050], angle: 35 },
    { name: "Nuevo Santander", centroid: [450, 2594], angle: 0 },
    { name: "Orinoco", centroid: [7620, 6000], angle: 0 },
    { name: "Ponce", centroid: [6720, 4040], angle: 0 },
    { name: "Port-au-Prince", centroid: [5000, 3800], angle: 0 },
    { name: "Portobelo", centroid: [3825, 5990], angle: 0 },
    { name: "Providencia", centroid: [3436, 5033], angle: 0 },
    { name: "Quatro Villas", centroid: [3780, 3100], angle: 35 },
    { name: "Royal Mosquito", centroid: [3130, 4840], angle: 0 },
    { name: "Sainte-Lucie", centroid: [7720, 4959], angle: 0 },
    { name: "San Juan", centroid: [6760, 3800], angle: 0 },
    { name: "Santa Marta", centroid: [5150, 5500], angle: 340 },
    { name: "Santo Domingo", centroid: [5880, 4000], angle: 350 },
    { name: "South Carolina", centroid: [4200, 416], angle: 0 },
    { name: "South Cays", centroid: [4170, 4361], angle: 0 },
    { name: "South Mosquito", centroid: [3080, 5540], angle: 0 },
    { name: "Surrey", centroid: [4350, 4100], angle: 0 },
    { name: "Texas", centroid: [750, 1454], angle: 0 },
    { name: "Timucua", centroid: [3620, 1220], angle: 0 },
    { name: "Trinidad", centroid: [7880, 5660], angle: 350 },
    { name: "Turks and Caicos", centroid: [5515, 3145], angle: 0 },
    { name: "Vera Cruz", centroid: [520, 3779], angle: 0 },
    { name: "Vestindiske Øer", centroid: [7090, 4030], angle: 350 },
    { name: "Virgin Islands", centroid: [7220, 3840], angle: 350 },
    { name: "Windward Isles", centroid: [7800, 5244], angle: 0 },
] as Area[]

/*
** Automatic calculation of text position
// https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
const regions = this._portDataDefault.filter(port => port.region !== "").reduce(
    (r, a) =>
        Object.assign(r, {
            [a.region]: (r[a.region] || []).concat([a.coordinates])
        }),
    {}
);
this._regionPolygon = [];
Object.entries(regions).forEach(([key, value]) => {
    this._regionPolygon.push({
        name: key,
        // polygon: d3.polygonHull(value),
        centroid: d3.polygonCentroid(d3.polygonHull(value))
    });
});
*/

export const regionPolygon = [
    { name: "Atlantic Coast", centroid: [4200, 970], angle: 0 },
    { name: "Atlantic", centroid: [6401, 684], angle: 0 },
    { name: "Bahamas", centroid: [5100, 2400], angle: 0 },
    { name: "Central America", centroid: [3000, 5100], angle: 0 },
    { name: "Central Antilles", centroid: [6900, 4500], angle: 0 },
    { name: "East Cuba", centroid: [4454, 3400], angle: 20 },
    { name: "Gulf", centroid: [1602, 2328], angle: 0 },
    { name: "Hispaniola", centroid: [5477, 4200], angle: 0 },
    { name: "Jamaica", centroid: [3500, 3985], angle: 0 },
    { name: "Lower Antilles", centroid: [7100, 5173], angle: 0 },
    { name: "Puerto Rico", centroid: [6900, 3750], angle: 0 },
    { name: "South America", centroid: [6400, 6100], angle: 0 },
    { name: "Upper Antilles", centroid: [6850, 4250], angle: 0 },
    { name: "West Cuba", centroid: [3700, 3000], angle: 20 },
    { name: "Yucatan", centroid: [1462, 3550], angle: 0 },
] as Area[]

export const patrolZones = [
    { name: "Hispaniola", coordinates: [4900, 3635], radius: 150, shallow: false },
    { name: "Nassau", coordinates: [4360, 2350], radius: 108, shallow: true },
    { name: "Tumbado", coordinates: [2400, 3050], radius: 150, shallow: false },
    { name: "Léogane", coordinates: [5130, 3770], radius: 90, shallow: false, shipClass: { min: 7, max: 4 } },
    { name: "Tortuga", coordinates: [5435, 3420], radius: 100, shallow: false, shipClass: { min: 7, max: 5 } },
    { name: "Antilles", coordinates: [7555, 4470], radius: 140, shallow: false },
    { name: "Nassau", coordinates: [4360, 2350], radius: 108, shallow: true },
    { name: "La Mona", coordinates: [6180, 4100], radius: 170, shallow: false, shipClass: { min: 7, max: 4 } },
] as PatrolZone[]
