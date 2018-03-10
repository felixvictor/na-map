/*
    ship-compare.js
 */

import { min as d3Min, max as d3Max, range as d3Range } from "d3-array";
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";
import {
    arc as d3Arc,
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    radialLine as d3RadialLine
} from "d3-shape";

import { formatNumber, getOrdinal, isEmpty } from "./util";

let svgWidth = 0,
    svgHeight = 0,
    outerRadius = 0,
    innerRadius = 0;
const numSegments = 24,
    segmentRadians = 2 * Math.PI / numSegments;

export default function shipCompare(shipData) {
    const shipSelectData = shipData.map(ship => ({ id: ship.id, name: ship.name, class: ship.class })).sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        }),
        ships = { Base: {}, C1: {}, C2: {} },
        minSpeed = d3Min(shipData, d => d.minSpeed),
        maxSpeed = d3Max(shipData, d => d.maxSpeed),
        colorScale = d3ScaleLinear()
            .domain([minSpeed, 0, 4, 8, 12, maxSpeed])
            .range(["#a62e39", "#fbf8f5", "#a4dab0", "#6cc380", "#419f57"])
            .interpolate(d3InterpolateHcl),
        radiusScaleAbsolute = d3ScaleLinear().domain([minSpeed, 0, maxSpeed]);

    class Ship {
        constructor(compareId) {
            this.id = compareId;
            this.select = `#ship-${this.id}`;

            this.setupSvg();
            this.g = d3Select(this.select).select("g");
            this.setCompass();
        }

        setupSvg() {
            d3Select(`${this.select} svg`).remove();
            d3Select(this.select)
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);
            d3Select(`${this.select} div`).remove();
            d3Select(this.select).append("div");
        }

        setCompass() {
            // Compass
            const data = new Array(numSegments / 2);
            data.fill(1, 0);
            const pie = d3Pie()
                .sort(null)
                .value(1)(data);

            const arc = d3Arc()
                .outerRadius(radiusScaleAbsolute(12))
                .innerRadius(innerRadius);

            const g = this.g
                .selectAll(".compass-arc")
                .data(pie)
                .enter()
                .append("g")
                .attr("class", "compass-arc");

            g.append("path").attr("d", arc);
        }

        static pd(limit) {
            let s = `<span class="badge badge-light">${limit[0]}\u202f/\u202f`;
            if (limit[1]) {
                s += `${limit[1]}`;
            } else {
                s += "\u2013";
            }
            s += "\u202fpd</span>";
            return s;
        }

        static getCannonsPerDeck(deckClassLimit, gunsPerDeck) {
            let s = `${gunsPerDeck[0]}\u00a0${Ship.pd(deckClassLimit[0])}`;
            for (let i = 1; i < 4; i += 1) {
                if (gunsPerDeck[i]) {
                    s = `${gunsPerDeck[i]}\u00a0${Ship.pd(deckClassLimit[i])} | ${s}`;
                }
            }
            return s;
        }

        static getText(ship) {
            let text =
                '<table class="table table-sm table-striped small ship">' +
                '<col style="width: 36%;">' +
                '<col style="width: 32%;">' +
                '<col style="width: 32%;">' +
                "<tbody>";

            text += "<tr><td></td>";
            text += `<td>${ship.battleRating}<br><span class="des">Battle rating</span></td>`;
            text += `<td>${ship.guns}<br><span class="des">Cannons</span></td></tr>`;

            text += `<tr><td>${ship.decks} decks</td>`;
            text += `<td colspan="2" class="gun-decks">${
                ship.cannonsPerDeck
            }<br><span class="des">Gun decks</span><br></td></tr>`;

            text += "<tr><td>Broadside (pd)</td>";
            text += `<td>${ship.cannonBroadside}<br><span class="des">Cannons</span></td>`;
            text += `<td>${ship.carroBroadside}<br><span class="des">Carronades</span></td></tr>`;

            text += "<tr><td>Chasers</td>";
            text += `<td>${ship.gunsFront}<br><span class="des">Front</span></td>`;
            text += `<td>${ship.gunsBack}<br><span class="des">Back</span></td></tr>`;

            text += "<tr><td>Speed (knots)</td>";
            text += `<td>${ship.minSpeed}<br><span class="des">Minimum</span></td>`;
            text += `<td>${ship.maxSpeed}<br><span class="des">Maximum</span></td></tr>`;

            text += "<tr><td>Turning speed</td>";
            text += `<td colspan="2">${ship.maxTurningSpeed}</td></tr>`;

            text += "<tr><td>Armor</td>";
            text += `<td>${ship.sideArmor}<br><span class="des">Sides</span>`;
            text += `<br>${ship.frontArmor}<br><span class="des">Front</span>`;
            text += `<br>${ship.pump}<br><span class="des">Pump</span>`;
            text += `<br>${ship.sails}<br><span class="des">Sails</span></td>`;
            text += `<td>${ship.structure}<br><span class="des">Structure</span>`;
            text += `<br>${ship.backArmor}<br><span class="des">Back</span>`;
            text += `<br>${ship.rudder}<br><span class="des">Rudder</span></td></tr>`;

            text += "<tr><td>Crew</td>";
            text += `<td>${ship.minCrew}<br><span class="des">Minimum</span></td>`;
            text += `<td>${ship.maxCrew}<br><span class="des">Maximum</span></td></tr>`;

            text += "<tr><td>Hold</td>";
            text += `<td>${ship.maxWeight}<br><span class="des">Tons</span></td>`;
            text += `<td>${ship.holdSize}<br><span class="des">Compartments</span></td></tr>`;

            text += "</tbody></table>";
            return text;
        }
    }

    class ShipBase extends Ship {
        constructor(compareId, singleShipData) {
            super(compareId);

            this.shipData = singleShipData;

            this.setBackground();
            this.setBackgroundGradient();
            this.drawProfile();
            this.printText();
        }

        setBackground() {
            // Arc for text
            const knotsArc = d3Arc()
                .outerRadius(d => radiusScaleAbsolute(d) + 2)
                .innerRadius(d => radiusScaleAbsolute(d) + 1)
                .startAngle(-Math.PI / 2)
                .endAngle(Math.PI / 2);

            // Tick/Grid data
            const ticks = [12, 8, 4, 0];
            const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

            // Add the circles for each tick
            this.g
                .selectAll(".circle")
                .data(ticks)
                .enter()
                .append("circle")
                .attr("class", "knots-circle")
                .attr("r", d => radiusScaleAbsolute(d));

            // Add the paths for the text
            this.g
                .selectAll(".label")
                .data(ticks)
                .enter()
                .append("path")
                .attr("d", knotsArc)
                .attr("id", (d, i) => `tick${i}`);

            // And add the text
            this.g
                .selectAll(".label")
                .data(ticks)
                .enter()
                .append("text")
                .attr("class", "knots-text")
                .append("textPath")
                .attr("href", (d, i) => `#tick${i}`)
                .text((d, i) => tickLabels[i])
                .attr("startOffset", "16%");
        }

        setBackgroundGradient() {
            // Extra scale since the color scale is interpolated
            const gradientScale = d3ScaleLinear()
                .domain([this.shipData.minSpeed, this.shipData.maxSpeed])
                .range([0, svgWidth]);

            // Calculate the variables for the gradient
            const numStops = 30;
            const gradientDomain = gradientScale.domain();
            gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
            const gradientPoint = [];
            for (let i = 0; i < numStops; i += 1) {
                gradientPoint.push(i * gradientDomain[2] / (numStops - 1) + gradientDomain[0]);
            }

            // Create the gradient
            this.g
                .append("defs")
                .append("radialGradient")
                .attr("id", "gradient")
                .attr("cx", 0.5)
                .attr("cy", 0.25)
                .attr("r", 0.5)
                .selectAll("stop")
                .data(d3Range(numStops))
                .enter()
                .append("stop")
                .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / svgWidth)
                .attr("stop-color", (d, i) => colorScale(gradientPoint[i]));
        }

        drawProfile() {
            const pie = d3Pie()
                .sort(null)
                .value(1);

            const arcs = pie(this.shipData.speedDegrees);

            const curve = d3CurveCatmullRomClosed,
                line = d3RadialLine()
                    .angle((d, i) => i * segmentRadians)
                    .radius(d => radiusScaleAbsolute(d.data))
                    .curve(curve);

            const profile = this.g.append("path");
            const markers = this.g.append("g").classed("markers", true);
            profile
                .attr("d", line(arcs))
                .attr("stroke-width", "5px")
                .attr("stroke", "url(#gradient)");

            markers
                .selectAll("circle")
                .data(arcs)
                .enter()
                .append("circle")
                .attr("r", "5")
                .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -radiusScaleAbsolute(d.data))
                .attr("cx", (d, i) => Math.sin(i * segmentRadians) * radiusScaleAbsolute(d.data))
                .attr("fill", d => colorScale(d.data))
                .style("opacity", 0.5)
                .append("title")
                .text(d => `${Math.round(d.data * 10) / 10} knots`);
        }

        printText() {
            const ship = {
                battleRating: this.shipData.battleRating,
                guns: this.shipData.guns,
                decks: this.shipData.decks,
                cannonsPerDeck: Ship.getCannonsPerDeck(this.shipData.deckClassLimit, this.shipData.gunsPerDeck),
                cannonBroadside: this.shipData.cannonBroadside,
                carroBroadside: this.shipData.carroBroadside,
                gunsFront: this.shipData.gunsPerDeck[4],
                limitFront: this.shipData.deckClassLimit[4],
                gunsBack: this.shipData.gunsPerDeck[5],
                limitBack: this.shipData.deckClassLimit[5],
                minSpeed: formatNumber(this.shipData.minSpeed.toFixed(2)),
                maxSpeed: this.shipData.maxSpeed.toFixed(2),
                maxTurningSpeed: this.shipData.maxTurningSpeed.toFixed(2),
                sideArmor: this.shipData.healthInfo.LeftArmor,
                frontArmor: this.shipData.healthInfo.FrontArmor,
                pump: this.shipData.healthInfo.Pump,
                sails: this.shipData.healthInfo.Sails,
                structure: this.shipData.healthInfo.InternalStructure,
                backArmor: this.shipData.healthInfo.BackArmor,
                rudder: this.shipData.healthInfo.Rudder,
                minCrew: this.shipData.minCrewRequired,
                maxCrew: this.shipData.healthInfo.Crew,
                maxWeight: this.shipData.maxWeight,
                holdSize: this.shipData.holdSize
            };

            if (ship.gunsFront) {
                ship.gunsFront += `\u00a0${Ship.pd(ship.limitFront)}`;
            } else {
                ship.gunsFront = "\u2013";
            }
            if (ship.gunsBack) {
                ship.gunsBack += `\u00a0${Ship.pd(ship.limitBack)}`;
            } else {
                ship.gunsBack = "\u2013";
            }

            $(`${this.select}`)
                .find("div")
                .append(Ship.getText(ship));
        }
    }

    class ShipComparison extends Ship {
        constructor(compareId, shipBaseData, shipCompareData) {
            super(compareId);
            this.shipBaseData = shipBaseData;
            this.shipCompareData = shipCompareData;

            this.drawDifferenceProfile();
            this.printTextComparison();
        }

        drawDifferenceProfile() {
            const colorScaleDiff = d3ScaleLinear()
                .domain(["Base", "Compare"])
                .range(["#a62e39", "#fbf8f5", "#a4dab0", "#6cc380", "#419f57"]);

            const pie = d3Pie()
                .sort(null)
                .value(1);
            const arcsA = pie(this.shipBaseData.speedDegrees),
                arcsB = pie(this.shipCompareData.speedDegrees);
            const curve = d3CurveCatmullRomClosed,
                lineA = d3RadialLine()
                    .angle((d, i) => i * segmentRadians)
                    .radius(d => radiusScaleAbsolute(d.data))
                    .curve(curve),
                lineB = d3RadialLine()
                    .angle((d, i) => i * segmentRadians)
                    .radius(d => radiusScaleAbsolute(d.data))
                    .curve(curve);

            const pathA = this.g.append("path");
            const pathB = this.g.append("path");
            const markersA = this.g.append("g").attr("class", "markers");
            const markersB = this.g.append("g").attr("class", "markers");

            pathA.attr("d", lineA(arcsA)).attr("class", "arcs arcsA");

            const selA = markersA.selectAll("circle").data(arcsA);
            selA
                .enter()
                .append("circle")
                .merge(selA)
                .attr("r", "5")
                .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -radiusScaleAbsolute(d.data))
                .attr("cx", (d, i) => Math.sin(i * segmentRadians) * radiusScaleAbsolute(d.data))
                .attr("fill", d => colorScaleDiff(d.data))
                .style("opacity", 0.2)
                .append("title")
                .text(d => `${Math.round(d.data * 10) / 10} knots`);

            pathB.attr("d", lineB(arcsB)).attr("class", "arcs arcsB");

            const selB = markersB.selectAll("circle").data(arcsB);
            selB
                .enter()
                .append("circle")
                .merge(selB)
                .attr("r", "5")
                .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -radiusScaleAbsolute(d.data))
                .attr("cx", (d, i) => Math.sin(i * segmentRadians) * radiusScaleAbsolute(d.data))
                .attr("fill", d => colorScaleDiff(d.data))
                .style("opacity", 0.2)
                .append("title")
                .text(d => `${Math.round(d.data * 10) / 10} knots`);
        }

        printTextComparison() {
            function getDiff(a, b, decimals = 0) {
                const diff = parseFloat((a - b).toFixed(decimals));

                if (diff < 0) {
                    return `<span class="badge badge-danger">${formatNumber(Math.abs(diff))}</span>`;
                } else if (diff > 0) {
                    return `<span class="badge badge-success">${formatNumber(diff)}</span>`;
                }
                return "";
            }

            const ship = {
                battleRating: `${this.shipCompareData.battleRating}\u00a0${getDiff(
                    this.shipCompareData.battleRating,
                    this.shipBaseData.battleRating
                )}`,
                guns: `${this.shipCompareData.guns}\u00a0${getDiff(this.shipCompareData.guns, this.shipBaseData.guns)}`,
                decks: `${this.shipCompareData.decks}\u00a0${getDiff(
                    this.shipCompareData.decks,
                    this.shipBaseData.decks
                )}`,
                cannonsPerDeck: Ship.getCannonsPerDeck(
                    this.shipCompareData.deckClassLimit,
                    this.shipCompareData.gunsPerDeck
                ),
                cannonBroadside: `${this.shipCompareData.cannonBroadside}\u00a0${getDiff(
                    this.shipCompareData.cannonBroadside,
                    this.shipBaseData.cannonBroadside
                )}`,
                carroBroadside: `${this.shipCompareData.carroBroadside}\u00a0${getDiff(
                    this.shipCompareData.carroBroadside,
                    this.shipBaseData.carroBroadside
                )}`,
                gunsFront: this.shipCompareData.gunsPerDeck[4],
                limitFront: this.shipCompareData.deckClassLimit[4],
                gunsBack: this.shipCompareData.gunsPerDeck[5],
                limitBack: this.shipCompareData.deckClassLimit[5],
                minSpeed: `${formatNumber(this.shipCompareData.minSpeed.toFixed(2))}\u00a0${getDiff(
                    this.shipCompareData.minSpeed,
                    this.shipBaseData.minSpeed,
                    2
                )}`,
                maxSpeed: `${this.shipCompareData.maxSpeed.toFixed(2)}\u00a0${getDiff(
                    this.shipCompareData.maxSpeed,
                    this.shipBaseData.maxSpeed,
                    2
                )}`,
                maxTurningSpeed: `${this.shipCompareData.maxTurningSpeed.toFixed(2)}\u00a0${getDiff(
                    this.shipCompareData.maxTurningSpeed,
                    this.shipBaseData.maxTurningSpeed,
                    2
                )}`,
                sideArmor: `${this.shipCompareData.healthInfo.LeftArmor}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.LeftArmor,
                    this.shipBaseData.healthInfo.LeftArmor
                )}`,
                frontArmor: `${this.shipCompareData.healthInfo.FrontArmor}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.FrontArmor,
                    this.shipBaseData.healthInfo.FrontArmor
                )}`,
                pump: `${this.shipCompareData.healthInfo.Pump}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.Pump,
                    this.shipBaseData.healthInfo.Pump
                )}`,
                sails: `${this.shipCompareData.healthInfo.Sails}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.Sails,
                    this.shipBaseData.healthInfo.Sails
                )}`,
                structure: `${this.shipCompareData.healthInfo.InternalStructure}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.InternalStructure,
                    this.shipBaseData.healthInfo.InternalStructure
                )}`,
                backArmor: `${this.shipCompareData.healthInfo.BackArmor}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.BackArmor,
                    this.shipBaseData.healthInfo.BackArmor
                )}`,
                rudder: `${this.shipCompareData.healthInfo.Rudder}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.Rudder,
                    this.shipBaseData.healthInfo.Rudder
                )}`,
                minCrew: `${this.shipCompareData.minCrewRequired}\u00a0${getDiff(
                    this.shipCompareData.minCrewRequired,
                    this.shipBaseData.minCrewRequired
                )}`,
                maxCrew: `${this.shipCompareData.healthInfo.Crew}\u00a0${getDiff(
                    this.shipCompareData.healthInfo.Crew,
                    this.shipBaseData.healthInfo.Crew
                )}`,
                maxWeight: `${this.shipCompareData.maxWeight}\u00a0${getDiff(
                    this.shipCompareData.maxWeight,
                    this.shipBaseData.maxWeight
                )}`,
                holdSize: `${this.shipCompareData.holdSize}\u00a0${getDiff(
                    this.shipCompareData.holdSize,
                    this.shipBaseData.holdSize
                )}`
            };

            if (ship.gunsFront) {
                ship.gunsFront += `\u00a0${Ship.pd(ship.limitFront)}`;
            } else {
                ship.gunsFront = "\u2013";
            }
            if (ship.gunsBack) {
                ship.gunsBack += `\u00a0${Ship.pd(ship.limitBack)}`;
            } else {
                ship.gunsBack = "\u2013";
            }

            $(`${this.select}`)
                .find("div")
                .append(Ship.getText(ship));
        }
    }

    function setupShipSelect(compareId) {
        const select = $(`#ship-${compareId}-select`);
        const options = `${shipSelectData
            .map(
                ship => `<option data-subtext="${getOrdinal(ship.class)} rate" value="${ship.id}">${ship.name}</option>`
            )
            .join("")}`;
        select.append(options);
        if (compareId !== "Base") {
            select.attr("disabled", "disabled");
        }
    }

    function setupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select
            .addClass("selectpicker")
            .on("change", () => {
                const shipId = +select.val();
                const singleShipData = shipData.filter(ship => ship.id === shipId)[0];
                if (compareId === "Base") {
                    ships[compareId] = new ShipBase(compareId, singleShipData);
                    ["C1", "C2"].forEach(id => {
                        $(`#ship-${id}-select`)
                            .removeAttr("disabled")
                            .selectpicker("refresh");
                        if (!isEmpty(ships[id])) {
                            ships[id] = new ShipComparison(id, singleShipData, ships[id].shipCompareData);
                        }
                    });
                } else {
                    ships[compareId] = new ShipComparison(compareId, ships.Base.shipData, singleShipData);
                }
            })
            .selectpicker("refresh");
    }

    $("#modal-ships").modal("show");

    svgWidth = parseInt($(".columnA").width(), 10);
    // noinspection JSSuspiciousNameCombination
    svgHeight = svgWidth;
    outerRadius = Math.floor(Math.min(svgWidth, svgHeight) / 2);
    innerRadius = Math.floor(outerRadius * 0.3);
    radiusScaleAbsolute.range([10, innerRadius, outerRadius]);

    ["Base", "C1", "C2"].forEach(compareId => {
        setupShipSelect(compareId);
        setupListener(compareId);
    });
}
