/*
    port.js
*/

/* global d3 : false
 */

import Cookies from "js-cookie";
import moment from "moment";
import "moment/locale/en-gb";

import { nations, defaultFontSize, defaultCircleSize } from "./common";
import { formatInt, formatSiInt, formatPercent, roundToThousands, degreesToRadians } from "./util";

export default class PortDisplay {
    constructor(portData, pbData, serverName, topMargin, rightMargin, minScale) {
        this.portDataDefault = portData;
        this._serverName = serverName;
        this._topMargin = topMargin;
        this._rightMargin = rightMargin;
        this._minScale = minScale;
        this._scale = minScale;

        // Shroud Cay
        this.currentPort = { id: "366", coord: { x: 4396, y: 2494 } };

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
            .domain([0, 0.07, 0.95, 1])
            .range(["#eadfdf", "#8b989c", "#6b7478", "#a62e39"]);

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

        this.setPortData(portData);
        this._setPBData(pbData);
        this._setupListener();
        this._setupSvg();
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
                .attr("viewBox", `7 7 ${this._iconSize} ${this._iconSize * 0.75}`);
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
    }

    _getText(id, portProperties) {
        const pbData = this.pbData.ports.filter(port => port.id === id)[0],
            portBattleLT = moment.utc(pbData.portBattle).local(),
            portBattleST = moment.utc(pbData.portBattle),
            port = {
                name: portProperties.name,
                icon: portProperties.availableForAll ? `${pbData.nation}a` : pbData.nation,
                availableForAll: portProperties.availableForAll,
                depth: portProperties.shallow ? "Shallow" : "Deep",
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
            h += port.availableForAll ? " (accessible to all nations)" : "";
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
            data = this.portData.filter(port => this.pbData.ports.some(d => port.id === d.id)).map(port => {
                // eslint-disable-next-line prefer-destructuring,no-param-reassign
                port.properties.nation = this.pbData.ports.filter(d => port.id === d.id).map(d => d.nation)[0];
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
            rMin = roundToThousands(this._circleSize / circleScale * this._minRadiusFactor);
        let rMax = roundToThousands(this._circleSize / circleScale * this._maxRadiusFactor),
            data = {};
        if (this._showRadiusType === "tax" || this._showRadiusType === "net") {
            data = this.portData.filter(d => !d.properties.nonCapturable);
        } else if (this._showRadius === "attack") {
            const pbData = this.pbData.ports
                .filter(d => d.attackHostility)
                .map(d => ({ id: d.id, attackHostility: d.attackHostility }));
            data = this.portData.filter(port => pbData.some(d => port.id === d.id)).map(port => {
                // eslint-disable-next-line prefer-destructuring,no-param-reassign
                port.properties.attackHostility = pbData.filter(d => port.id === d.id).map(d => d.attackHostility)[0];
                return port;
            });
        } else if (this._showCurrentGood) {
            data = this.portData;
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
        } else if (this._showCurrentGood) {
            circleMerge.attr("class", d => `bubble ${d.properties.isSource ? "pos" : "neg"}`).attr("r", rMax);
        }
    }

    updateTexts() {
        if (this._zoomLevel === "initial") {
            this._gText.attr("display", "none");
        } else {
            this._gText.attr("display", "inherit");

            const circleScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale),
                circleSize = roundToThousands(this._circleSize / circleScale),
                fontScale = 2 ** Math.log2((Math.abs(this._minScale) + this._scale) * 0.75),
                fontSize = roundToThousands(this._fontSize / fontScale);

            // Data join
            const textUpdate = this._gText.selectAll("text").data(this.portData, d => d.id);

            // Remove old text
            textUpdate.exit().remove();

            // Update kept texts
            // textUpdate; // not needed

            // Add new texts
            const textEnter = textUpdate
                .enter()
                .append("text")
                .text(d => d.properties.name);

            const deltaY = circleSize + fontSize * 1.2,
                deltaY2 = circleSize * 2 + fontSize * 2;
            // Apply to both old and new
            textUpdate
                .merge(textEnter)
                .attr(
                    "x",
                    d =>
                        this._zoomLevel === "pbZone" &&
                        (this._showPBZones === "all" ||
                            (this._showPBZones === "single" && d.id === this.currentPort.id))
                            ? d.geometry.coordinates[0] +
                              Math.round(circleSize * 1.2 * Math.cos(degreesToRadians(d.properties.angle)))
                            : d.geometry.coordinates[0]
                )
                .attr("y", d => {
                    if (this._zoomLevel !== "pbZone") {
                        return d.id === this._highlightId
                            ? d.geometry.coordinates[1] + deltaY2
                            : d.geometry.coordinates[1] + deltaY;
                    }
                    const dy = d.properties.angle > 90 && d.properties.angle < 270 ? fontSize : 0;
                    return this._showPBZones === "all" ||
                        (this._showPBZones === "single" && d.id === this.currentPort.id)
                        ? d.geometry.coordinates[1] +
                              Math.round(circleSize * 1.2 * Math.sin(degreesToRadians(d.properties.angle))) +
                              dy
                        : d.geometry.coordinates[1] + deltaY;
                })
                .attr("font-size", d => (d.id === this._highlightId ? `${fontSize * 2}px` : `${fontSize}px`))
                .attr("text-anchor", d => {
                    if (
                        this._zoomLevel === "pbZone" &&
                        (this._showPBZones === "all" ||
                            (this._showPBZones === "single" && d.id === this.currentPort.id))
                    ) {
                        return d.properties.textAnchor;
                    }
                    return "middle";
                });
        }
    }

    _updateSummary() {
        const numberPorts = Object.keys(this.portData).length;
        let taxTotal = 0,
            netTotal = 0;

        if (numberPorts) {
            taxTotal = this.portData.map(d => d.properties.taxIncome).reduce((a, b) => a + b);
            netTotal = this.portData.map(d => d.properties.netIncome).reduce((a, b) => a + b);
        }

        this._portSummaryTextNumPorts.text(`${numberPorts}`);
        this._portSummaryTextTaxIncome.text(`${formatSiInt(taxTotal)}`);
        this._portSummaryTextNetIncome.text(`${formatSiInt(netTotal)}`);
    }

    update(scale = null) {
        this._scale = scale || this._scale;
        this._updateIcons();
        this._updatePortCircles();
        this.updateTexts();
        this._updateSummary();
    }

    setHighlightId(highlightId) {
        this._highlightId = highlightId;
    }

    setPortData(portData, showGood = false) {
        if (showGood) {
            this._showCurrentGood = true;
        } else {
            this._showCurrentGood = false;
        }
        this.portData = portData;
    }

    _setPBData(pbData) {
        this.pbData = pbData;
    }

    setCurrentPort(id, x, y) {
        this.currentPort = { id, coord: { x, y } };
    }

    setZoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap(scale) {
        this.portData = this.portDataDefault;
        this._showCurrentGood = false;
        this.update(scale);
    }
}
