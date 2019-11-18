/**
 * This file is part of na-map.
 *
 * @file      Display ports.
 * @module    map/display-ports
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/tooltip";

import { min as d3Min, max as d3Max } from "d3-array";
import { interpolateHclLong as d3InterpolateHclLong } from "d3-interpolate";
// import { polygonCentroid as d3PolygonCentroid, polygonHull as d3PolygonHull } from "d3-polygon";
import { scaleLinear as d3ScaleLinear, scaleOrdinal as d3ScaleOrdinal } from "d3-scale";
import { select as d3Select } from "d3-selection";
// import { curveCatmullRomClosed as d3CurveCatmullRomClosed, line as d3Line } from "d3-shape";

import moment from "moment";
import "moment/locale/en-gb";

import {
    colourGreenDark,
    colourGreenLight,
    colourList,
    colourRedDark,
    colourRedLight,
    colourWhite,
    defaultCircleSize,
    defaultFontSize,
    nations
} from "../common";
import {
    degreesToRadians,
    displayClan,
    distancePoints,
    formatInt,
    formatPercent,
    formatSiCurrency,
    formatSiInt,
    getOrdinal,
    putImportError,
    roundToThousands
} from "../util";
import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";

import TrilateratePosition from "../map-tools/get-position";

export default class DisplayPorts {
    constructor(map) {
        this._map = map;

        this._serverName = this._map._serverName;
        this._minScale = this._map._minScale;
        this._scale = this._minScale;
        this.f11 = this._map._f11;

        this.showCurrentGood = false;
        this.showTradePortPartners = false;

        // Shroud Cay
        this._currentPort = { id: "366", coord: { x: 4396, y: 2494 } };

        this.zoomLevel = "initial";
        this._showPBZones = "all";
        this._tooltipDuration = 200;
        this._iconSize = 48;
        this._fontSize = defaultFontSize;
        this._circleSize = defaultCircleSize;

        this._minRadiusFactor = 1;
        this._maxRadiusFactor = 6;

        /**
         * Base Id
         * @type {string}
         */
        this._baseId = "show-radius";

        /**
         * Possible values for show radius (first is default value)
         * @type {string[]}
         * @private
         */
        this._radioButtonValues = ["attack", "county", "points", "position", "tax", "net", "off"];

        /**
         * Show radius cookie
         * @type {Cookie}
         */
        this._cookie = new Cookie({ id: this._baseId, values: this._radioButtonValues });

        /**
         * Show radius radio buttons
         * @type {RadioButton}
         */
        this._radios = new RadioButton(this._baseId, this._radioButtonValues);

        /**
         * Get showRadius setting from cookie or use default value
         * @type {string}
         * @private
         */
        this._showRadius = this._getShowRadiusSetting();

        this._trilateratePosition = new TrilateratePosition(this);
    }

    async init() {
        await this._loadAndSetupData();
    }

    _setupData(data) {
        // Combine port data with port battle data
        const portData = data.ports.map(port => {
            const serverData = data.server.find(d => d.id === port.id);
            const pbData = data.pb.ports.find(d => d.id === port.id);
            const combinedData = { ...port, ...serverData, ...pbData };

            // Delete empty entries
            ["dropsTrading", "consumesTrading", "producesNonTrading", "dropsNonTrading"].forEach(type => {
                if (!combinedData[type]) {
                    delete combinedData[type];
                }
            });

            return combinedData;
        });

        this._portDataDefault = portData;
        this._portData = portData;

        this._setupScales();
        this._setupListener();
        this._setupSvg();
        this._setupCounties();
        this._setupRegions();
        this._setupSummary();
        this._setupFlags();
    }

    async _loadData() {
        /**
         * Data directory
         * @type {string}
         * @private
         */
        const dataDirectory = "data";

        /**
         * Data sources
         * @type {Array<fileName: string, name: string>}
         * @private
         */
        const dataSources = [
            {
                fileName: `${this._serverName}.json`,
                name: "server"
            },
            {
                fileName: `${this._serverName}-pb.json`,
                name: "pb"
            }
        ];

        const readData = {};

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const loadEntries = async dataSources => {
            for await (const dataSource of dataSources) {
                readData[dataSource.name] = await (await fetch(`${dataDirectory}/${dataSource.fileName}`)).json();
            }
        };

        try {
            readData.ports = (await import(/* webpackChunkName: "data-ports" */ "../../gen/ports.json")).default;
            await loadEntries(dataSources);
            return readData;
        } catch (error) {
            putImportError(error);
        }
    }

    async _loadAndSetupData() {
        const readData = await this._loadData();
        this._setupData(readData);
    }

    _setupScales() {
        this._portRadius = d3ScaleLinear();
        this._attackRadius = d3ScaleLinear().domain([0, 1]);

        this._colourScaleHostility = d3ScaleLinear()
            .domain([0, 0.5, 1])
            .range([colourWhite, colourRedLight, colourRedDark])
            .interpolate(d3InterpolateHclLong);
        this._colourScaleCounty = d3ScaleOrdinal().range(colourList);

        this._minTaxIncome = d3Min(this._portData, d => d.taxIncome);
        this._maxTaxIncome = d3Max(this._portData, d => d.taxIncome);
        this._colourScaleTax = d3ScaleLinear()
            .domain([this._minTaxIncome, this._maxTaxIncome / 10, this._maxTaxIncome])
            .range([colourWhite, colourGreenLight, colourGreenDark])
            .interpolate(d3InterpolateHclLong);

        this._minNetIncome = d3Min(this._portData, d => d.netIncome);
        this._maxNetIncome = d3Max(this._portData, d => d.netIncome);
        this._colourScaleNet = d3ScaleLinear()
            .domain([this._minNetIncome, this._minNetIncome / 100, 0, this._maxNetIncome / 100, this._maxNetIncome])
            .range([colourRedDark, colourRedLight, colourWhite, colourGreenLight, colourGreenDark])
            .interpolate(d3InterpolateHclLong);

        this._minPortPoints = d3Min(this._portData, d => d.portPoints);
        this._maxPortPoints = d3Max(this._portData, d => d.portPoints);
        this._colourScalePoints = d3ScaleLinear()
            .domain([this._minPortPoints, this._maxPortPoints])
            .range([colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHclLong);
    }

    _setupListener() {
        document.getElementById("show-radius").addEventListener("change", () => this._showRadiusSelected());
    }

    /**
     * Get show setting from cookie or use default value
     * @returns {string} - Show setting
     * @private
     */
    _getShowRadiusSetting() {
        let r = this._cookie.get();

        // Radius "position" after reload is useless
        if (r === "position") {
            [r] = this._radioButtonValues;
            this._cookie.set(r);
        }

        this._radios.set(r);

        return r;
    }

    _showRadiusSelected() {
        this._showRadius = this._radios.get();
        this._cookie.set(this._showRadius);
        this.update();
    }

    _setupSvg() {
        this._gPort = d3Select("#na-svg")
            .insert("g", "g.f11")
            .attr("data-ui-component", "ports")
            .attr("id", "ports");
        this._gRegion = this._gPort.append("g").attr("class", "region");
        this._gCounty = this._gPort.append("g").attr("class", "county");
        this._gPortCircle = this._gPort.append("g").attr("data-ui-component", "port-circles");
        this._gIcon = this._gPort.append("g").attr("class", "port");
        this._gText = this._gPort.append("g").attr("class", "port-names");
    }

    _setupCounties() {
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

        this._countyPolygon = [
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
            { name: "Cuidad de Cuba", centroid: [4500, 3495], angle: 0 },
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
            { name: "Windward Isles", centroid: [7800, 5244], angle: 0 }
        ];

        // Sort by distance, origin is top left corner
        const origin = { x: this._map.coord.max / 2, y: this._map.coord.max / 2 };
        this._countyPolygon = this._countyPolygon.sort((a, b) => {
            const pointA = { x: a.centroid[0], y: a.centroid[1] };
            const pointB = { x: b.centroid[0], y: b.centroid[1] };

            return distancePoints(origin, pointA) - distancePoints(origin, pointB);
        });
        this._colourScaleCounty.domain(this._countyPolygon.map(county => county.name));
    }

    _setupRegions() {
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

        this._regionPolygon = [
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
            { name: "Yucatan", centroid: [1462, 3550], angle: 0 }
        ];
    }

    _setupSummary() {
        // Main box
        this._divPortSummary = d3Select("main #summary-column")
            .append("div")
            .attr("id", "port-summary")
            .attr("class", "port-summary port-summary-no-wind");

        // Number of selected ports
        this._portSummaryNumPorts = this._divPortSummary.append("div").attr("class", "block");
        this._portSummaryTextNumPorts = this._portSummaryNumPorts.append("div");
        this._portSummaryNumPorts
            .append("div")
            .attr("class", "summary-des")
            .html("selected<br>ports");

        // Total tax income
        this._portSummaryTaxIncome = this._divPortSummary.append("div").attr("class", "block");
        this._portSummaryTextTaxIncome = this._portSummaryTaxIncome.append("div");
        this._portSummaryTaxIncome
            .append("div")
            .attr("class", "summary-des")
            .html("tax<br>income");

        // Total net income
        this._portSummaryNetIncome = this._divPortSummary.append("div").attr("class", "block");
        this._portSummaryTextNetIncome = this._portSummaryNetIncome.append("div");
        this._portSummaryNetIncome
            .append("div")
            .attr("class", "summary-des")
            .html("net<br>income");
    }

    /**
     * @link https://stackoverflow.com/questions/42118296/dynamically-import-images-from-a-directory-using-webpack
     * @param {object} r - webpack require.context
     * @return {object} Images
     */
    static _importAll(r) {
        const images = {};
        r.keys().forEach(item => {
            images[item.replace("./", "").replace(".svg", "")] = r(item);
        });
        return images;
    }

    _setupFlags() {
        this._nationIcons = DisplayPorts._importAll(require.context("Flags", false, /\.svg$/));
        const svgDef = d3Select("#na-svg defs");

        nations
            .map(d => d.short)
            .forEach(nation => {
                const pattern = svgDef
                    .append("pattern")
                    .attr("id", nation)
                    .attr("width", "133%")
                    .attr("height", "100%")
                    .attr("viewBox", `6 6 ${this._iconSize} ${this._iconSize * 0.75}`);
                pattern
                    .append("image")
                    .attr("height", this._iconSize)
                    .attr("width", this._iconSize)
                    .attr("href", this._nationIcons[nation].replace('"', "").replace('"', ""));

                if (nation !== "FT") {
                    const patternCapital = svgDef
                        .append("pattern")
                        .attr("id", `${nation}c`)
                        .attr("width", "133%")
                        .attr("height", "100%")
                        .attr("viewBox", `6 6 ${this._iconSize} ${this._iconSize * 0.75}`);
                    patternCapital
                        .append("image")
                        .attr("height", this._iconSize)
                        .attr("width", this._iconSize)
                        .attr("href", this._nationIcons[`${nation}`].replace('"', "").replace('"', ""));
                    patternCapital
                        .append("circle")
                        .attr("cx", this._iconSize / 2)
                        .attr("cy", this._iconSize / 2)
                        .attr("r", 16);
                }

                if (nation !== "NT" && nation !== "FT") {
                    const patternAvail = svgDef
                        .append("pattern")
                        .attr("id", `${nation}a`)
                        .attr("width", "133%")
                        .attr("height", "100%")
                        .attr("viewBox", `6 6 ${this._iconSize} ${this._iconSize * 0.75}`);
                    patternAvail
                        .append("image")
                        .attr("height", this._iconSize)
                        .attr("width", this._iconSize)
                        .attr("href", this._nationIcons[`${nation}a`].replace('"', "").replace('"', ""));

                    const patternCapitalAvail = svgDef
                        .append("pattern")
                        .attr("id", `${nation}ca`)
                        .attr("width", "133%")
                        .attr("height", "100%")
                        .attr("viewBox", `6 6 ${this._iconSize} ${this._iconSize * 0.75}`);
                    patternCapitalAvail
                        .append("image")
                        .attr("height", this._iconSize)
                        .attr("width", this._iconSize)
                        .attr("href", this._nationIcons[`${nation}a`].replace('"', "").replace('"', ""));
                    patternCapitalAvail
                        .append("circle")
                        .attr("cx", this._iconSize / 2)
                        .attr("cy", this._iconSize / 2)
                        .attr("r", 16);
                }
            });
    }

    _getPortName(id) {
        return id ? this._portDataDefault.find(port => port.id === id).name : "";
    }

    _getText(id, portProperties) {
        moment.locale("en-gb");
        const portBattleLT = moment.utc(portProperties.portBattle).local();
        const portBattleST = moment.utc(portProperties.portBattle);
        const localTime = portBattleST === portBattleLT ? "" : ` (${portBattleLT.format("H.mm")} local)`;
        const portBattleStartTime = portProperties.portBattleStartTime
            ? `${(portProperties.portBattleStartTime + 10) % 24}.00\u202F–\u202F${(portProperties.portBattleStartTime +
                  13) %
                  24}.00`
            : "11.00\u202F–\u202F8.00";
        const endSyllable = portBattleST.isAfter(moment.utc()) ? "s" : "ed";
        const attackHostility = `${displayClan(portProperties.attackerClan)} (${portProperties.attackerNation}) attack${
            portProperties.portBattle.length
                ? `${endSyllable} ${portBattleST.fromNow()} at ${portBattleST.format("H.mm")}${localTime}`
                : `s: ${formatPercent(portProperties.attackHostility)} hostility`
        }`;
        const port = {
            name: portProperties.name,
            icon: portProperties.nation,
            availableForAll: portProperties.availableForAll ? "(accessible to all nations)" : "",
            depth: portProperties.shallow ? "Shallow" : "Deep",
            county:
                (portProperties.county === "" ? "" : `${portProperties.county}\u200A/\u200A`) + portProperties.region,
            countyCapital: portProperties.countyCapital ? " (county capital)" : "",
            nonCapturable: portProperties.nonCapturable,
            captured: portProperties.capturer
                ? ` captured by ${displayClan(portProperties.capturer)} ${moment
                      .utc(portProperties.lastPortBattle)
                      .fromNow()}`
                : "",
            lastPortBattle: portProperties.lastPortBattle,
            attack: portProperties.attackHostility ? attackHostility : "",
            pbTimeRange: portProperties.nonCapturable ? "" : portBattleStartTime,
            brLimit: formatInt(portProperties.brLimit),
            portPoints: formatInt(portProperties.portPoints),
            conquestMarksPension: portProperties.conquestMarksPension,
            taxIncome: formatSiInt(portProperties.taxIncome),
            portTax: formatPercent(portProperties.portTax),
            netIncome: formatSiInt(portProperties.netIncome),
            tradingCompany: portProperties.tradingCompany
                ? `, trading company level\u202F${portProperties.tradingCompany}`
                : "",
            laborHoursDiscount: portProperties.laborHoursDiscount
                ? `, labor hours discount level\u202F${portProperties.laborHoursDiscount}`
                : "",
            dropsTrading: portProperties.dropsTrading ? portProperties.dropsTrading.join(", ") : "",
            consumesTrading: portProperties.consumesTrading ? portProperties.consumesTrading.join(", ") : "",
            producesNonTrading: portProperties.producesNonTrading ? portProperties.producesNonTrading.join(", ") : "",
            dropsNonTrading: portProperties.dropsNonTrading ? portProperties.dropsNonTrading.join(", ") : "",
            tradePort: this._getPortName(this.tradePortId),
            goodsToSellInTradePort: portProperties.goodsToSellInTradePort
                ? portProperties.goodsToSellInTradePort.join(", ")
                : "",
            goodsToBuyInTradePort: portProperties.goodsToBuyInTradePort
                ? portProperties.goodsToBuyInTradePort.join(", ")
                : ""
        };

        switch (portProperties.portBattleType) {
            case "Large":
                port.pbType = getOrdinal(1);
                break;
            case "Medium":
                port.pbType = getOrdinal(4);
                break;
            default:
                port.pbType = getOrdinal(6);
                break;
        }

        return port;
    }

    static _tooltipData(port) {
        let h = '<div class="d-flex align-items-baseline mb-1">';
        h += `<img alt="${port.icon}" class="flag-icon align-self-stretch" src="${this._nationIcons[port.icon]
            .replace('"', "")
            .replace('"', "")}"/>`;
        h += `<div class="port-name">${port.name}</div>`;
        h += `<div>\u2000${port.county} ${port.availableForAll}</div>`;
        h += "</div>";
        if (port.attack.length) {
            h += `<div class="alert alert-danger mt-2" role="alert">${port.attack}</div>`;
        }

        h += `<p>${port.depth} water port ${port.countyCapital}${port.captured}<br>`;
        if (port.nonCapturable) {
            h += "Not capturable";
            h += `<br>${port.portTax} tax`;
        } else {
            h += `Port battle ${port.pbTimeRange}, ${port.brLimit} <span class="caps">BR</span>, `;
            h += `${port.pbType}\u202Frate <span class="caps">AI</span>, `;
            h += `${port.conquestMarksPension}\u202Fconquest point`;
            h += port.conquestMarksPension > 1 ? "s" : "";
            h += `, ${port.portPoints}\u202Fport points`;
            h += `<br>Tax income ${port.taxIncome} (${port.portTax}), net income ${port.netIncome}`;
            h += port.tradingCompany;
            h += port.laborHoursDiscount;
        }

        h += "</p>";
        h += "<table class='table table-sm'>";
        if (port.producesNonTrading.length) {
            h += "<tr><td class='pl-0'>Produces\u00A0</td><td>";
            h += `<span class="non-trading">${port.producesNonTrading}</span>`;
            h += "</td></tr>";
        }

        if (port.dropsTrading.length || port.dropsNonTrading.length) {
            h += `<tr><td class='pl-0'>Drops\u00A0${port.dropsNonTrading.length ? "\u00A0" : ""}</td><td>`;
            if (port.dropsNonTrading.length) {
                h += `<span class="non-trading">${port.dropsNonTrading}</span>`;
                if (port.dropsTrading.length) {
                    h += "<br>";
                }
            }

            if (port.dropsTrading.length) {
                h += `${port.dropsTrading}`;
            }

            h += "</td></tr>";
        }

        if (port.consumesTrading.length) {
            h += "<tr><td class='pl-0'>Consumes\u00A0</td><td>";
            h += port.consumesTrading;
            h += "</td></tr>";
        }

        if (this.showTradePortPartners) {
            if (port.goodsToSellInTradePort.length) {
                h += `<tr><td class='pl-0'>Sell in ${port.tradePort}\u00A0</td><td>${port.goodsToSellInTradePort}</td></tr>`;
            }

            if (port.goodsToBuyInTradePort.length) {
                h += `<tr><td class='pl-0'>Buy in ${port.tradePort}\u00A0</td><td>${port.goodsToBuyInTradePort}</td></tr>`;
            }
        }

        h += "</table>";

        return h;
    }

    static _getInventory(port) {
        let h = "";

        const buy = port.inventory
            .filter(good => good.buyQuantity > 0)
            .map(good => {
                return `${formatInt(good.buyQuantity)} ${good.name} @ ${formatSiCurrency(good.buyPrice)}`;
            })
            .join("<br>");
        const sell = port.inventory
            .filter(good => good.sellQuantity > 0)
            .map(good => {
                return `${formatInt(good.sellQuantity)} ${good.name} @ ${formatSiCurrency(good.sellPrice)}`;
            })
            .join("<br>");

        h += `<h5 class="caps">${port.name} <span class="small">${port.nation}</span></h5>`;
        if (buy.length) {
            h += "<h6>Buy</h6>";
            h += buy;
        }

        if (buy.length && sell.length) {
            h += "<p></p>";
        }

        if (sell.length) {
            h += "<h6>Sell</h6>";
            h += sell;
        }

        return h;
    }

    _showDetails(d, i, nodes) {
        $(d3Select(nodes[i]).node())
            .tooltip({
                html: true,
                placement: "auto",
                title: DisplayPorts._tooltipData(this._getText(d.id, d)),
                trigger: "manual",
                sanitize: false
            })
            .tooltip("show");

        if (this._map.showTrades.show) {
            if (this._map.showTrades.listType !== "inventory") {
                this._map.showTrades.listType = "inventory";
            }

            this._map.showTrades.update(DisplayPorts._getInventory(d));
        }
    }

    static _hideDetails(d, i, nodes) {
        $(d3Select(nodes[i]).node()).tooltip("dispose");
    }

    _updateIcons() {
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const circleSize = roundToThousands(this._circleSize / circleScale);
        const data = this._portDataFiltered;

        this._gIcon
            .selectAll("circle")
            .data(data, d => d.id)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("fill", d => {
                        const appendix = `${d.countyCapital && !d.nonCapturable ? "c" : ""}${
                            d.availableForAll && d.nation !== "NT" ? "a" : ""
                        }`;
                        return `url(#${d.nation}${appendix})`;
                    })
                    .attr("cx", d => d.coordinates[0])
                    .attr("cy", d => d.coordinates[1])
                    .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
                    .on("mouseleave", DisplayPorts._hideDetails)
            )
            .attr("r", circleSize);
    }

    static _getTradePortMarker(port) {
        let marker = "";
        if (port.id === this.tradePortId) {
            marker = "here";
        } else if (port.sellInTradePort && port.buyInTradePort) {
            marker = "both";
        } else if (port.sellInTradePort) {
            marker = "pos";
        } else if (port.buyInTradePort) {
            marker = "neg";
        }

        return marker;
    }

    _updatePortCircles() {
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const rMin = roundToThousands((this._circleSize / circleScale) * this._minRadiusFactor);
        const rMax = roundToThousands((this._circleSize / circleScale) * this._maxRadiusFactor);
        let data = this._portDataFiltered;
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let cssClass = () => {};
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let r = () => {};
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let fill = () => {};

        if (this._showRadius === "tax") {
            data = this._portDataFiltered.filter(d => !d.nonCapturable);
            this._portRadius.domain([this._minTaxIncome, this._maxTaxIncome]).range([rMin, rMax]);
            cssClass = () => "bubble";
            fill = d => this._colourScaleTax(d.taxIncome);
            r = d => this._portRadius(d.taxIncome);
        } else if (this._showRadius === "net") {
            data = this._portDataFiltered.filter(d => !d.nonCapturable);
            this._portRadius.domain([this._minNetIncome, this._maxNetIncome]).range([rMin, rMax]);
            cssClass = () => "bubble";
            fill = d => this._colourScaleNet(d.netIncome);
            r = d => this._portRadius(Math.abs(d.netIncome));
        } else if (this.showTradePortPartners) {
            cssClass = d => `bubble ${DisplayPorts._getTradePortMarker(d)}`;
            r = d => (d.id === this.tradePortId ? rMax : rMax / 2);
        } else if (this._showRadius === "points") {
            data = this._portDataFiltered.filter(d => !d.nonCapturable);
            this._portRadius.domain([this._minPortPoints, this._maxPortPoints]).range([rMin, rMax / 2]);
            cssClass = () => "bubble";
            fill = d => this._colourScalePoints(d.portPoints);
            r = d => this._portRadius(d.portPoints);
        } else if (this._showRadius === "position") {
            cssClass = () => "bubble here";
            r = d => d.distance;
        } else if (this._showRadius === "attack") {
            data = this._portDataFiltered.filter(port => port.attackHostility);
            this._attackRadius.range([rMin, rMax]);
            cssClass = () => "bubble";
            fill = d => this._colourScaleHostility(d.attackHostility);
            r = d => this._attackRadius(d.attackHostility);
        } else if (this.showCurrentGood) {
            cssClass = d => `bubble ${d.isSource ? "pos" : "neg"}`;
            r = () => rMax / 2;
        } else if (this._showRadius === "county") {
            cssClass = d =>
                d.nonCapturable ? "bubble not-capturable" : d.countyCapital ? "bubble capital" : "bubble non-capital";
            fill = d => (d.nonCapturable ? "" : this._colourScaleCounty(d.county));
            r = d => (d.nonCapturable ? rMax / 3 : rMax / 2);
        } else if (this._showRadius === "off") {
            data = {};
        }

        this._gPortCircle
            .selectAll("circle")
            .data(data, d => d.id)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("cx", d => d.coordinates[0])
                    .attr("cy", d => d.coordinates[1])
            )
            .attr("class", d => cssClass(d))
            .attr("r", d => r(d))
            .attr("fill", d => fill(d));
    }

    _updateTextsX(d, circleSize) {
        return this.zoomLevel === "pbZone" &&
            (this._showPBZones === "all" || (this._showPBZones === "single" && d.id === this.currentPort.id))
            ? d.coordinates[0] + Math.round(circleSize * 1.2 * Math.cos(degreesToRadians(d.angle)))
            : d.coordinates[0];
    }

    _updateTextsY(d, circleSize, fontSize) {
        const deltaY = circleSize + fontSize * 1.2;

        if (this.zoomLevel !== "pbZone") {
            return d.coordinates[1] + deltaY;
        }

        const dy = d.angle > 90 && d.angle < 270 ? fontSize : 0;
        return this._showPBZones === "all" || (this._showPBZones === "single" && d.id === this.currentPort.id)
            ? d.coordinates[1] + Math.round(circleSize * 1.2 * Math.sin(degreesToRadians(d.angle))) + dy
            : d.coordinates[1] + deltaY;
    }

    _updateTextsAnchor(d) {
        if (
            this.zoomLevel === "pbZone" &&
            (this._showPBZones === "all" || (this._showPBZones === "single" && d.id === this.currentPort.id))
        ) {
            return d.textAnchor;
        }

        return "middle";
    }

    updateTexts() {
        if (this.zoomLevel === "initial") {
            this._gText.classed("d-none", true);
        } else {
            const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
            const circleSize = roundToThousands(this._circleSize / circleScale);
            const fontScale = 2 ** Math.log2((Math.abs(this._minScale) + this._scale) * 0.9);
            const fontSize = roundToThousands(this._fontSize / fontScale);

            this._gText
                .selectAll("text")
                .data(this._portDataFiltered, d => d.id)
                .join(enter => enter.append("text").text(d => d.name))
                .attr("x", d => this._updateTextsX(d, circleSize))
                .attr("y", d => this._updateTextsY(d, circleSize, fontSize))
                .attr("text-anchor", d => this._updateTextsAnchor(d));

            this._gText.attr("font-size", `${fontSize}px`).classed("d-none", false);
        }
    }

    _updateSummary() {
        const numberPorts = Object.keys(this._portData).length;
        let taxTotal = 0;
        let netTotal = 0;

        if (numberPorts) {
            taxTotal = this._portData.map(d => d.taxIncome).reduce((a, b) => a + b);
            netTotal = this._portData.map(d => d.netIncome).reduce((a, b) => a + b);
        }

        this._portSummaryTextNumPorts.text(`${numberPorts}`);
        this._portSummaryTextTaxIncome.text(`${formatSiInt(taxTotal)}`);
        this._portSummaryTextNetIncome.text(`${formatSiInt(netTotal)}`);
    }

    _updateCounties() {
        if (this.zoomLevel === "portLabel") {
            const data = this._countyPolygonFiltered;

            this._gCounty
                .selectAll("text")
                .data(data, d => d.name)
                .join(
                    enter =>
                        enter
                            .append("text")
                            .attr("transform", d => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                            .text(d => d.name),
                    update =>
                        update.attr("fill", d => (this._showRadius === "county" ? this._colourScaleCounty(d.name) : ""))
                );

            /*
            const curve = d3CurveCatmullRomClosed;
            const line = d3Line().curve(curve);
            this._gCounty
                .selectAll("path")
                .data(data, d => d.name)
                .join(enter =>
                    enter
                        .append("path")
                        .attr("d", d => line(d.polygon))
                        .attr("fill", "#373")
                );
            */

            this._gCounty.classed("d-none", false);
        } else {
            this._gCounty.classed("d-none", true);
        }
    }

    _updateRegions() {
        if (this.zoomLevel === "initial") {
            const data = this._regionPolygonFiltered;

            this._gRegion
                .selectAll("text")
                .data(data, d => d.name)
                .join(enter =>
                    enter
                        .append("text")
                        .attr("transform", d => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                        .text(d => d.name)
                );

            /* Show polygon for test purposes
            const d3line2 = d3
                .line()
                .x(d => d[0])
                .y(d => d[1]);

            this._gRegion
                .selectAll("path")
                .data(data)
                .enter()
                .append("path")
                .attr("d", d => d3line2(d.polygon))
                .attr("fill", "#999");
                */
            this._gRegion.classed("d-none", false);
        } else {
            this._gRegion.classed("d-none", true);
        }
    }

    update(scale = null) {
        this._scale = scale || this._scale;

        this._filterVisible();
        this._updateIcons();
        this._updatePortCircles();
        this.updateTexts();
        this._updateSummary();
        this._updateCounties();
        this._updateRegions();
    }

    _filterVisible() {
        if (this._showRadius === "position") {
            this._portDataFiltered = this._portData;
        } else {
            this._portDataFiltered = this._portData.filter(
                port =>
                    port.coordinates[0] >= this._lowerBound[0] &&
                    port.coordinates[0] <= this._upperBound[0] &&
                    port.coordinates[1] >= this._lowerBound[1] &&
                    port.coordinates[1] <= this._upperBound[1]
            );
        }

        this._countyPolygonFiltered = this._countyPolygon.filter(
            county =>
                county.centroid[0] >= this._lowerBound[0] &&
                county.centroid[0] <= this._upperBound[0] &&
                county.centroid[1] >= this._lowerBound[1] &&
                county.centroid[1] <= this._upperBound[1]
        );

        this._regionPolygonFiltered = this._regionPolygon.filter(
            region =>
                region.centroid[0] >= this._lowerBound[0] &&
                region.centroid[0] <= this._upperBound[0] &&
                region.centroid[1] >= this._lowerBound[1] &&
                region.centroid[1] <= this._upperBound[1]
        );
    }

    /**
     * Set bounds of current viewport
     * @param {Bound} lowerBound - Top left coordinates of current viewport
     * @param {Bound} upperBound - Bottom right coordinates of current viewport
     * @return {void}
     */
    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    set portDataDefault(portDataDefault) {
        this._portDataDefault = portDataDefault;
    }

    get portDataDefault() {
        return this._portDataDefault;
    }

    set portData(portData) {
        this._portData = portData;
    }

    get portData() {
        return this._portData;
    }

    set currentPort(currentPort) {
        this._currentPort = currentPort;
    }

    get currentPort() {
        return this._currentPort;
    }

    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    get zoomLevel() {
        return this._zoomLevel;
    }

    _showSummary() {
        this._divPortSummary.classed("hidden", false);
    }

    setShowRadiusSetting(showRadius = this._radioButtonValues[0]) {
        this._showRadius = showRadius;
        this._radios.set(this._showRadius);
        this._cookie.set(this._showRadius);
    }

    transform(transform) {
        this._gPort.attr("transform", transform);
    }

    clearMap(scale) {
        this._showSummary();
        this._portData = this._portDataDefault;
        this.showCurrentGood = false;
        this.showTradePortPartners = false;
        this.setShowRadiusSetting();
        this.update(scale);
    }
}
