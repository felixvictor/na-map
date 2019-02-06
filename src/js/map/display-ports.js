/**
 * This file is part of na-map.
 *
 * @file      Display ports.
 * @module    map/display-ports
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { min as d3Min, max as d3Max } from "d3-array";
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/tooltip";

import moment from "moment";
import "moment/locale/en-gb";

import {
    colourRed,
    colourRedDark,
    defaultCircleSize,
    defaultFontSize,
    greenZoneRadius,
    nations,
    primary300
} from "../common";
import {
    degreesToRadians,
    displayClan,
    formatInt,
    formatPercent,
    formatSiCurrency,
    formatSiInt,
    getOrdinal,
    roundToThousands
} from "../util";
import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";
import TrilateratePosition from "../map-tools/get-position";

export default class DisplayPorts {
    constructor(portData, map) {
        this._portDataDefault = portData;
        this._portData = portData;
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
        this._taxIncomeRadius = d3ScaleLinear();
        this._netIncomeRadius = d3ScaleLinear();
        this._attackRadius = d3ScaleLinear().domain([0, 1]);
        this._colourScale = d3ScaleLinear()
            .domain([0, 0.5, 1])
            .range([primary300, colourRed, colourRedDark])
            .interpolate(d3InterpolateHcl);

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
        this._radioButtonValues = ["attack", "position", "tax", "net", "green", "off"];

        /**
         * Show radius cookie
         * @type {Cookie}
         */
        this._cookie = new Cookie(this._baseId, this._radioButtonValues);

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

        this._setupListener();
        this._setupSvg();
        this._setupCounties();
        this._setupRegions();
        this._setupSummary();
        this._setupFlags();

        this._trilateratePosition = new TrilateratePosition(this);
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
            .classed("ports", true);
        this._gRegion = this._gPort.append("g").classed("region", true);
        this._gCounty = this._gPort.append("g").classed("county", true);
        this._gPortCircle = this._gPort.append("g").classed("port-circles", true);
        this._gIcon = this._gPort.append("g").classed("port", true);
        this._gText = this._gPort.append("g").classed("port-names", true);
    }

    _setupCounties() {
        /*
        ** Automatic calculation of text position
        // https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
        const counties = this._portDataDefault.filter(port => port.county !== "").reduce(
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
                // polygon: d3.polygonHull(value),
                centroid: d3.polygonCentroid(d3.polygonHull(value))
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
            .attr("class", "port-summary");

        // Number of selected ports
        this._portSummaryNumPorts = this._divPortSummary.append("div").classed("block", true);
        this._portSummaryTextNumPorts = this._portSummaryNumPorts.append("div");
        this._portSummaryNumPorts
            .append("div")
            .classed("des", true)
            .html("selected<br>ports");

        // Total tax income
        this._portSummaryTaxIncome = this._divPortSummary.append("div").classed("block", true);
        this._portSummaryTextTaxIncome = this._portSummaryTaxIncome.append("div");
        this._portSummaryTaxIncome
            .append("div")
            .classed("des", true)
            .html("tax<br>income");

        // Total net income
        this._portSummaryNetIncome = this._divPortSummary.append("div").classed("block", true);
        this._portSummaryTextNetIncome = this._portSummaryNetIncome.append("div");
        this._portSummaryNetIncome
            .append("div")
            .classed("des", true)
            .html("net<br>income");
    }

    _setupFlags() {
        /**
         * @link https://stackoverflow.com/questions/42118296/dynamically-import-images-from-a-directory-using-webpack
         * @param {object} r - webpack require.context
         * @return {object} Images
         */
        const importAll = r => {
            const images = {};
            r.keys().forEach(item => {
                images[item.replace("./", "").replace(".svg", "")] = r(item);
            });
            return images;
        };

        this._nationIcons = importAll(require.context("../../icons", false, /\.svg$/));
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

                if (nation !== "NT" && nation !== "FT") {
                    const patternA = svgDef
                        .append("pattern")
                        .attr("id", `${nation}a`)
                        .attr("width", "133%")
                        .attr("height", "100%")
                        .attr("viewBox", `6 6 ${this._iconSize} ${this._iconSize * 0.75}`);
                    patternA
                        .append("image")
                        .attr("height", this._iconSize)
                        .attr("width", this._iconSize)
                        .attr("href", this._nationIcons[`${nation}a`].replace('"', "").replace('"', ""));
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
        const port = {
            name: portProperties.name,
            icon: portProperties.nation,
            availableForAll: portProperties.availableForAll ? "(accessible to all nations)" : "",
            depth: portProperties.shallow ? "Shallow" : "Deep",
            county:
                (portProperties.county !== "" ? `${portProperties.county}\u200a/\u200a` : "") + portProperties.region,
            countyCapital: portProperties.countyCapital ? " (county capital)" : "",
            nonCapturable: portProperties.nonCapturable,
            captured: portProperties.capturer
                ? ` captured by ${displayClan(portProperties.capturer)} ${moment
                      .utc(portProperties.lastPortBattle)
                      .fromNow()}`
                : "",
            lastPortBattle: portProperties.lastPortBattle,
            // eslint-disable-next-line no-nested-ternary
            attack: portProperties.attackHostility
                ? `${displayClan(portProperties.attackerClan)} (${portProperties.attackerNation}) attack${
                      // eslint-disable-next-line no-nested-ternary
                      portProperties.portBattle.length
                          ? `${
                                portBattleST.isAfter(moment.utc()) ? "s" : "ed"
                            } ${portBattleST.fromNow()} at ${portBattleST.format("H.mm")}${
                                portBattleST !== portBattleLT ? ` (${portBattleLT.format("H.mm")} local)` : ""
                            }`
                          : `s: ${formatPercent(portProperties.attackHostility)} hostility`
                  }`
                : "",
            // eslint-disable-next-line no-nested-ternary
            pbTimeRange: portProperties.nonCapturable
                ? ""
                : !portProperties.portBattleStartTime
                ? "11.00\u202f–\u202f8.00"
                : `${(portProperties.portBattleStartTime + 10) %
                      24}.00\u202f–\u202f${(portProperties.portBattleStartTime + 13) % 24}.00`,
            brLimit: formatInt(portProperties.brLimit),
            conquestMarksPension: portProperties.conquestMarksPension,
            taxIncome: formatSiInt(portProperties.taxIncome),
            portTax: formatPercent(portProperties.portTax),
            netIncome: formatSiInt(portProperties.netIncome),
            tradingCompany: portProperties.tradingCompany
                ? `, trading company level\u202f${portProperties.tradingCompany}`
                : "",
            laborHoursDiscount: portProperties.laborHoursDiscount
                ? `, labor hours discount level\u202f${portProperties.laborHoursDiscount}`
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

    _showDetails(d, i, nodes) {
        const tooltipData = port => {
            let h = '<div class="d-flex align-items-baseline mb-1">';
            h += `<img alt="${port.icon}" class="flag-icon align-self-stretch" src="${this._nationIcons[port.icon]
                .replace('"', "")
                .replace('"', "")}"/>`;
            h += `<div class="port-name">${port.name}</div>`;
            h += `<div class="">\u2000${port.county} ${port.availableForAll}</div>`;
            h += "</div>";
            if (port.attack.length) {
                h += `<div class="alert alert-danger mt-2" role="alert">${port.attack}</div>`;
            }
            h += `<p>${port.depth} water port ${port.countyCapital}${port.captured}<br>`;
            if (!port.nonCapturable) {
                h += `Port battle ${port.pbTimeRange}, ${port.brLimit} <span class="caps">BR</span>, `;
                h += `${port.pbType}\u202frate <span class="caps">AI</span>, `;
                h += `${port.conquestMarksPension}\u202fconquest point`;
                h += port.conquestMarksPension > 1 ? "s" : "";
                h += `<br>Tax income ${port.taxIncome} (${port.portTax}), net income ${port.netIncome}`;
                h += port.tradingCompany;
                h += port.laborHoursDiscount;
            } else {
                h += "Not capturable";
                h += `<br>${port.portTax} tax`;
            }
            h += "</p>";
            h += "<table class='table table-sm'>";
            if (port.producesNonTrading.length) {
                h += "<tr><td class='pl-0'>Produces\u00a0</td><td>";
                h += `<span class="non-trading">${port.producesNonTrading}</span>`;
                h += "</td></tr>";
            }
            if (port.dropsTrading.length || port.dropsNonTrading.length) {
                h += `<tr><td class='pl-0'>Drops\u00a0${port.dropsNonTrading.length ? "\u00a0" : ""}</td><td>`;
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
                h += "<tr><td class='pl-0'>Consumes\u00a0</td><td>";
                h += port.consumesTrading;
                h += "</td></tr>";
            }
            if (this.showTradePortPartners) {
                if (port.goodsToSellInTradePort.length) {
                    h += `<tr><td class='pl-0'>Sell in ${port.tradePort}\u00a0</td><td>${
                        port.goodsToSellInTradePort
                    }</td></tr>`;
                }
                if (port.goodsToBuyInTradePort.length) {
                    h += `<tr><td class='pl-0'>Buy in ${port.tradePort}\u00a0</td><td>${
                        port.goodsToBuyInTradePort
                    }</td></tr>`;
                }
            }
            h += "</table>";

            return h;
        };

        const getInventory = port => {
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
        };

        $(d3Select(nodes[i]).node())
            .tooltip({
                html: true,
                placement: "auto",
                title: tooltipData(this._getText(d.id, d)),
                trigger: "manual"
            })
            .tooltip("show");

        if (this._map.showTrades.show) {
            if (this._map.showTrades.listType !== "inventory") {
                this._map.showTrades.listType = "inventory";
            }
            this._map.showTrades.update(getInventory(d));
        }
    }

    _updateIcons() {
        const hideDetails = (d, i, nodes) => {
            $(d3Select(nodes[i]).node()).tooltip("dispose");
        };
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const circleSize = roundToThousands(this._circleSize / circleScale);
        const data = this._portDataFiltered;

        this._gIcon
            .selectAll("circle")
            .data(data, d => d.id)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("fill", d => `url(#${d.nation}${d.availableForAll && d.nation !== "NT" ? "a" : ""})`)
                    .attr("cx", d => d.coordinates[0])
                    .attr("cy", d => d.coordinates[1])
                    .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
                    .on("mouseleave", hideDetails)
            )
            .attr("r", circleSize);
    }

    _updatePortCircles() {
        const getTradePortMarker = port => {
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
        };
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const rMin = roundToThousands((this._circleSize / circleScale) * this._minRadiusFactor);
        const rMax = roundToThousands((this._circleSize / circleScale) * this._maxRadiusFactor);
        let data = this._portDataFiltered;
        let cssClass = d => d;
        let r = d => d;
        let fill = d => d;
        let hasFill = false;

        if (this._showRadius === "tax") {
            data = this._portDataFiltered.filter(d => !d.nonCapturable);

            const minTaxIncome = d3Min(data, d => d.taxIncome);
            const maxTaxIncome = d3Max(data, d => d.taxIncome);
            this._taxIncomeRadius.domain([minTaxIncome, maxTaxIncome]);
            this._taxIncomeRadius.range([rMin, rMax]);

            cssClass = () => "bubble pos";
            r = d => this._taxIncomeRadius(Math.abs(d.taxIncome));
        } else if (this._showRadius === "net") {
            data = this._portDataFiltered.filter(d => !d.nonCapturable);

            const minNetIncome = d3Min(data, d => d.netIncome);
            const maxNetIncome = d3Max(data, d => d.netIncome);
            this._netIncomeRadius.domain([minNetIncome, maxNetIncome]).range([rMin, rMax]);

            cssClass = d => `bubble ${d.netIncome < 0 ? "neg" : "pos"}`;
            r = d => this._netIncomeRadius(Math.abs(d.netIncome));
        } else if (this.showTradePortPartners) {
            cssClass = d => `bubble ${getTradePortMarker(d)}`;
            r = d => (d.id === this.tradePortId ? rMax : rMax / 2);
        } else if (this._showRadius === "position") {
            cssClass = () => "position-circle";
            r = d => d.distance;
        } else if (this._showRadius === "attack") {
            data = this._portDataFiltered.filter(port => port.attackHostility);
            this._attackRadius.range([rMin, rMax]);

            cssClass = () => "bubble";
            fill = d => this._colourScale(d.attackHostility);
            hasFill = true;
            r = d => this._attackRadius(d.attackHostility);
        } else if (this._showRadius === "green") {
            data = this._portDataFiltered.filter(port => port.nonCapturable && port.nation !== "FT");

            cssClass = () => "bubble pos";
            r = () => greenZoneRadius;
        } else if (this.showCurrentGood) {
            cssClass = d => `bubble ${d.isSource ? "pos" : "neg"}`;
            r = () => rMax / 2;
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
            .attr("fill", d => (hasFill ? fill(d) : ""));
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
            const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
                circleSize = roundToThousands(this._circleSize / circleScale),
                fontScale = 2 ** Math.log2((Math.abs(this._minScale) + this._scale) * 0.9),
                fontSize = roundToThousands(this._fontSize / fontScale);

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
        let taxTotal = 0,
            netTotal = 0;

        if (numberPorts) {
            taxTotal = this._portData.map(d => d.taxIncome).reduce((a, b) => a + b);
            netTotal = this._portData.map(d => d.netIncome).reduce((a, b) => a + b);
        }

        this._portSummaryTextNumPorts.text(`${numberPorts}`);
        this._portSummaryTextTaxIncome.text(`${formatSiInt(taxTotal)}`);
        this._portSummaryTextNetIncome.text(`${formatSiInt(netTotal)}`);
    }

    _updateCounties() {
        if (this.zoomLevel !== "portLabel") {
            this._gCounty.classed("d-none", true);
        } else {
            const data = this._countyPolygonFiltered;

            this._gCounty
                .selectAll("text")
                .data(data)
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

            this._gCounty
                .selectAll("path")
                .data(data)
                .enter()
                .append("path")
                .attr("d", d => d3line2(d.polygon))
                .attr("fill", "#373");
                */

            this._gCounty.classed("d-none", false);
        }
    }

    _updateRegions() {
        if (this.zoomLevel !== "initial") {
            this._gRegion.classed("d-none", true);
        } else {
            const data = this._regionPolygonFiltered;

            this._gRegion
                .selectAll("text")
                .data(data)
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
        if (this._showRadius !== "position") {
            this._portDataFiltered = this._portData.filter(
                port =>
                    port.coordinates[0] >= this._lowerBound[0] &&
                    port.coordinates[0] <= this._upperBound[0] &&
                    port.coordinates[1] >= this._lowerBound[1] &&
                    port.coordinates[1] <= this._upperBound[1]
            );
        } else {
            this._portDataFiltered = this._portData;
        }
        const lb = [
            this._lowerBound[0] !== 0 ? this._lowerBound[0] / 1.5 : 0,
            this._lowerBound[1] !== 0 ? this._lowerBound[1] / 1.5 : 0
        ];
        const ub = [this._upperBound[0] * 1.5, this._upperBound[1] * 1.5];
        this._countyPolygonFiltered = this._countyPolygon.filter(
            county =>
                county.centroid[0] >= lb[0] &&
                county.centroid[0] <= ub[0] &&
                county.centroid[1] >= lb[1] &&
                county.centroid[1] <= ub[1]
        );
        this._regionPolygonFiltered = this._regionPolygon.filter(
            region =>
                region.centroid[0] >= lb[0] &&
                region.centroid[0] <= ub[0] &&
                region.centroid[1] >= lb[1] &&
                region.centroid[1] <= ub[1]
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
        if (this._showRadius === "position") {
            [this._showRadius] = this._radioButtonValues;
            this._radios.set(this._showRadius);
            this._cookie.set(this._showRadius);
        }

        this._trilateratePosition.clearMap();
        this._showSummary();
        this._portData = this._portDataDefault;
        this.showCurrentGood = false;
        this.showTradePortPartners = false;
        this.setShowRadiusSetting();
        this.update(scale);
    }
}
