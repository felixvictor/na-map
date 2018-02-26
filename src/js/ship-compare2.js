/*
    ship-compare2.js
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

import { getOrdinal, isEmpty } from "./util";

const svgWidth = 350,
    svgHeight = 350,
    outerRadius = Math.min(svgWidth, svgHeight) / 2,
    innerRadius = 0.3 * outerRadius,
    numSegments = 24,
    segmentRadians = 2 * Math.PI / numSegments;

export default function shipCompare2(shipData) {
    const shipSelectData = shipData.map(ship => ({ id: ship.id, name: ship.name })).sort((a, b) => {
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
        radiusScaleAbsolute = d3ScaleLinear()
            .domain([minSpeed, 0, maxSpeed])
            .range([10, innerRadius, outerRadius]);

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
            function getCannonsPerDeck(healthInfo) {
                let s = healthInfo.Deck4.toString();
                [healthInfo.Deck3, healthInfo.Deck2, healthInfo.Deck1].forEach(cannons => {
                    s = `${cannons} | ${s}`;
                });
                return s;
            }

            let text = `<p>${this.shipData.name} (${getOrdinal(this.shipData.class)} rate)</p>`;
            text += '<small><table class="table table-sm  table-striped"><tbody>';
            text += `<tr><td>Battle rating</td><td colspan="2">${this.shipData.battleRating}</td></tr>`;
            text += `<tr><td>${this.shipData.decks} decks</td><td colspan="2">${getCannonsPerDeck(
                this.shipData.healthInfo
            )}</td></tr>`;
            text += `<tr><td>Speed (knots)</td><td>${this.shipData.minSpeed.toFixed(
                2
            )}<br><span class='des'>Minimum</span></td><td>${this.shipData.maxSpeed.toFixed(
                2
            )}<br><span class='des'>Maximum</span></td></tr>`;
            text += "";
            text += `<tr><td>Turning speed</td><td>${this.shipData.maxTurningSpeed.toFixed(2)}</td></tr>`;

            text += `<tr><td>Armor</td><td>${this.shipData.healthInfo.LeftArmor}<br><span class='des'>Sides</span><br>${
                this.shipData.healthInfo.FrontArmor
            }<br><span class='des'>Front</span><br>${
                this.shipData.healthInfo.Pump
            }<br><span class='des'>Pump</span><br>${
                this.shipData.healthInfo.Sails
            }<br><span class='des'>Sails</span></td><td>${
                this.shipData.healthInfo.InternalStructure
            }<br><span class='des'>Structure</span><br>${
                this.shipData.healthInfo.BackArmor
            }<br><span class='des'>Back</span><br>${
                this.shipData.healthInfo.Rudder
            }<br><span class='des'>Rudder</span></td></tr>`;

            text += `<tr><td>Crew</td><td>${
                this.shipData.minCrewRequired
            }<br><span class='des'>Minimum</span></td><td>${
                this.shipData.healthInfo.Crew
            }<br><span class='des'>Maximum</span></td></tr>`;
            text += `<tr><td>Hold</td><td>${this.shipData.maxWeight}<br><span class='des'>Tons</span></td><td>${
                this.shipData.holdSize
            }<br><span class='des'>Compartments</span></td></tr>`;
            text += "</tbody></table></small>";
            $(`${this.select}`)
                .find("div")
                .append(text);
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
            function getCannonsPerDeck(shipCompare, shipDiff) {
                let s = `${shipCompare.Deck4} (${shipDiff.Deck4})`;
                ["Deck3", "Deck2", "Deck1"].forEach(deck => {
                    s = `${shipCompare[deck]} (${shipDiff[deck]}) | ${s}`;
                });
                return s;
            }

            function getDiff(a, b, decimals = 0) {
                const diff = (a - b).toFixed(decimals);
                if (diff < 0) {
                    return `<span class="mm">\u2212\u202f${Math.abs(diff)}</span>`;
                } else if (diff > 0) {
                    return `<span class="pp">+\u202f${diff}</span>`;
                }
                return "0";
            }

            const ship = {
                class: getDiff(this.shipBaseData.class, this.shipCompareData.class),
                battleRating: getDiff(this.shipBaseData.battleRating, this.shipCompareData.battleRating),
                decks: getDiff(this.shipBaseData.decks, this.shipCompareData.decks),
                minSpeed: getDiff(this.shipBaseData.minSpeed, this.shipCompareData.minSpeed, 2),
                maxSpeed: getDiff(this.shipBaseData.maxSpeed, this.shipCompareData.maxSpeed, 2),
                maxTurningSpeed: getDiff(this.shipBaseData.maxTurningSpeed, this.shipCompareData.maxTurningSpeed, 2),
                healthInfo: {
                    Deck1: getDiff(this.shipBaseData.healthInfo.Deck1, this.shipCompareData.healthInfo.Deck1),
                    Deck2: getDiff(this.shipBaseData.healthInfo.Deck2, this.shipCompareData.healthInfo.Deck2),
                    Deck3: getDiff(this.shipBaseData.healthInfo.Deck3, this.shipCompareData.healthInfo.Deck3),
                    Deck4: getDiff(this.shipBaseData.healthInfo.Deck4, this.shipCompareData.healthInfo.Deck4),
                    LeftArmor: getDiff(
                        this.shipBaseData.healthInfo.LeftArmor,
                        this.shipCompareData.healthInfo.LeftArmor
                    ),
                    FrontArmor: getDiff(
                        this.shipBaseData.healthInfo.FrontArmor,
                        this.shipCompareData.healthInfo.FrontArmor
                    ),
                    BackArmor: getDiff(
                        this.shipBaseData.healthInfo.BackArmor,
                        this.shipCompareData.healthInfo.BackArmor
                    ),
                    InternalStructure: getDiff(
                        this.shipBaseData.healthInfo.InternalStructure,
                        this.shipCompareData.healthInfo.InternalStructure
                    ),
                    Sails: getDiff(this.shipBaseData.healthInfo.Sails, this.shipCompareData.healthInfo.Sails),
                    Pump: getDiff(this.shipBaseData.healthInfo.Pump, this.shipCompareData.healthInfo.Pump),
                    Rudder: getDiff(this.shipBaseData.healthInfo.Rudder, this.shipCompareData.healthInfo.Rudder),
                    Crew: getDiff(this.shipBaseData.healthInfo.Crew, this.shipCompareData.healthInfo.Crew)
                },
                minCrewRequired: getDiff(this.shipBaseData.minCrewRequired, this.shipCompareData.minCrewRequired),
                maxWeight: getDiff(this.shipBaseData.maxWeight, this.shipCompareData.maxWeight),
                holdSize: getDiff(this.shipBaseData.holdSize, this.shipCompareData.holdSize),
                shipMass: getDiff(this.shipBaseData.shipMass, this.shipCompareData.shipMass)
            };

            let text = `<p>${this.shipCompareData.name} (${getOrdinal(this.shipCompareData.class)} rate)</p>`;
            text += '<small><table class="table table-sm table-striped"><tbody>';
            text += `<tr><td>Battle rating</td><td colspan="2">${this.shipCompareData.battleRating} (${
                ship.battleRating
            })</td></tr>`;
            text += `<tr><td>${this.shipCompareData.decks} (${
                ship.decks
            }) decks</td><td colspan="2">${getCannonsPerDeck(
                this.shipCompareData.healthInfo,
                ship.healthInfo
            )}</td></tr>`;
            text += `<tr><td>Speed (knots)</td><td>${this.shipCompareData.minSpeed.toFixed(2)} (${
                ship.minSpeed
            })<br><span class='des'>Minimum</span></td><td>${this.shipCompareData.maxSpeed.toFixed(2)} (${
                ship.maxSpeed
            })<br><span class='des'>Maximum</span></td></tr>`;
            text += "";
            text += `<tr><td>Turning speed</td><td>${this.shipCompareData.maxTurningSpeed.toFixed(2)} (${
                ship.maxTurningSpeed
            })</td></tr>`;

            text += `<tr><td>Armor</td><td>${this.shipCompareData.healthInfo.LeftArmor} (${
                ship.healthInfo.LeftArmor
            })<br><span class='des'>Sides</span><br>${this.shipCompareData.healthInfo.FrontArmor} (${
                ship.healthInfo.FrontArmor
            })<br><span class='des'>Front</span><br>${this.shipCompareData.healthInfo.Pump} (${
                ship.healthInfo.Pump
            })<br><span class='des'>Pump</span><br>${this.shipCompareData.healthInfo.Sails} (${
                ship.healthInfo.Sails
            })<br><span class='des'>Sails</span></td><td>${this.shipCompareData.healthInfo.InternalStructure} (${
                ship.healthInfo.InternalStructure
            })<br><span class='des'>Structure</span><br>${this.shipCompareData.healthInfo.BackArmor} (${
                ship.healthInfo.BackArmor
            })<br><span class='des'>Back</span><br>${this.shipCompareData.healthInfo.Rudder} (${
                ship.healthInfo.Rudder
            })<br><span class='des'>Rudder</span></td></tr>`;

            text += `<tr><td>Crew</td><td>${this.shipCompareData.minCrewRequired} (${
                ship.minCrewRequired
            })<br><span class='des'>Minimum</span></td><td>${this.shipCompareData.healthInfo.Crew} (${
                ship.healthInfo.Crew
            })<br><span class='des'>Maximum</span></td></tr>`;
            text += `<tr><td>Hold</td><td>${this.shipCompareData.maxWeight} (${
                ship.maxWeight
            })<br><span class='des'>Tons</span></td><td>${this.shipCompareData.holdSize} (${
                ship.holdSize
            })<br><span class='des'>Compartments</span></td></tr>`;
            text += "</tbody></table></small>";
            $(`${this.select}`)
                .find("div")
                .append(text);
        }
    }

    function setupShipSelect(compareId) {
        const select = $(`#ship-${compareId}-select`);
        const options = `<option value="" data-id="0">Select a ship</option>${shipSelectData
            .map(ship => `<option value="${ship.id}">${ship.name}</option>`)
            .join("")}`;
        select.append(options);
        if (compareId !== "Base") {
            select.attr("disabled", "disabled");
        }
    }

    function setupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.change(() => {
            const shipId = +select.val();
            const singleShipData = shipData.filter(ship => ship.id === shipId)[0];
            if (compareId === "Base") {
                ships[compareId] = new ShipBase(compareId, singleShipData);
                ["C1", "C2"].forEach(id => {
                    $(`#ship-${id}-select`).removeAttr("disabled");
                    if (!isEmpty(ships[id])) {
                        ships[id] = new ShipComparison(id, singleShipData, ships[id].shipCompareData);
                    }
                });
            } else {
                ships[compareId] = new ShipComparison(compareId, ships.Base.shipData, singleShipData);
            }
        });
    }

    ["Base", "C1", "C2"].forEach(compareId => {
        setupShipSelect(compareId);
        setupListener(compareId);
    });
}
