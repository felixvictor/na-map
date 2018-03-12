/*
	ports.js
*/

import { select as d3Select } from "d3-selection";
import moment from "moment";
import "moment-timezone";
import "moment/locale/en-gb";

import { nations } from "./common";
import { formatCoord, thousandsWithBlanks } from "./util";

export default class PortDisplay {
    constructor(portData) {
        this.portDataDefault = portData;
        this.portData = portData;
        this.zoomLevel = "initial";
        this.showPBZones = false;
        this.highlightDuration = 200;
        this.iconSize = 50;
        this.fontSizes = { initial: 30, portLabel: 18, pbZone: 7 };
        this.circleSizes = { initial: 50, portLabel: 20, pbZone: 5 };
        // Shroud Cay
        this.currentPort = { id: "366", coord: { x: 4396, y: 2494 } };

        this.g = d3Select("#na-svg")
            .append("g")
            .classed("port", true);
        this.gText = this.g.append("g");

        this.setupFlags();
    }

    updatePortCircles(highlightId) {
        function showPortDetails(d, i, nodes) {
            function naTooltipData(portProperties) {
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

            const port = d3Select(nodes[i]);

            port.attr("data-toggle", "tooltip");
            // eslint-disable-next-line no-underscore-dangle
            $(port._groups[0])
                .tooltip({
                    delay: {
                        show: this.highlightDuration,
                        hide: this.highlightDuration
                    },
                    html: true,
                    placement: "auto",
                    title: naTooltipData(d.properties),
                    trigger: "manual"
                })
                .tooltip("show");
        }

        function hidePortDetails(d, i, nodes) {
            // eslint-disable-next-line no-underscore-dangle
            $(d3Select(nodes[i])._groups[0]).tooltip("hide");
        }

        const circleSize = this.circleSizes[this.zoomLevel];

        // Data join
        const circleUpdate = this.g.selectAll("circle").data(this.portData, d => d.id);

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
            .on("click", showPortDetails)
            .on("mouseout", hidePortDetails);

        // Apply to both old and new
        circleUpdate.merge(circleEnter).attr("r", d => (d.id === highlightId ? circleSize * 3 : circleSize));
    }

    updatePortTexts(highlightId) {
        if (this.zoomLevel === "initial") {
            this.gText.attr("display", "none");
        } else {
            this.gText.attr("display", "inherit");
            console.log("updatePortTexts ", this.zoomLevel);
            const circleSize = this.circleSizes[this.zoomLevel],
                fontSize = this.fontSizes[this.zoomLevel];

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
                    if (this.zoomLevel !== "pbZone") {
                        return d.geometry.coordinates[0];
                    }
                    return this.showPBZones && d.id === this.currentPort.id
                        ? d.geometry.coordinates[0] + d.properties.dx
                        : d.geometry.coordinates[0];
                })
                .attr("y", d => {
                    if (this.zoomLevel !== "pbZone") {
                        return d.id === highlightId
                            ? d.geometry.coordinates[1] + deltaY2
                            : d.geometry.coordinates[1] + deltaY;
                    }
                    return this.showPBZones && d.id === this.currentPort.id
                        ? d.geometry.coordinates[1] + d.properties.dy
                        : d.geometry.coordinates[1] + deltaY;
                })
                .attr("font-size", d => (d.id === highlightId ? `${fontSize * 2}px` : `${fontSize}px`))
                .attr("text-anchor", d => {
                    if (this.showPBZones && this.zoomLevel === "pbZone" && d.id === this.currentPort.id) {
                        return d.properties.dx < 0 ? "end" : "start";
                    }
                    return "middle";
                });
        }
    }

    updatePorts(highlightId) {
        this.updatePortCircles(highlightId);
        this.updatePortTexts(highlightId);
    }

    setupFlags() {
        const svgDef = d3Select("#na-svg defs");

        nations.map(d => d.id).forEach(nation => {
            svgDef
                .append("pattern")
                .attr("id", nation)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${this.iconSize} ${this.iconSize}`)
                .append("image")
                .attr("height", this.iconSize)
                .attr("width", this.iconSize)
                .attr("href", `icons/${nation}.svg`);
            svgDef
                .append("pattern")
                .attr("id", `${nation}a`)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${this.iconSize} ${this.iconSize}`)
                .append("image")
                .attr("height", this.iconSize)
                .attr("width", this.iconSize)
                .attr("href", `icons/${nation}a.svg`);
        });
    }

    resetData() {
        this.portData = this.portDataDefault;
    }

    transform(transform) {
        this.g.attr("transform", transform);
    }
}
