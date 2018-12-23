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
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";
import Cookies from "js-cookie";
import moment from "moment";
import "moment/locale/en-gb";

import {
    circleRadiusFactor,
    nations,
    defaultFontSize,
    defaultCircleSize,
    getDistance,
    convertCoordX,
    convertCoordY
} from "../common";
import { formatInt, formatSiInt, formatPercent, getOrdinal, roundToThousands, degreesToRadians } from "../util";
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

        this._zoomLevel = "initial";
        this._showPBZones = "all";
        this._tooltipDuration = 200;
        this._iconSize = 48;
        this._fontSize = defaultFontSize;
        this._circleSize = defaultCircleSize;
        this._showRadius = "attack";
        this._taxIncomeRadius = d3ScaleLinear();
        this._netIncomeRadius = d3ScaleLinear();
        this._attackRadius = d3ScaleLinear().domain([0, 1]);
        this._colourScale = d3ScaleLinear()
            .domain([0, 0.1, 0.5, 1])
            .range(["#eaeded", "#8b989c", "#6b7478", "#a62e39"]);

        this._minRadiusFactor = 1;
        this._maxRadiusFactor = 6;

        /**
         * showRadius cookie name
         * @type {string}
         * @private
         */
        this._showRadiusCookieName = "na-map--show-radius";

        /**
         * Default showRadius setting
         * @type {string}
         * @private
         */
        this._showRadiusDefault = "attack";

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
        // Use default value if cookie is not stored
        const r = Cookies.get(this._showRadiusCookieName) || this._showRadiusDefault;
        $(`#show-radius-${r}`).prop("checked", true);
        return r;
    }

    /**
     * Store show setting in cookie
     * @return {void}
     * @private
     */
    _storeShowRadiusSetting() {
        if (this._showRadius !== this._showRadiusDefault) {
            Cookies.set(this._showRadiusCookieName, this._showRadius);
        } else {
            Cookies.remove(this._showRadiusCookieName);
        }
    }

    _showRadiusSelected() {
        this._showRadius = document.querySelector("input[name='showRadius']:checked").value;
        this._storeShowRadiusSetting();
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
        const counties = this._portDataDefault.filter(port => port.properties.county !== "").reduce(
            (r, a) =>
                Object.assign(r, {
                    [a.properties.county]: (r[a.properties.county] || []).concat([a.geometry.coordinates])
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
        const regions = this._portDataDefault.filter(port => port.properties.region !== "").reduce(
            (r, a) =>
                Object.assign(r, {
                    [a.properties.region]: (r[a.properties.region] || []).concat([a.geometry.coordinates])
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
            { name: "West Cuba", centroid: [3300, 3100], angle: 20 },
            { name: "Yucatan", centroid: [1462, 3550], angle: 0 }
        ];
    }

    _setupSummary() {
        // Main box
        this._divPortSummary = d3Select("main")
            .append("div")
            .attr("id", "port-summary")
            .attr("class", "port-summary overlay");

        const mainDiv = this._divPortSummary
            .append("div")
            .attr("class", "d-flex justify-content-around align-items-end");

        // Number of selected ports
        this._portSummaryNumPorts = mainDiv.append("div").classed("block", true);
        this._portSummaryTextNumPorts = this._portSummaryNumPorts.append("div");
        this._portSummaryNumPorts
            .append("div")
            .classed("des", true)
            .html("selected<br>ports");

        // Total tax income
        this._portSummaryTaxIncome = mainDiv.append("div").classed("block", true);
        this._portSummaryTextTaxIncome = this._portSummaryTaxIncome.append("div");
        this._portSummaryTaxIncome
            .append("div")
            .classed("des", true)
            .html("tax<br>income");

        // Total net income
        this._portSummaryNetIncome = mainDiv.append("div").classed("block", true);
        this._portSummaryTextNetIncome = this._portSummaryNetIncome.append("div");
        this._portSummaryNetIncome
            .append("div")
            .classed("des", true)
            .html("net<br>income");
    }

    _setupFlags() {
        const svgDef = d3Select("#na-svg defs");

        // create filter with id #drop-shadow
        const filter = svgDef
            .append("filter")
            .attr("id", "drop-shadow")
            .attr("width", "200%")
            .attr("height", "200%");

        filter
            .append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 5)
            .attr("result", "blur");

        filter
            .append("feOffset")
            .attr("dx", 2)
            .attr("dy", 4)
            .attr("result", "offsetblur1");

        filter
            .append("feOffset")
            .attr("dx", 3)
            .attr("dy", 6)
            .attr("result", "offsetblur2")
            .attr("in", "blur");

        const feComponentOne = filter
            .append("feComponentTransfer")
            .attr("result", "shadow1")
            .attr("in", "offsetblur1");

        feComponentOne
            .append("feFuncA")
            .attr("type", "linear")
            .attr("slope", "0.1");

        const feComponentTwo = filter
            .append("feComponentTransfer")
            .attr("result", "shadow2")
            .attr("in", "offsetblur2");

        feComponentTwo
            .append("feFuncA")
            .attr("type", "linear")
            .attr("slope", "0.1");

        filter
            .append("feComposite")
            .attr("in2", "offsetblur1")
            .attr("operator", "in");

        const feMerge = filter.append("feMerge");

        feMerge.append("feMergeNode").attr("in", "shadow1");
        feMerge.append("feMergeNode").attr("in", "shadow2");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        this._clipPath = svgDef
            .append("clipPath")
            .attr("id", "clipObj")
            .append("circle");
    }

    _getPortName(id) {
        return id ? this._portDataDefault.find(port => port.id === id).properties.name : "";
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
                ? ` captured by ${portProperties.capturer} ${moment.utc(portProperties.lastPortBattle).fromNow()}`
                : "",
            lastPortBattle: portProperties.lastPortBattle,
            // eslint-disable-next-line no-nested-ternary
            attack: portProperties.attackHostility
                ? `${portProperties.attackerClan} (${portProperties.attackerNation}) attack${
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
            dropsTrading: portProperties.dropsTrading
                ? portProperties.dropsTrading
                      .map(good => good.name)
                      .sort()
                      .join(", ")
                : "",
            consumesTrading: portProperties.consumesTrading
                ? portProperties.consumesTrading
                      .map(good => good.name)
                      .sort()
                      .join(", ")
                : "",
            producesNonTrading: portProperties.producesNonTrading
                ? portProperties.producesNonTrading
                      .map(good => good.name)
                      .sort()
                      .join(", ")
                : "",
            dropsNonTrading: portProperties.dropsNonTrading
                ? portProperties.dropsNonTrading
                      .map(good => good.name)
                      .sort()
                      .join(", ")
                : "",
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
            let h = '<div class="d-flex align-items-baseline">';
            h += `<i class="flag-icon align-self-stretch ${port.icon}"></i>`;
            h += `<div class="port-name">${port.name}</div>`;
            h += `<div class="">\u2000${port.county} ${port.availableForAll}</div>`;
            h += "</div>";
            if (port.attack.length) {
                h += `<div class="alert alert-danger mt-2" role="alert">${port.attack}</div>`;
            }
            h += `<p>${port.depth} water port ${port.countyCapital}${port.captured}<br>`;
            if (!port.nonCapturable) {
                h += `Port battle ${port.pbTimeRange}, ${port.brLimit} BR, `;
                h += `${port.pbType}\u202frate AI, `;
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
                h += "<tr><td>Produces\u00a0</td><td>";
                h += `<span class="non-trading">${port.producesNonTrading}</span>`;
                h += "</td></tr>";
            }
            if (port.dropsTrading.length || port.dropsNonTrading.length) {
                h += `<tr><td>Drops\u00a0${port.dropsNonTrading.length ? "\u00a0" : ""}</td><td>`;
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
                h += "<tr><td>Consumes\u00a0</td><td>";
                h += port.consumesTrading;
                h += "</td></tr>";
            }
            if (this.showTradePortPartners) {
                if (port.goodsToSellInTradePort.length) {
                    h += `<tr><td>Sell in ${port.tradePort}</td><td>${port.goodsToSellInTradePort}</td></tr>`;
                }
                if (port.goodsToBuyInTradePort.length) {
                    h += `<tr><td>Buy in ${port.tradePort}</td><td>${port.goodsToBuyInTradePort}</td></tr>`;
                }
            }
            h += "</table>";

            return h;
        };

        const port = d3Select(nodes[i]),
            title = tooltipData(this._getText(d.id, d.properties));
        // eslint-disable-next-line no-underscore-dangle
        $(port.node())
            .tooltip({
                delay: {
                    show: this._tooltipDuration,
                    hide: this._tooltipDuration
                },
                html: true,
                placement: "auto",
                title,
                trigger: "manual"
            })
            .tooltip("show");
    }

    _updateIcons() {
        const hideDetails = (d, i, nodes) => {
            $(d3Select(nodes[i]).node()).tooltip("dispose");
        };
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale);
        const circleSize = Math.round(this._circleSize / circleScale) * 3;
        const data = this._portData;
        this._clipPath
            .attr("cx", circleSize / 2)
            .attr("cy", circleSize / 2)
            .attr("r", circleSize / 3);

        // Data join
        const circleUpdate = this._gIcon.selectAll("image").data(data, d => d.id);

        // Remove old circles
        circleUpdate.exit().remove();

        // Update kept circles
        // circleUpdate; // not needed

        // Add new circles
        const circleEnter = circleUpdate
            .enter()
            .append("image")
            .attr("xlink:href", d => `icons/${d.properties.nation}${d.properties.availableForAll ? "a" : ""}.svg`)
            .attr("clip-path", "url(#clipObj)")
            .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
            .on("mouseout", hideDetails);

        // Apply to both old and new
        circleUpdate
            .merge(circleEnter)
            .attr("width", circleSize)
            .attr("height", circleSize)
            .attr(
                "transform",
                d =>
                    `translate(${d.geometry.coordinates[0] - circleSize / 2},${d.geometry.coordinates[1] -
                        circleSize / 2})`
            );
    }

    _updatePortCircles() {
        const getTradePortMarker = port => {
            let marker = "";
            if (port.id === this.tradePortId) {
                marker = "here";
            } else if (port.properties.sellInTradePort && port.properties.buyInTradePort) {
                marker = "both";
            } else if (port.properties.sellInTradePort) {
                marker = "pos";
            } else if (port.properties.buyInTradePort) {
                marker = "neg";
            }
            return marker;
        };
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
            rMin = roundToThousands((this._circleSize / circleScale) * this._minRadiusFactor);
        let rMax = roundToThousands((this._circleSize / circleScale) * this._maxRadiusFactor),
            data = {},
            rGreenZone = 0;

        if (this._showRadius === "tax" || this._showRadius === "net") {
            data = this._portData.filter(d => !d.properties.nonCapturable);
        } else if (this.showTradePortPartners) {
            data = this._portData;
        } else if (this._showRadius === "position") {
            data = this._portData;
        } else if (this._showRadius === "attack") {
            data = this._portData.filter(port => port.properties.attackHostility);
        } else if (this._showRadius === "green") {
            rGreenZone =
                roundToThousands(
                    getDistance(
                        { x: convertCoordX(-63400, 18800), y: convertCoordY(-63400, 18800) },
                        { x: convertCoordX(-79696, 10642), y: convertCoordY(-79696, 10642) }
                    )
                ) * circleRadiusFactor;
            data = this._portData.filter(port => port.properties.nonCapturable && port.properties.nation !== "FT");
        } else if (this.showCurrentGood) {
            data = this._portData;
            rMax /= 2;
        }

        // Data join
        const circleUpdate = this._gPortCircle.selectAll("circle").data(data, d => d.id);

        // Remove old circles
        circleUpdate.exit().remove();

        // Update kept circles
        // circleUpdate; // not needed

        // Add new circles
        const circleEnter = circleUpdate
            .enter()
            .append("circle")
            .attr("cx", d => d.geometry.coordinates[0])
            .attr("cy", d => d.geometry.coordinates[1]);

        // Apply to both old and new
        const circleMerge = circleUpdate.merge(circleEnter);
        if (this._showRadius === "tax") {
            const minTaxIncome = d3Min(data, d => d.properties.taxIncome),
                maxTaxIncome = d3Max(data, d => d.properties.taxIncome);

            this._taxIncomeRadius.domain([minTaxIncome, maxTaxIncome]);
            this._taxIncomeRadius.range([rMin, rMax]);
            circleMerge
                .attr("class", "bubble pos")
                .attr("r", d => this._taxIncomeRadius(Math.abs(d.properties.taxIncome)));
        } else if (this._showRadius === "net") {
            const minNetIncome = d3Min(data, d => d.properties.netIncome),
                maxNetIncome = d3Max(data, d => d.properties.netIncome);

            this._netIncomeRadius.domain([minNetIncome, maxNetIncome]).range([rMin, rMax]);
            circleMerge
                .attr("class", d => `bubble ${d.properties.netIncome < 0 ? "neg" : "pos"}`)
                .attr("r", d => this._netIncomeRadius(Math.abs(d.properties.netIncome)));
        } else if (this.showTradePortPartners) {
            circleMerge
                .attr("class", d => `bubble ${getTradePortMarker(d)}`)
                .attr("r", d => (d.id === this.tradePortId ? rMax : rMax / 2));
        } else if (this._showRadius === "attack") {
            this._attackRadius.range([rMin, rMax]);
            circleMerge
                .attr("class", "bubble")
                .attr("fill", d => this._colourScale(d.properties.attackHostility))
                .attr("r", d => this._attackRadius(d.properties.attackHostility));
        } else if (this._showRadius === "position") {
            circleMerge.attr("class", "position").attr("r", d => d.properties.distance);
        } else if (this._showRadius === "green") {
            circleMerge.attr("class", "bubble pos").attr("r", rGreenZone);
        } else if (this.showCurrentGood) {
            circleMerge.attr("class", d => `bubble ${d.properties.isSource ? "pos" : "neg"}`).attr("r", rMax);
        }
    }

    _updateTextsX(d, circleSize) {
        return (
            d.geometry.coordinates[0] + Math.round(circleSize * 1.2 * Math.cos(degreesToRadians(d.properties.angle)))
        );
    }

    _updateTextsY(d, circleSize, fontSize) {
        const dy = d.properties.angle > 90 && d.properties.angle < 270 ? fontSize : 0;
        return (
            d.geometry.coordinates[1] +
            Math.round(circleSize * 1.2 * Math.sin(degreesToRadians(d.properties.angle))) +
            dy
        );
    }

    updateTexts() {
        if (this._zoomLevel === "initial") {
            this._gText.classed("d-none", true);
        } else {
            const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
                circleSize = roundToThousands(this._circleSize / circleScale),
                fontScale = 2 ** Math.log2((Math.abs(this._minScale) + this._scale) * 0.9),
                fontSize = roundToThousands(this._fontSize / fontScale);

            this._gText.attr("font-size", `${fontSize}px`);

            // Data join
            const textUpdate = this._gText.selectAll("text").data(this._portData, d => d.id);

            // Remove old text
            textUpdate.exit().remove();

            // Update kept texts
            // textUpdate; // not needed

            // Add new texts
            const textEnter = textUpdate
                .enter()
                .append("text")
                .text(d => d.properties.name);

            // Apply to both old and new
            textUpdate
                .merge(textEnter)
                .attr("x", d => this._updateTextsX(d, circleSize))
                .attr("y", d => this._updateTextsY(d, circleSize, fontSize))
                .attr("text-anchor", d => d.properties.textAnchor);
            this._gText.classed("d-none", false);
        }
    }

    _updateSummary() {
        const numberPorts = Object.keys(this._portData).length;
        let taxTotal = 0,
            netTotal = 0;

        if (numberPorts) {
            taxTotal = this._portData.map(d => d.properties.taxIncome).reduce((a, b) => a + b);
            netTotal = this._portData.map(d => d.properties.netIncome).reduce((a, b) => a + b);
        }

        this._portSummaryTextNumPorts.text(`${numberPorts}`);
        this._portSummaryTextTaxIncome.text(`${formatSiInt(taxTotal)}`);
        this._portSummaryTextNetIncome.text(`${formatSiInt(netTotal)}`);
    }

    _updateCounties() {
        if (this._zoomLevel !== "portLabel") {
            this._gCounty.classed("d-none", true);
        } else {
            const data = this._countyPolygon;

            // Data join
            const countyUpdate = this._gCounty.selectAll("text").data(data);

            // Remove old
            countyUpdate.exit().remove();

            // Update kept texts
            // countyUpdate; // not needed

            // Add new texts
            countyUpdate
                .enter()
                .append("text")
                .attr("transform", d => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                .text(d => d.name);

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
        if (this._zoomLevel !== "initial") {
            this._gRegion.classed("d-none", true);
        } else {
            const data = this._regionPolygon;

            // Data join
            const regionUpdate = this._gRegion.selectAll("text").data(data);

            // Remove old
            regionUpdate.exit().remove();

            // Update kept texts
            // regionUpdate; // not needed

            // Add new texts
            regionUpdate
                .enter()
                .append("text")
                .attr("transform", d => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                .text(d => d.name);

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
        this._updateIcons();
        this._updatePortCircles();
        this.updateTexts();
        this._updateSummary();
        this._updateCounties();
        this._updateRegions();
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

    set pbData(pbData) {
        this._pbData = pbData;
    }

    get pbData() {
        return this._pbData;
    }

    set showRadiusSetting(showRadius) {
        this._showRadius = showRadius;
        document.getElementById(`show-radius-${showRadius}`).checked = true;
        this._storeShowRadiusSetting();
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

    hideSummary() {
        this._divPortSummary.classed("hidden", true);
    }

    transform(transform) {
        this._gPort.attr("transform", transform);
    }

    clearMap(scale) {
        if (this._showRadius === "position") {
            this._showRadius = "off";
        }
        this._trilateratePosition.clearMap();
        this._showSummary();
        this._portData = this._portDataDefault;
        this.showCurrentGood = false;
        this.showTradePortPartners = false;
        this.update(scale);
    }
}
