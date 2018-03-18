/*
    ports.js
*/

/* global d3 : false
 */

import moment from "moment";
import "moment/locale/en-gb";

import { nations } from "./common";
import { formatCoord, thousandsWithBlanks } from "./util";

export default class PortDisplay {
    constructor(portData) {
        this.portDataDefault = portData;
        this.portData = portData;
        // Shroud Cay
        this.currentPort = { id: "366", coord: { x: 4396, y: 2494 } };
        this.fontSizes = { initial: 30, portLabel: 18, pbZone: 7 };

        this._zoomLevel = "initial";
        this._showPBZones = false;
        this._highlightId = null;
        this._highlightDuration = 200;
        this._iconSize = 50;
        this._circleSizes = { initial: 50, portLabel: 20, pbZone: 5 };

        this._setupSvg();
        this._setupFlags();
    }

    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("port", true);
        this.gText = this._g.append("g");
    }

    _setupFlags() {
        const svgDef = d3.select("#na-svg defs");

        nations.map(d => d.id).forEach(nation => {
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

    _updateCircles() {
        function showDetails(d, i, nodes) {
            function tooltipData(portProperties) {
                let h = `<table><tbody<tr><td><i class="flag-icon ${
                    portProperties.availableForAll ? `${portProperties.nation}a` : portProperties.nation
                }"></i></td>`;
                h += `<td><span class="port-name">${portProperties.name}</span>`;
                h += portProperties.availableForAll ? " (accessible to all nations)" : "";
                h += "</td></tr></tbody></table>";
                h += `<p>${portProperties.shallow ? "Shallow" : "Deep"}`;
                h += " water port";
                if (portProperties.countyCapital) {
                    h += " (county capital)";
                }
                if (portProperties.capturer) {
                    h += ` captured by ${portProperties.capturer} ${moment(portProperties.lastPortBattle).fromNow()}`;
                }
                h += "<br>";
                if (!portProperties.nonCapturable) {
                    const pbTimeRange = !portProperties.portBattleStartTime
                        ? "11.00\u202f–\u202f8.00"
                        : `${(portProperties.portBattleStartTime + 10) %
                              24}.00\u202f–\u202f${(portProperties.portBattleStartTime + 13) % 24}.00`;
                    h += `Port battle ${pbTimeRange}, ${thousandsWithBlanks(portProperties.brLimit)} BR, `;
                    switch (portProperties.portBattleType) {
                        case "Large":
                            h += "1<sup>st</sup>";
                            break;
                        case "Medium":
                            h += "4<sup>th</sup>";
                            break;
                        default:
                            h += "6<sup>th</sup>";
                            break;
                    }

                    h += "\u202frate AI";
                    h += `, ${portProperties.conquestMarksPension}\u202fconquest point`;
                    h += portProperties.conquestMarksPension > 1 ? "s" : "";
                    h += `<br>Tax income ${thousandsWithBlanks(portProperties.taxIncome)} (${portProperties.portTax *
                        100}\u202f%), net income ${formatCoord(portProperties.netIncome)}`;
                    h += portProperties.tradingCompany
                        ? `, trading company level\u202f${portProperties.tradingCompany}`
                        : "";
                    h += portProperties.laborHoursDiscount ? ", labor hours discount" : "";
                } else {
                    h += "Not capturable";
                    h += `<br>${portProperties.portTax * 100}\u2009% tax`;
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
        const circleUpdate = this._g.selectAll("circle").data(this.portData, d => d.id);

        // Remove old circles
        circleUpdate.exit().remove();

        // Update kept circles
        // circleUpdate; // not needed

        // Add new circles
        // eslint-disable-next-line no-unused-vars
        const circleEnter = circleUpdate
            .enter()
            .append("circle")
            .attr("cx", d => d.geometry.coordinates[0])
            .attr("cy", d => d.geometry.coordinates[1])
            .attr(
                "fill",
                d => `url(#${d.properties.availableForAll ? `${d.properties.nation}a` : d.properties.nation})`
            )
            .on("click", showDetails)
            .on("mouseout", hideDetails);

        // Apply to both old and new
        circleUpdate.merge(circleEnter).attr("r", d => (d.id === this._highlightId ? circleSize * 3 : circleSize));
    }

    updateTexts() {
        if (this._zoomLevel === "initial") {
            this.gText.attr("display", "none");
        } else {
            this.gText.attr("display", "inherit");

            const circleSize = this._circleSizes[this._zoomLevel],
                fontSize = this.fontSizes[this._zoomLevel];

            // Data join
            const textUpdate = this.gText.selectAll("text").data(this.portData, d => d.id);

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
            const deltaY2 = circleSize + fontSize * 2;
            // Apply to both old and new
            textUpdate
                .merge(textEnter)
                .attr("x", d => {
                    if (this._zoomLevel !== "pbZone") {
                        return d.geometry.coordinates[0];
                    }
                    return this._showPBZones && d.id === this.currentPort.id
                        ? d.geometry.coordinates[0] + d.properties.dx
                        : d.geometry.coordinates[0];
                })
                .attr("y", d => {
                    if (this._zoomLevel !== "pbZone") {
                        return d.id === this._highlightId
                            ? d.geometry.coordinates[1] + deltaY2
                            : d.geometry.coordinates[1] + deltaY;
                    }
                    return this._showPBZones && d.id === this.currentPort.id
                        ? d.geometry.coordinates[1] + d.properties.dy
                        : d.geometry.coordinates[1] + deltaY;
                })
                .attr("font-size", d => (d.id === this._highlightId ? `${fontSize * 2}px` : `${fontSize}px`))
                .attr("text-anchor", d => {
                    if (this._showPBZones && this._zoomLevel === "pbZone" && d.id === this.currentPort.id) {
                        return d.properties.dx < 0 ? "end" : "start";
                    }
                    return "middle";
                });
        }
    }

    update() {
        this._updateCircles();
        this.updateTexts();
    }

    setHighlightId(highlightId) {
        this._highlightId = highlightId;
    }

    setPortData(portData) {
        this.portData = portData;
    }

    setCurrentPort(id, x,y){
        this.currentPort = { id: id, coord: { x: x, y: y } };
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
