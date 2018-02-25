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

import { getOrdinal, isEmpty } from "./util";

const svgWidth = 350,
    svgHeight = 350,
    outerRadius = Math.min(svgWidth, svgHeight) / 2,
    innerRadius = 0.3 * outerRadius,
    numSegments = 25,
    segmentRadians = 2 * Math.PI / numSegments;

export default function shipCompare(shipData) {
    const shipSelectData = shipData.map(ship => ({ id: ship.id, name: ship.name })).sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        }),
        ships = { A: {}, B: {}, Compare: {} },
        minSpeed = d3Min(shipData, d => d.minSpeed),
        maxSpeed = d3Max(shipData, d => d.maxSpeed),
        colorScale = d3ScaleLinear()
            .domain([minSpeed, 0, 10, 12, maxSpeed])
            .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"])
            .interpolate(d3InterpolateHcl),
        radiusScaleAbsolute = d3ScaleLinear()
            .domain([minSpeed, 0, maxSpeed])
            .range([10, innerRadius, outerRadius]);

    class Ship {
        constructor(compareId) {
            console.log(compareId);
            this.id = compareId;
            this.select = `#ship-${this.id}`;

            this.setupSvg();
            this.g = d3Select(this.select).select("g");
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
            d3Select(`${this.select} 
            div`).remove();
            d3Select(this.select).append("div");
        }

        static getCannonsPerDeck(healthInfo) {
            let s = healthInfo.Deck4.toString();
            [healthInfo.Deck3, healthInfo.Deck2, healthInfo.Deck1].forEach(cannons => {
                s = `${cannons} | ${s}`;
            });
            return s;
        }
    }

    class ShipStandard extends Ship {
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
                .domain([minSpeed, maxSpeed])
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
            let text = `<p>${this.shipData.name} (${getOrdinal(this.shipData.class)} rate)</p>`;
            text += '<small><table class="table table-sm  table-striped"><tbody>';
            text += `<tr><td>Battle rating</td><td colspan="2">${this.shipData.battleRating}</td></tr>`;
            text += `<tr><td>${this.shipData.decks} decks (cannons)</td><td colspan="2">${Ship.getCannonsPerDeck(
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
        constructor(shipAData, shipBData) {
            super("Compare", {});
            this.shipAData = shipAData;
            this.shipBData = shipBData;

            this.drawDifferenceProfile();
            this.printTextComparison();
        }

        drawDifferenceProfile() {
            const colorScaleDiff = d3ScaleLinear()
                .domain(["A", "B"])
                .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"]);

            const pie = d3Pie()
                .sort(null)
                .value(1);
            const arcsA = pie(this.shipAData.speedDegrees),
                arcsB = pie(this.shipBData.speedDegrees);
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
                let text = "<span class='";
                text += a < b ? "mm" : "pp";
                text += `'>${(a - b).toFixed(decimals)}</span>`;
                return text;
            }

            const ship = {
                class: getDiff(this.shipAData.class, this.shipBData.class),
                battleRating: getDiff(this.shipAData.battleRating, this.shipBData.battleRating),
                decks: getDiff(this.shipAData.decks, this.shipBData.decks),
                minSpeed: getDiff(this.shipAData.minSpeed, this.shipBData.minSpeed, 2),
                maxSpeed: getDiff(this.shipAData.maxSpeed, this.shipBData.maxSpeed, 2),
                maxTurningSpeed: getDiff(this.shipAData.maxTurningSpeed, this.shipBData.maxTurningSpeed, 2),
                healthInfo: {
                    Deck1: getDiff(this.shipAData.healthInfo.Deck1, this.shipBData.healthInfo.Deck1),
                    Deck2: getDiff(this.shipAData.healthInfo.Deck2, this.shipBData.healthInfo.Deck2),
                    Deck3: getDiff(this.shipAData.healthInfo.Deck3, this.shipBData.healthInfo.Deck3),
                    Deck4: getDiff(this.shipAData.healthInfo.Deck4, this.shipBData.healthInfo.Deck4),
                    LeftArmor: getDiff(this.shipAData.healthInfo.LeftArmor, this.shipBData.healthInfo.LeftArmor),
                    FrontArmor: getDiff(this.shipAData.healthInfo.FrontArmor, this.shipBData.healthInfo.FrontArmor),
                    BackArmor: getDiff(this.shipAData.healthInfo.BackArmor, this.shipBData.healthInfo.BackArmor),
                    InternalStructure: getDiff(
                        this.shipAData.healthInfo.InternalStructure,
                        this.shipBData.healthInfo.InternalStructure
                    ),
                    Sails: getDiff(this.shipAData.healthInfo.Sails, this.shipBData.healthInfo.Sails),
                    Pump: getDiff(this.shipAData.healthInfo.Pump, this.shipBData.healthInfo.Pump),
                    Rudder: getDiff(this.shipAData.healthInfo.Rudder, this.shipBData.healthInfo.Rudder),
                    Crew: getDiff(this.shipAData.healthInfo.Crew, this.shipBData.healthInfo.Crew)
                },
                minCrewRequired: getDiff(this.shipAData.minCrewRequired, this.shipBData.minCrewRequired),
                maxWeight: getDiff(this.shipAData.maxWeight, this.shipBData.maxWeight),
                holdSize: getDiff(this.shipAData.holdSize, this.shipBData.holdSize),
                shipMass: getDiff(this.shipAData.shipMass, this.shipBData.shipMass)
            };

            let text = `<p>${this.shipAData.name} (compared to ${this.shipBData.name})</p>`;
            text += '<small><table class="table table-sm  table-striped"><tbody>';
            text += `<tr><td>Battle rating</td><td colspan="2">${ship.battleRating}</td></tr>`;
            text += `<tr><td>${ship.decks} decks (cannons)</td><td colspan="2">${Ship.getCannonsPerDeck(
                ship.healthInfo
            )}</td></tr>`;
            text += `<tr><td>Speed (knots)</td><td>${ship.minSpeed}<br><span class='des'>Minimum</span></td><td>${
                ship.maxSpeed
            }<br><span class='des'>Maximum</span></td></tr>`;
            text += "";
            text += `<tr><td>Turning speed</td><td>${ship.maxTurningSpeed}</td></tr>`;

            text += `<tr><td>Armor</td><td>${ship.healthInfo.LeftArmor}<br><span class='des'>Sides</span><br>${
                ship.healthInfo.FrontArmor
            }<br><span class='des'>Front</span><br>${ship.healthInfo.Pump}<br><span class='des'>Pump</span><br>${
                ship.healthInfo.Sails
            }<br><span class='des'>Sails</span></td><td>${
                ship.healthInfo.InternalStructure
            }<br><span class='des'>Structure</span><br>${
                ship.healthInfo.BackArmor
            }<br><span class='des'>Back</span><br>${
                ship.healthInfo.Rudder
            }<br><span class='des'>Rudder</span></td></tr>`;

            text += `<tr><td>Crew</td><td>${ship.minCrewRequired}<br><span class='des'>Minimum</span></td><td>${
                ship.healthInfo.Crew
            }<br><span class='des'>Maximum</span></td></tr>`;
            text += `<tr><td>Hold</td><td>${ship.maxWeight}<br><span class='des'>Tons</span></td><td>${
                ship.holdSize
            }<br><span class='des'>Compartments</span></td></tr>`;
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
    }

    function CompareShips() {
        if (!isEmpty(ships.A) && !isEmpty(ships.B)) {
            ships.Compare = new ShipComparison(ships.A.shipData, ships.B.shipData);
        }
    }

    function setupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.change(() => {
            const shipId = +select.val();
            const singleShipData = shipData.filter(ship => ship.id === shipId)[0];
            ships[compareId] = new ShipStandard(compareId, singleShipData);
            CompareShips();
        });
    }

    ["A", "B"].forEach(compareId => {
        setupShipSelect(compareId);
        setupListener(compareId);
    });
}
