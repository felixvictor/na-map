/*
    port.js
*/

/* global d3 : false
 */

import Cookies from "js-cookie";
import moment from "moment";
import "moment/locale/en-gb";

import { nations, defaultFontSize, defaultCircleSize, getDistance, convertCoordX, convertCoordY } from "./common";
import { formatInt, formatSiInt, formatPercent, roundToThousands, degreesToRadians } from "./util";

export default class PortDisplay {
    constructor(portData, pbData, serverName, topMargin, rightMargin, minScale) {
        this._portDataDefault = portData;
        this._serverName = serverName;
        this._topMargin = topMargin;
        this._rightMargin = rightMargin;
        this._minScale = minScale;
        this._scale = minScale;

        this._showCurrentGood = false;
        this._portData = portData;
        this._pbData = pbData;

        // Shroud Cay
        this._currentPort = { id: "366", coord: { x: 4396, y: 2494 } };

        this._zoomLevel = "initial";
        this._showPBZones = "all";
        this._highlightId = null;
        this._highlightDuration = 200;
        this._iconSize = 48;
        this._fontSize = defaultFontSize;
        this._circleSize = defaultCircleSize;
        this._showRadius = "attack";
        this._taxIncomeRadius = d3.scaleLinear();
        this._netIncomeRadius = d3.scaleLinear();
        this._attackRadius = d3.scaleLinear().domain([0, 1]);
        this._colourScale = d3
            .scaleLinear()
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
    }

    _setupListener() {
        $("#show-radius").change(() => this._showRadiusSelected());
    }

    /**
     * Get show setting from cookie or use default value
     * @returns {string} - Show setting
     * @private
     */
    _getShowRadiusSetting() {
        let r = Cookies.get(this._showRadiusCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : this._showRadiusDefault;
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
        this._showRadius = $("input[name='showRadius']:checked").val();
        this._storeShowRadiusSetting();
        this.update();
    }

    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("ports", true);
        this._gPortCircle = this._g.append("g");
        this._gIcon = this._g.append("g").classed("port", true);
        this._gText = this._g.append("g");
        this._gCounty = this._g.append("g").classed("county", true);
        this._gRegion = this._g.append("g").classed("region", true);
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
        const svgPortSummary = d3
            .select("body")
            .append("svg")
            .attr("id", "summary")
            .classed("summary", true)
            .style("position", "absolute")
            .style("top", `${this._topMargin}px`)
            .style("right", `${this._rightMargin}px`);

        // Background
        const portSummaryRect = svgPortSummary
            .insert("rect")
            .attr("x", 0)
            .attr("y", 0);

        // Number of selected ports
        this._portSummaryTextNumPorts = svgPortSummary.append("text");
        const portSummaryTextNumPortsDes = svgPortSummary
            .append("text")
            .classed("des", true)
            .text("selected ports");

        // Total tax income
        this._portSummaryTextTaxIncome = svgPortSummary.append("text");
        const portSummaryTextTaxIncomeDes = svgPortSummary
            .append("text")
            .classed("des", true)
            .text("tax income");

        // Total net income
        this._portSummaryTextNetIncome = svgPortSummary.append("text");
        const portSummaryTextNetIncomeDes = svgPortSummary
            .append("text")
            .classed("des", true)
            .text("net income");

        const bboxNumPortsDes = portSummaryTextNumPortsDes.node().getBoundingClientRect(),
            bboxTaxIncomeDes = portSummaryTextTaxIncomeDes.node().getBoundingClientRect(),
            bboxNetIncomeDes = portSummaryTextNetIncomeDes.node().getBoundingClientRect(),
            lineHeight = parseInt(
                window.getComputedStyle(document.getElementById("na-svg")).getPropertyValue("line-height"),
                10
            );
        const height = lineHeight * 3,
            width = bboxNumPortsDes.width + bboxTaxIncomeDes.width * 3 + bboxNetIncomeDes.width,
            firstLine = "35%",
            secondLine = "60%",
            firstBlock = Math.round(width / 10),
            secondBlock = Math.round(firstBlock + bboxNumPortsDes.width + firstBlock),
            thirdBlock = Math.round(secondBlock + bboxTaxIncomeDes.width + firstBlock);

        svgPortSummary.attr("height", height).attr("width", width);

        // Background
        portSummaryRect.attr("height", height).attr("width", width);

        // Number of selected ports
        this._portSummaryTextNumPorts.attr("x", firstBlock).attr("y", firstLine);
        portSummaryTextNumPortsDes.attr("x", firstBlock).attr("y", secondLine);

        // Total tax income
        this._portSummaryTextTaxIncome.attr("x", secondBlock).attr("y", firstLine);
        portSummaryTextTaxIncomeDes.attr("x", secondBlock).attr("y", secondLine);

        // Total net income
        this._portSummaryTextNetIncome.attr("x", thirdBlock).attr("y", firstLine);
        portSummaryTextNetIncomeDes.attr("x", thirdBlock).attr("y", secondLine);
    }

