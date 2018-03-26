/*
    port.js
*/

/* global d3 : false
 */

import moment from "moment";
import "moment/locale/en-gb";

import { nations } from "./common";
import { formatInt, formatSiInt, formatPercent, degreesToCompass } from "./util";

export default class PortDisplay {
    constructor(portData, topMargin, rightMargin) {
        this.portDataDefault = portData;
        this._topMargin = topMargin;
        this._rightMargin = rightMargin;

        // Shroud Cay
        this.currentPort = { id: "366", coord: { x: 4396, y: 2494 } };
        this.fontSizes = { initial: 30, portLabel: 18, pbZone: 7 };

        this._zoomLevel = "initial";
        this._showPBZones = "all";
        this._highlightId = null;
        this._highlightDuration = 200;
        this._iconSize = 50;
        this._circleSizes = { initial: 50, portLabel: 20, pbZone: 5 };
        this._showRadiusType = "noShow";
        this._taxIncomeRadius = d3.scaleLinear();
        this._netIncomeRadius = d3.scaleLinear();
        this._minRadiusFactor = 1;
        this._maxRadiusFactor = 6;

        this.setPortData(portData);
        this._setupListener();
        this._setupSvg();
        this._setupFlags();
    }

    _setupListener() {
        $("#radius-type").change(() => {
            this._showRadiusType = $("input[name='showRadiusType']:checked").val();
            this.update();
        });
    }

    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("ports", true);
        this._gIncomeCircle = this._g.append("g");
        this._gPortCircle = this._g.append("g").classed("port", true);
        this._gText = this._g.append("g");

