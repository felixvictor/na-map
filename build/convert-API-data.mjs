import polylabel from "polylabel";

import { convertCoordX, convertCoordY, rotationAngleInDegrees, readJson, saveJson } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    outDir = process.argv[4],
    date = process.argv[5];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`),
    APIPorts = readJson(`${inBaseFilename}-Ports-${date}.json`),
    APIShops = readJson(`${inBaseFilename}-Shops-${date}.json`),
    ItemNames = new Map();

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function getItemNames() {
    APIItems.filter(item => item.ItemType === "Material" || item.ItemType === "Resource").forEach(item => {
        ItemNames.set(item.Id, {
            name: item.Name.replaceAll("'", "’"),
            trading: item.SortingGroup === "Resource.Trading"
        });
    });
}

function convertPorts() {
    const capitalToCounty = new Map([
            ["Arenas", "Cayos del Golfo"],
            ["Ays", "Costa del Fuego"],
            ["Baracoa", "Baracoa"],
            ["Basse-Terre", "Basse-Terre"],
            ["Belize", "Belize"],
            ["Black River", "North Mosquito"],
            ["Bluefields", "South Mosquito"],
            ["Brangman's Bluff", "Royal Mosquito"],
            ["Bridgetown", "Windward Isles"],
            ["Calobelo", "Portobelo"],
            ["Campeche", "Campeche"],
            ["Cap-Français", "Cap-Français"],
            ["Caracas", "Caracas"],
            ["Cartagena de Indias", "Cartagena"],
            ["Castries", "Sainte-Lucie"],
            ["Caymans", "George Town"],
            ["Charleston", "South Carolina"],
            ["Christiansted", "Vestindiske Øer"],
            ["Cumaná", "Cumaná"],
            ["Fort-Royal", "Martinique"],
            ["Gasparilla", "Costa de los Calos"],
            ["George Town", "Caymans"],
            ["George's Town", "Exuma"],
            ["Gibraltar", "Lago de Maracaibo"],
            ["Grand Turk", "Turks and Caicos"],
            ["Gustavia", "Gustavia"],
            ["Islamorada", "Los Martires"],
            ["Kidd's Harbour", "Kidd’s Island"],
            ["Kingston / Port Royal", "Surrey"],
            ["La Bahía", "Texas"],
            ["La Habana", "La Habana"],
            ["Les Cayes", "Les Cayes"],
            ["Maracaibo", "Golfo de Maracaibo"],
            ["Marsh Harbour", "Abaco"],
            ["Matina", "Costa Rica"],
            ["Morgan's Bluff", "Andros"],
            ["Mortimer Town", "Inagua"],
            ["Nassau", "New Providence"],
            ["Nouvelle-Orléans", "Louisiane"],
            ["Nuevitas", "Nuevitas del Principe"],
            ["Old Providence", "Providencia"],
            ["Omoa", "Comayaqua"],
            ["Oranjestad", "Bovenwinds"],
            ["Pampatar", "Margarita"],
            ["Pedro Cay", "South Cays"],
            ["Penzacola", "Florida Occidental"],
            ["Pinar del Río", "Filipina"],
            ["Pitt's Town", "Crooked"],
            ["Pointe-à-Pitre", "Grande-Terre"],
            ["Ponce", "Ponce"],
            ["Port-au-Prince", "Port-au-Prince"],
            ["Portobelo", "Portobelo"],
            ["Puerto de España", "Trinidad"],
            ["Puerto Plata", "La Vega"],
            ["Remedios", "Los Llanos"],
            ["Road Town", "Virgin Islands"],
            ["Roseau", "Dominica"],
            ["Saint George's Town", "Bermuda"],
            ["Saint John's", "Leeward Islands"],
            ["Salamanca", "Bacalar"],
            ["San Agustín", "Timucua"],
            ["San Juan", "San Juan"],
            ["San Marcos", "Apalache"],
            ["Sant Iago", "Cuidad de Cuba"],
            ["Santa Fe", "Isla de Pinos"],
            ["Santa Marta", "Santa Marta"],
            ["Santo Domingo", "Santo Domingo"],
            ["Santo Tomé de Guayana", "Orinoco"],
            ["Savanna la Mar", "Cornwall"],
            ["Savannah", "Georgia"],
            ["Selam", "Mérida"],
            ["Soto La Marina", "Nuevo Santander"],
            ["Trinidad", "Quatro Villas"],
            ["Vera Cruz", "Vera Cruz"],
            ["West End", "Grand Bahama"],
            ["Willemstad", "Benedenwinds"],
            ["Wilmington", "North Carolina"]
        ]),
        counties = new Map(),
        regions = new Map();
    const geoJsonPort = {},
        geoJsonRegions = {},
        geoJsonCounties = {};

    geoJsonPort.type = "FeatureCollection";
    geoJsonRegions.type = "FeatureCollection";
    geoJsonCounties.type = "FeatureCollection";
    geoJsonPort.features = [];
    geoJsonRegions.features = [];
    geoJsonCounties.features = [];

    /**
     *
     * @param {Object} port Port data.
     * @param {Array} portPos Port screen x/y coordinates.
     * @return {void}
     */
    function setCountyFeature(port, portPos) {
        console.log(port.county);
        if (!counties.has(port.county)) {
            counties.set(port.county, port.county);

            const feature = {
                type: "Feature",
                id: port.county,
                geometry: {
                    type: "Polygon",
                    coordinates: [portPos]
                }
            };
            geoJsonCounties.features.push(feature);
        } else {
            geoJsonCounties.features
                .filter(county => county.id === port.county)
                .some(county => county.geometry.coordinates.push(portPos));
        }
    }

    /**
     *
     * @param {Object} port Port data.
     * @param {Array} portPos Port screen x/y coordinates.
     * @return {void}
     */
    function setRegionFeature(port, portPos) {
        if (!regions.has(port.Location)) {
            regions.set(port.Location, port.Location);

            const feature = {
                type: "Feature",
                id: port.Location,
                geometry: {
                    type: "Polygon",
                    coordinates: [portPos]
                }
            };
            geoJsonRegions.features.push(feature);
        } else {
            geoJsonRegions.features
                .filter(region => region.id === port.Location)
                .some(region => region.geometry.coordinates.push(portPos));
        }
    }

    /**
     *
     * @param {Object} port Port data.
     * @param {Array} portPos Port screen x/y coordinates.
     * @return {void}
     */
    function setPortFeature(port, portPos) {
        const portShop = APIShops.filter(shop => shop.Id === port.Id),
            circleAPos = [
                Math.round(convertCoordX(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z)),
                Math.round(convertCoordY(port.PortBattleZonePositions[0].x, port.PortBattleZonePositions[0].z))
            ],
            angle = Math.round(rotationAngleInDegrees(portPos, circleAPos));

        const feature = {
            type: "Feature",
            id: port.Id,
            geometry: {
                type: "Point",
                coordinates: portPos
            },
            properties: {
                name: port.Name.replaceAll("'", "’"),
                angle,
                textAnchor: angle > 0 && angle < 180 ? "start" : "end",
                region: port.Location,
                countyCapitalName: port.CountyCapitalName,
                county:
                    typeof capitalToCounty.get(port.CountyCapitalName) !== "undefined"
                        ? capitalToCounty.get(port.CountyCapitalName)
                        : "",
                countyCapital: port.Name === port.CountyCapitalName,
                shallow: port.Depth,
                availableForAll: port.AvailableForAll,
                brLimit: port.PortBattleBRLimit,
                portBattleStartTime: port.PortBattleStartTime,
                portBattleType: port.PortBattleType,
                nonCapturable: port.NonCapturable,
                conquestMarksPension: port.ConquestMarksPension,
                portTax: Math.round(port.PortTax * 100) / 100,
                taxIncome: port.LastTax,
                netIncome: port.LastTax - port.LastCost,
                tradingCompany: port.TradingCompany,
                laborHoursDiscount: port.LaborHoursDiscount,
                producesTrading: portShop.map(shop =>
                    shop.ResourcesProduced.filter(good => ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                dropsTrading: portShop.map(shop =>
                    shop.ResourcesAdded.filter(good => ItemNames.get(good.Template).trading)
                        .map(good => ItemNames.get(good.Template).name)
                        .sort()
                )[0],
                consumesTrading: portShop.map(shop =>
                    shop.ResourcesConsumed.filter(good => ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                producesNonTrading: portShop.map(shop =>
                    shop.ResourcesProduced.filter(good => !ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0],
                dropsNonTrading: portShop.map(shop =>
                    shop.ResourcesAdded.filter(good => !ItemNames.get(good.Template).trading)
                        .map(good => ItemNames.get(good.Template).name)
                        .sort()
                )[0],
                consumesNonTrading: portShop.map(shop =>
                    shop.ResourcesConsumed.filter(good => !ItemNames.get(good.Key).trading)
                        .map(good => ItemNames.get(good.Key).name)
                        .sort()
                )[0]
            }
        };
        geoJsonPort.features.push(feature);
    }

    APIPorts.forEach(port => {
        const portPos = [
            Math.round(convertCoordX(port.Position.x, port.Position.z)),
            Math.round(convertCoordY(port.Position.x, port.Position.z))
        ];
        setCountyFeature(port, portPos);
        setRegionFeature(port, portPos);
        setPortFeature(port, portPos);
    });
    saveJson(outFilename, geoJsonPort);
    saveJson(`${outDir}/regions.json`, geoJsonRegions);
    saveJson(`${outDir}/counties.json`, geoJsonCounties);

    geoJsonRegions.features.forEach(region => {
        console.log(region.id, polylabel([region.geometry.coordinates], 1.0));
    });
    // console.log(JSON.stringify(geoJsonRegion));
    counties.forEach((value, key) => {
        console.log(`${key} = ${value}`);
    });
}

getItemNames();
convertPorts();