    _setupFlags() {
        const svgDef = d3.select("#na-svg defs");

        nations.map(d => d.short).forEach(nation => {
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
                .attr("href", `icons/${nation}.svg`);
            pattern
                .append("rect")
                .attr("height", this._iconSize)
                .attr("width", this._iconSize)
                .attr("class", "nation");

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
                .attr("href", `icons/${nation}.svg`);
            patternA
                .append("rect")
                .attr("height", this._iconSize)
                .attr("width", this._iconSize)
                .attr("class", "all");
        });

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
    }

    _getText(id, portProperties) {
        const pbData = this._pbData.ports.filter(port => port.id === id)[0],
            portBattleLT = moment.utc(pbData.portBattle).local(),
            portBattleST = moment.utc(pbData.portBattle),
            port = {
                name: portProperties.name,
                icon: pbData.nation,
                availableForAll: portProperties.availableForAll ? "(accessible to all nations)" : "",
                depth: portProperties.shallow ? "Shallow" : "Deep",
                county:
                    (portProperties.county !== "" ? `${portProperties.county}\u200a/\u200a` : "") +
                    portProperties.region,
                countyCapital: portProperties.countyCapital ? " (county capital)" : "",
                nonCapturable: portProperties.nonCapturable,
                captured: pbData.capturer
                    ? ` captured by ${pbData.capturer} ${moment.utc(pbData.lastPortBattle).fromNow()}`
                    : "",
                lastPortBattle: pbData.lastPortBattle,
                // eslint-disable-next-line no-nested-ternary
                attack: pbData.attackHostility
                    ? `${pbData.attackerClan} (${pbData.attackerNation}) attack${
                          // eslint-disable-next-line no-nested-ternary
                          pbData.portBattle.length
                              ? `${
                                    portBattleST.isAfter(moment.utc()) ? "s" : "ed"
                                } ${portBattleST.fromNow()} at ${portBattleST.format("H.mm")}${
                                    portBattleST !== portBattleLT ? ` (${portBattleLT.format("H.mm")} local)` : ""
                                }`
                              : `s: ${formatPercent(pbData.attackHostility)} hostility`
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
                producesTrading: portProperties.producesTrading.join(", "),
                dropsTrading: portProperties.dropsTrading.join(", "),
                producesNonTrading: portProperties.producesNonTrading.join(", "),
                dropsNonTrading: portProperties.dropsNonTrading.join(", "),
                consumesTrading: portProperties.consumesTrading.join(", "),
                consumesNonTrading: portProperties.consumesNonTrading.join(", ")
            };

        switch (portProperties.portBattleType) {
            case "Large":
                port.pbType = "1<sup>st</sup>";
                break;
            case "Medium":
                port.pbType = "4<sup>th</sup>";
                break;
            default:
                port.pbType = "6<sup>th</sup>";
                break;
        }

        return port;
    }

    _showDetails(d, i, nodes) {
        function tooltipData(port) {
            let h = `<table><tbody<tr><td><i class="flag-icon ${port.icon}"></i></td>`;
            h += `<td><span class="port-name">${port.name}</span>`;
            h += `\u2001${port.county} ${port.availableForAll}`;
            h += "</td></tr></tbody></table>";
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
            if (port.producesTrading.length || port.producesNonTrading.length) {
                h += "<tr><td>Produces</td><td>";
                if (port.producesNonTrading.length) {
                    h += `<span class="non-trading">${port.producesNonTrading}</span>`;
                    if (port.producesTrading.length) {
                        h += "<br>";
                    }
                }
                if (port.producesTrading.length) {
                    h += `${port.producesTrading}`;
                }
                h += "</td></tr>";
            }
            if (port.dropsTrading.length || port.dropsNonTrading.length) {
                h += "<tr><td>Drops</td><td>";
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
            if (port.consumesTrading.length || port.consumesNonTrading.length) {
                h += "<tr><td>Consumes</td><td>";
                if (port.consumesNonTrading.length) {
                    h += `<span class="non-trading">${port.consumesNonTrading}</span>`;
                    if (port.consumesTrading.length) {
                        h += "<br>";
                    }
                }
                if (port.consumesTrading.length) {
                    h += `${port.consumesTrading}`;
                }
                h += "</td></tr>";
            }
            h += "</table>";

            return h;
        }

        const port = d3.select(nodes[i]),
            title = tooltipData(this._getText(d.id, d.properties));
        port.attr("data-toggle", "tooltip");
        // eslint-disable-next-line no-underscore-dangle
        $(port._groups[0])
            .tooltip({
                delay: {
                    show: this._highlightDuration,
                    hide: this._highlightDuration
                },
                html: true,
                placement: "auto",
                title,
                trigger: "manual"
            })
            .tooltip("show");
    }

    _updateIcons() {
        function hideDetails(d, i, nodes) {
            // eslint-disable-next-line no-underscore-dangle
            $(d3.select(nodes[i])._groups[0]).tooltip("hide");
        }

        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
            circleSize = roundToThousands(this._circleSize / circleScale),
            data = this._portData.filter(port => this._pbData.ports.some(d => port.id === d.id)).map(port => {
                // eslint-disable-next-line prefer-destructuring,no-param-reassign
                port.properties.nation = this._pbData.ports.filter(d => port.id === d.id).map(d => d.nation)[0];
                return port;
            });

        // Data join
        const circleUpdate = this._gIcon.selectAll("circle").data(data, d => d.id);

        // Remove old circles
        circleUpdate.exit().remove();

        // Update kept circles
        // circleUpdate; // not needed

        // Add new circles
        const circleEnter = circleUpdate
            .enter()
            .append("circle")
            .attr(
                "fill",
                d => `url(#${d.properties.availableForAll ? `${d.properties.nation}a` : d.properties.nation})`
            )
            .attr("cx", d => d.geometry.coordinates[0])
            .attr("cy", d => d.geometry.coordinates[1])
            .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
            .on("mouseout", hideDetails);

        // Apply to both old and new
        circleUpdate.merge(circleEnter).attr("r", d => (d.id === this._highlightId ? circleSize * 2 : circleSize));
    }

    _updatePortCircles() {
        const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
            rMin = roundToThousands((this._circleSize / circleScale) * this._minRadiusFactor),
            magicNumber = 5;
        let rMax = roundToThousands((this._circleSize / circleScale) * this._maxRadiusFactor),
            data = {},
            rGreenZone = 0;

        if (this._showRadius === "tax" || this._showRadius === "net") {
            data = this._portData.filter(d => !d.properties.nonCapturable);
        } else if (this._showRadius === "attack") {
            const pbData = this._pbData.ports
                .filter(d => d.attackHostility)
                .map(d => ({ id: d.id, attackHostility: d.attackHostility }));
            data = this._portData.filter(port => pbData.some(d => port.id === d.id)).map(port => {
                // eslint-disable-next-line prefer-destructuring,no-param-reassign
                port.properties.attackHostility = pbData.filter(d => port.id === d.id).map(d => d.attackHostility)[0];
                return port;
            });
        } else if (this._showRadius === "green") {
            rGreenZone =
                roundToThousands(
                    getDistance(
                        [convertCoordX(-63400, 18800), convertCoordY(-63400, 18800)],
                        [convertCoordX(-79696, 10642), convertCoordY(-79696, 10642)]
                    )
                ) * magicNumber;
            const pbData = this._pbData.ports.filter(d => d.nation !== "FT").map(d => d.id);
            data = this._portData.filter(port => pbData.some(d => port.id === d) && port.properties.nonCapturable);
        } else if (this._showCurrentGood) {
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
            const minTaxIncome = d3.min(data, d => d.properties.taxIncome),
                maxTaxIncome = d3.max(data, d => d.properties.taxIncome);

            this._taxIncomeRadius.domain([minTaxIncome, maxTaxIncome]);
            this._taxIncomeRadius.range([rMin, rMax]);
            circleMerge
                .attr("class", "bubble pos")
                .attr("r", d => this._taxIncomeRadius(Math.abs(d.properties.taxIncome)));
        } else if (this._showRadius === "net") {
            const minNetIncome = d3.min(data, d => d.properties.netIncome),
                maxNetIncome = d3.max(data, d => d.properties.netIncome);

            this._netIncomeRadius.domain([minNetIncome, maxNetIncome]).range([rMin, rMax]);
            circleMerge
                .attr("class", d => `bubble ${d.properties.netIncome < 0 ? "neg" : "pos"}`)
                .attr("r", d => this._netIncomeRadius(Math.abs(d.properties.netIncome)));
        } else if (this._showRadius === "attack") {
            this._attackRadius.range([rMin, rMax]);
            circleMerge
                .attr("class", "bubble")
                .attr("fill", d => this._colourScale(d.properties.attackHostility))
                .attr("r", d => this._attackRadius(d.properties.attackHostility));
        } else if (this._showRadius === "green") {
            circleMerge.attr("class", "bubble pos").attr("r", rGreenZone);
        } else if (this._showCurrentGood) {
            circleMerge.attr("class", d => `bubble ${d.properties.isSource ? "pos" : "neg"}`).attr("r", rMax);
        }
    }

    _updateTextsX(d, circleSize) {
        return this._zoomLevel === "pbZone" &&
            (this._showPBZones === "all" || (this._showPBZones === "single" && d.id === this.currentPort.id))
            ? d.geometry.coordinates[0] + Math.round(circleSize * 1.2 * Math.cos(degreesToRadians(d.properties.angle)))
            : d.geometry.coordinates[0];
    }

    _updateTextsY(d, circleSize, fontSize) {
        const deltaY = circleSize + fontSize * 1.2,
            deltaY2 = circleSize * 2 + fontSize * 2;

        if (this._zoomLevel !== "pbZone") {
            return d.id === this._highlightId
                ? d.geometry.coordinates[1] + deltaY2
                : d.geometry.coordinates[1] + deltaY;
        }
        const dy = d.properties.angle > 90 && d.properties.angle < 270 ? fontSize : 0;
        return this._showPBZones === "all" || (this._showPBZones === "single" && d.id === this.currentPort.id)
            ? d.geometry.coordinates[1] +
                  Math.round(circleSize * 1.2 * Math.sin(degreesToRadians(d.properties.angle))) +
                  dy
            : d.geometry.coordinates[1] + deltaY;
    }

    _updateTextsAnchor(d) {
        if (
            this._zoomLevel === "pbZone" &&
            (this._showPBZones === "all" || (this._showPBZones === "single" && d.id === this.currentPort.id))
        ) {
            return d.properties.textAnchor;
        }
        return "middle";
    }

    updateTexts() {
        if (this._zoomLevel === "initial") {
            this._gText.attr("display", "none");
        } else {
            this._gText.attr("display", "inherit");

            const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
                circleSize = roundToThousands(this._circleSize / circleScale),
                fontScale = 2 ** Math.log2((Math.abs(this._minScale) + this._scale) * 0.9),
                fontSize = roundToThousands(this._fontSize / fontScale);

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
                .attr("font-size", d => (d.id === this._highlightId ? `${fontSize * 2}px` : `${fontSize}px`))
                .attr("text-anchor", d => this._updateTextsAnchor(d));
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
            this._gCounty.attr("display", "none");
        } else {
            this._gCounty.attr("display", "inherit");
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
                .text(d => d.name)
                .style("filter", "url(#drop-shadow)")
                .attr("transform", d => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`);

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
        }
    }

    _updateRegions() {
        if (this._zoomLevel !== "initial") {
            this._gRegion.attr("display", "none");
        } else {
            this._gRegion.attr("display", "inherit");
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
                .style("filter", "url(#drop-shadow)")
                .text(d => d.name)
                .attr("transform", d => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`);

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

    set highlightId(highlightId) {
        this._highlightId = highlightId;
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

    set showCurrentGood(showCurrentGood) {
        this._showCurrentGood = showCurrentGood;
    }

    set showRadiusSetting(showRadius) {
        this._showRadius = showRadius;
        $(`#show-radius-${showRadius}`).prop("checked", true);
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

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap(scale) {
        this._portData = this._portDataDefault;
        this._showCurrentGood = false;
        this.update(scale);
    }
}