        const lineHeight = parseInt(
            window.getComputedStyle(document.getElementById("na-svg")).getPropertyValue("line-height"),
            10
        );
        const height = lineHeight * 3,
            width = 350,
            firstRow = "30%",
            secondRow = "55%",
            firstCol = "10%",
            secondCol = "45%",
            thirdCol = "70%";
        const svgPortSummary = d3
            .select("body")
            .append("svg")
            .attr("id", "summary")
            .classed("summary", true)
            .style("position", "absolute")
            .style("top", `${this._topMargin}px`)
            .style("right", `${this._rightMargin}px`)
            .attr("height", height)
            .attr("width", width);
        svgPortSummary
            .insert("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", height)
            .attr("width", width);
        this._portSummaryText1 = svgPortSummary
            .append("text")
            .attr("x", firstCol)
            .attr("y", firstRow);
        svgPortSummary
            .append("text")
            .attr("x", firstCol)
            .attr("y", secondRow)
            .classed("des", true)
            .text("selected ports");
        this._portSummaryText2 = svgPortSummary
            .append("text")
            .attr("x", secondCol)
            .attr("y", firstRow);
        svgPortSummary
            .append("text")
            .attr("x", secondCol)
            .attr("y", secondRow)
            .classed("des", true)
            .text("tax income");
        this._portSummaryText3 = svgPortSummary
            .append("text")
            .attr("x", thirdCol)
            .attr("y", firstRow);
        svgPortSummary
            .append("text")
            .attr("x", thirdCol)
            .attr("y", secondRow)
            .classed("des", true)
            .text("net income");
    }

    _setupFlags() {
        const svgDef = d3.select("#na-svg defs");

        nations.map(d => d.short).forEach(nation => {
            svgDef
                .append("pattern")
                .attr("id", nation)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${this._iconSize} ${this._iconSize}`)
                .append("image")
                .attr("height", this._iconSize)
                .attr("width", this._iconSize)
                .attr("href", `icons/${nation}.svg`);
            svgDef
                .append("pattern")
                .attr("id", `${nation}a`)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${this._iconSize} ${this._iconSize}`)
                .append("image")
                .attr("height", this._iconSize)
                .attr("width", this._iconSize)
                .attr("href", `icons/${nation}a.svg`);
        });
    }

    _updatePortCircles() {
        function showDetails(d, i, nodes) {
            function getText(portProperties) {
                const port = {
                    name: portProperties.name,
                    icon: portProperties.availableForAll ? `${portProperties.nation}a` : portProperties.nation,
                    availableForAll: portProperties.availableForAll,
                    depth: portProperties.shallow ? "Shallow" : "Deep",
                    countyCapital: portProperties.countyCapital ? " (county capital)" : "",
                    nonCapturable: portProperties.nonCapturable,
                    // eslint-disable-next-line no-nested-ternary
                    captured: portProperties.capturer
                        ? ` captured by ${portProperties.capturer} ${moment(portProperties.lastPortBattle).fromNow()}`
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
                    laborHoursDiscount: portProperties.laborHoursDiscount ? ", labor hours discount" : ""
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

            function tooltipData(portProperties) {
                const port = getText(portProperties);

                let h = `<table><tbody<tr><td><i class="flag-icon ${port.icon}"></i></td>`;
                h += `<td><span class="port-name">${port.name}</span>`;
                h += port.availableForAll ? " (accessible to all nations)" : "";
                h += "</td></tr></tbody></table>";
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
                if (portProperties.producesTrading.length || portProperties.producesNonTrading.length) {
                    h += "<tr><td>Produces</td><td>";
                    if (portProperties.producesNonTrading.length) {
                        h += `<span class="non-trading">${portProperties.producesNonTrading.join(", ")}</span>`;
                        if (portProperties.producesTrading.length) {
                            h += "<br>";
                        }
                    }
                    if (portProperties.producesTrading.length) {
                        h += `${portProperties.producesTrading.join(", ")}`;
                    }
                    h += "</td></tr>";
                }
                if (portProperties.dropsTrading.length || portProperties.dropsNonTrading.length) {
                    h += "<tr><td>Drops</td><td>";
                    if (portProperties.dropsNonTrading.length) {
                        h += `<span class="non-trading">${portProperties.dropsNonTrading.join(", ")}</span>`;
                        if (portProperties.dropsTrading.length) {
                            h += "<br>";
                        }
                    }
                    if (portProperties.dropsTrading.length) {
                        h += `${portProperties.dropsTrading.join(", ")}`;
                    }
                    h += "</td></tr>";
                }
                if (portProperties.consumesTrading.length || portProperties.consumesNonTrading.length) {
                    h += "<tr><td>Consumes</td><td>";
                    if (portProperties.consumesNonTrading.length) {
                        h += `<span class="non-trading">${portProperties.consumesNonTrading.join(", ")}</span>`;
                        if (portProperties.consumesTrading.length) {
                            h += "<br>";
                        }
                    }
                    if (portProperties.consumesTrading.length) {
                        h += `${portProperties.consumesTrading.join(", ")}`;
                    }
                    h += "</td></tr>";
                }
                h += "</table>";

                return h;
            }

            const port = d3.select(nodes[i]);

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
                    title: tooltipData(d.properties),
                    trigger: "manual"
                })
                .tooltip("show");
        }

        function hideDetails(d, i, nodes) {
            // eslint-disable-next-line no-underscore-dangle
            $(d3.select(nodes[i])._groups[0]).tooltip("hide");
        }

        const circleSize = this._circleSizes[this._zoomLevel];

        // Data join
        const circleUpdate = this._gPortCircle.selectAll("circle").data(this.portData, d => d.id);

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
            .on("click", showDetails)
            .on("mouseout", hideDetails);

        // Apply to both old and new
        circleUpdate.merge(circleEnter).attr("r", d => (d.id === this._highlightId ? circleSize * 2 : circleSize));
    }

    _updateIncomeCircles() {
        let data = {};
        if (this._showRadiusType !== "noShow") {
            data = this.portData.filter(d => !d.properties.nonCapturable);
        }
        // Data join
        const circleUpdate = this._gIncomeCircle.selectAll("circle").data(data, d => d.id);

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
        if (this._showRadiusType === "taxIncome") {
            const minTaxIncome = d3.min(data, d => d.properties.taxIncome),
                maxTaxIncome = d3.max(data, d => d.properties.taxIncome);

            this._taxIncomeRadius.domain([minTaxIncome, maxTaxIncome]);
            this._taxIncomeRadius.range([
                this._circleSizes[this._zoomLevel] * this._minRadiusFactor,
                this._circleSizes[this._zoomLevel] * this._maxRadiusFactor
            ]);
            circleMerge
                .attr("class", "bubble pos")
                .attr("r", d => this._taxIncomeRadius(Math.abs(d.properties.taxIncome)));
        } else if (this._showRadiusType === "netIncome") {
            const minNetIncome = d3.min(data, d => d.properties.netIncome),
                maxNetIncome = d3.max(data, d => d.properties.netIncome);

            this._netIncomeRadius
                .domain([minNetIncome, maxNetIncome])
                .range([
                    this._circleSizes[this._zoomLevel] * this._minRadiusFactor,
                    this._circleSizes[this._zoomLevel] * this._maxRadiusFactor
                ]);
            circleMerge
                .attr("class", d => (d.properties.netIncome < 0 ? "bubble neg" : "bubble pos"))
                .attr("r", d => this._netIncomeRadius(Math.abs(d.properties.netIncome)));
        }
    }

    updateTexts() {
        if (this._zoomLevel === "initial") {
            this._gText.attr("display", "none");
        } else {
            this._gText.attr("display", "inherit");

            const circleSize = this._circleSizes[this._zoomLevel],
                fontSize = this.fontSizes[this._zoomLevel];

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

            const deltaY = circleSize + fontSize;
            const deltaY2 = circleSize * 2 + fontSize * 2;
            // Apply to both old and new
            textUpdate
                .merge(textEnter)
                .attr(
                    "x",
                    d =>
                        this._zoomLevel === "pbZone" &&
                        (this._showPBZones === "all" ||
                            (this._showPBZones === "single" && d.id === this.currentPort.id))
                            ? d.geometry.coordinates[0] + d.properties.dx
                            : d.geometry.coordinates[0]
                )
                .attr("y", d => {
                    if (this._zoomLevel !== "pbZone") {
                        return d.id === this._highlightId
                            ? d.geometry.coordinates[1] + deltaY2
                            : d.geometry.coordinates[1] + deltaY;
                    }
                    return this._showPBZones === "all" ||
                        (this._showPBZones === "single" && d.id === this.currentPort.id)
                        ? d.geometry.coordinates[1] + d.properties.dy
                        : d.geometry.coordinates[1] + deltaY;
                })
                .attr("font-size", d => (d.id === this._highlightId ? `${fontSize * 2}px` : `${fontSize}px`))
                .attr("text-anchor", d => {
                    if (
                        this._zoomLevel === "pbZone" &&
                        (this._showPBZones === "all" ||
                            (this._showPBZones === "single" && d.id === this.currentPort.id))
                    ) {
                        return d.properties.dx < 0 ? "end" : "start";
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

        this._portSummaryText1.text(`${numberPorts}`);
        this._portSummaryText2.text(`${formatSiInt(taxTotal)}`);
        this._portSummaryText3.text(`${formatSiInt(netTotal)}`);
    }

    update() {
        this._updatePortCircles();
        this._updateIncomeCircles();
        this.updateTexts();
        this._updateSummary();
    }

    setHighlightId(highlightId) {
        this._highlightId = highlightId;
    }

    setPortData(portData) {
        this.portData = portData;
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

    clearMap() {
        this.portData = this.portDataDefault;
        this.update();
    }
}
