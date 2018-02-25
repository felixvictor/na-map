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

class Ship {
    constructor(compareId, shipData) {
        this.id = compareId;
        this.select = `ship-${compareId}`;
        this.shipData = shipData;
        this.svgWidth = 350;
        this.svgHeight = 350;
        const outerRadius = Math.min(this.svgWidth, this.svgHeight) / 2,
            innerRadius = 0.3 * outerRadius;
        this.colorScale = d3ScaleLinear()
            .domain([ShipCompare.minSpeed, 0, 10, 12, ShipCompare.maxSpeed])
            .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"])
            .interpolate(d3InterpolateHcl);
        this.radiusScaleAbsolute = d3ScaleLinear()
            .domain([ShipCompare.minSpeed, 0, ShipCompare.maxSpeed])
            .range([10, innerRadius, outerRadius]);

        this.setupSvg();
    }

    setupSvg() {
        d3Select(this.select)
            .append("svg")
            .attr("width", this.svgWidth)
            .attr("height", this.svgHeight)
            .attr("class", "profile")
            .attr("fill", "none")
            .append("g")
            .attr("transform", `translate(${this.svgWidth / 2}, ${this.svgHeight / 2})`);
        d3Select(this.select).append("p");
    }

    shipSelectedAlt(shipId) {
        function setBackground(svgId) {
            const svg = d3Select(svgId).select("g");

            // Arc for text
            const knotsArc = d3Arc()
                .outerRadius(d => this.radiusScaleAbsolute(d) + 2)
                .innerRadius(d => this.radiusScaleAbsolute(d) + 1)
                .startAngle(-Math.PI / 2)
                .endAngle(Math.PI / 2);

            // Tick/Grid data
            const ticks = [12, 8, 4, 0];
            const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

            // Add the circles for each tick
            svg
                .selectAll(".circle")
                .data(ticks)
                .enter()
                .append("circle")
                .attr("class", "knots-circle")
                .attr("r", d => this.radiusScaleAbsolute(d));

            // Add the paths for the text
            svg
                .selectAll(".label")
                .data(ticks)
                .enter()
                .append("path")
                .attr("d", knotsArc)
                .attr("id", (d, i) => `tick${i}`);

            // And add the text
            svg
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

        function setBackgroundGradient(svgId) {
            const svg = d3Select(svgId).select("g");

            // Extra scale since the color scale is interpolated
            const gradientScale = d3ScaleLinear()
                .domain([this.minSpeed, this.maxSpeed])
                .range([0, this.svgWidth]);

            // Calculate the variables for the gradient
            const numStops = 30;
            const gradientDomain = gradientScale.domain();
            gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
            const gradientPoint = [];
            for (let i = 0; i < numStops; i++) {
                gradientPoint.push(i * gradientDomain[2] / (numStops - 1) + gradientDomain[0]);
            }

            // Create the gradient
            svg
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
                .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / this.svgWidth)
                .attr("stop-color", (d, i) => this.colorScale(gradientPoint[i]));
        }

        function drawProfile(profileData, svgId) {
            const svg = d3Select(svgId).select("g");
            const pie = d3Pie()
                .sort(null)
                .value(1);

            const arcs = pie(profileData.speedDegrees);

            const curve = d3CurveCatmullRomClosed,
                line = d3RadialLine()
                    .angle((d, i) => i * this.segmentRadians)
                    .radius(d => this.radiusScaleAbsolute(d.data))
                    .curve(curve);

            const profile = svg.append("path");
            const markers = svg.append("g").classed("markers", true);
            profile
                .attr("d", line(arcs))
                .attr("stroke-width", "5px")
                .attr("stroke", "url(#gradient)");

            const markersUpdate = markers
                .selectAll("circle")
                .data(arcs)
                .enter()
                .append("circle")
                .attr("r", "5")
                .attr("cy", (d, i) => Math.cos(i * this.segmentRadians) * -this.radiusScaleAbsolute(d.data))
                .attr("cx", (d, i) => Math.sin(i * this.segmentRadians) * this.radiusScaleAbsolute(d.data))
                .attr("fill", d => this.colorScale(d.data))
                .style("opacity", 0.5)
                .append("title")
                .text(d => `${Math.round(d.data * 10) / 10} knots`);
        }

        function drawDifferenceProfile(svgId) {
            const svg = d3Select(svgId).select("g");

            const colorScale = d3ScaleLinear()
                .domain(["A", "B"])
                .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"]);

            const pie = d3Pie()
                .sort(null)
                .value(1);
            const arcsA = pie(current.shipAData.speedDegrees),
                arcsB = pie(current.shipBData.speedDegrees);
            const curve = d3CurveCatmullRomClosed,
                lineA = d3RadialLine()
                    .angle((d, i) => i * this.segmentRadians)
                    .radius(d => this.radiusScaleAbsolute(d.data))
                    .curve(curve),
                lineB = d3RadialLine()
                    .angle((d, i) => i * this.segmentRadians)
                    .radius(d => this.radiusScaleAbsolute(d.data))
                    .curve(curve);

            const pathA = svg.append("path");
            const pathB = svg.append("path");
            const markersA = svg.append("g").attr("class", "markers");
            const markersB = svg.append("g").attr("class", "markers");

            pathA
                .transition()
                .attr("d", lineA(arcsA))
                .attr("class", "arcs arcsA");

            const selA = markersA.selectAll("circle").data(arcsA);
            selA
                .enter()
                .append("circle")
                .merge(selA)
                .attr("r", "5")
                .attr("cy", (d, i) => Math.cos(i * this.segmentRadians) * -this.radiusScaleAbsolute(d.data))
                .attr("cx", (d, i) => Math.sin(i * this.segmentRadians) * this.radiusScaleAbsolute(d.data))
                .attr("fill", d => colorScale(d.data))
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
                .attr("cy", (d, i) => Math.cos(i * this.segmentRadians) * -this.radiusScaleAbsolute(d.data))
                .attr("cx", (d, i) => Math.sin(i * this.segmentRadians) * this.radiusScaleAbsolute(d.data))
                .attr("fill", d => colorScale(d.data))
                .style("opacity", 0.2)
                .append("title")
                .text(d => `${Math.round(d.data * 10) / 10} knots`);
        }

        function getCannonsPerDeck(ship) {
            let s = ship.healthInfo.Deck4.toString();
            [ship.healthInfo.Deck3, ship.healthInfo.Deck2, ship.healthInfo.Deck1].forEach(cannons => {
                s = `${cannons} | ${s}`;
            });
            return s;
        }

        function printText(ship, svgId) {
            const p = d3Select(svgId).select("p");
            let text = "";
            console.log(ship);
            text += `${ship.name} (${getOrdinal(ship.class)} rate) <small>${ship.battleRating} battle rating`;
            text += "<br>";
            text += `${ship.decks} decks (${getCannonsPerDeck(ship)} cannons)`;
            text += "<br>";
            text += `Minimal speed: ${ship.minSpeed.toFixed(2)}, maximal speed: ${ship.maxSpeed.toFixed(2)} knots`;
            text += "<br>";
            text += `Turning speed: ${ship.maxTurningSpeed.toFixed(2)}`;
            text += "<br>";
            text += `Armor: ${ship.healthInfo.LeftArmor} sides, ${ship.healthInfo.FrontArmor} front, ${
                ship.healthInfo.BackArmor
            } back, ${ship.healthInfo.InternalStructure} structure, ${ship.healthInfo.Sails} sails, ${
                ship.healthInfo.Pump
            } pump, ${ship.healthInfo.Rudder} rudder`;
            text += "<br>";
            text += `${ship.healthInfo.Crew} crew (${ship.minCrewRequired} minimal)`;
            text += "<br>";
            text += `${ship.maxWeight} hold in ${ship.holdSize} compartments (${ship.shipMass} ship mass)`;
            text += "</small>";

            p.html(text);
        }

        function printTextCompare(svgId) {
            function getDiff(a, b, decimals = 0) {
                let text = "<span class='";
                text += a < b ? "mm" : "pp";
                text += `'>${(a - b).toFixed(decimals)}</span>`;
                return text;
            }

            const p = d3Select(svgId).select("p");
            let text = "";
            const ship = {
                class: getDiff(current.shipAData.class, current.shipBData.class),
                battleRating: getDiff(current.shipAData.battleRating, current.shipBData.battleRating),
                decks: getDiff(current.shipAData.decks, current.shipBData.decks),
                minSpeed: getDiff(current.shipAData.minSpeed, current.shipBData.minSpeed, 2),
                maxSpeed: getDiff(current.shipAData.maxSpeed, current.shipBData.maxSpeed, 2),
                maxTurningSpeed: getDiff(current.shipAData.maxTurningSpeed, current.shipBData.maxTurningSpeed, 2),
                healthInfo: {
                    Deck1: getDiff(current.shipAData.healthInfo.Deck1, current.shipBData.healthInfo.Deck1),
                    Deck2: getDiff(current.shipAData.healthInfo.Deck2, current.shipBData.healthInfo.Deck2),
                    Deck3: getDiff(current.shipAData.healthInfo.Deck3, current.shipBData.healthInfo.Deck3),
                    Deck4: getDiff(current.shipAData.healthInfo.Deck4, current.shipBData.healthInfo.Deck4),
                    LeftArmor: getDiff(current.shipAData.healthInfo.LeftArmor, current.shipBData.healthInfo.LeftArmor),
                    FrontArmor: getDiff(
                        current.shipAData.healthInfo.FrontArmor,
                        current.shipBData.healthInfo.FrontArmor
                    ),
                    BackArmor: getDiff(current.shipAData.healthInfo.BackArmor, current.shipBData.healthInfo.BackArmor),
                    InternalStructure: getDiff(
                        current.shipAData.healthInfo.InternalStructure,
                        current.shipBData.healthInfo.InternalStructure
                    ),
                    Sails: getDiff(current.shipAData.healthInfo.Sails, current.shipBData.healthInfo.Sails),
                    Pump: getDiff(current.shipAData.healthInfo.Pump, current.shipBData.healthInfo.Pump),
                    Rudder: getDiff(current.shipAData.healthInfo.Rudder, current.shipBData.healthInfo.Rudder),
                    Crew: getDiff(current.shipAData.healthInfo.Crew, current.shipBData.healthInfo.Crew)
                },
                minCrewRequired: getDiff(current.shipAData.minCrewRequired, current.shipBData.minCrewRequired),
                maxWeight: getDiff(current.shipAData.maxWeight, current.shipBData.maxWeight),
                holdSize: getDiff(current.shipAData.holdSize, current.shipBData.holdSize),
                shipMass: getDiff(current.shipAData.shipMass, current.shipBData.shipMass)
            };
            console.log(ship);
            text += `${current.shipAData.name} (compared to ${current.shipBData.name}) <small>${
                ship.battleRating
            } battle rating`;
            text += "<br>";
            text += `${ship.decks} decks (${getCannonsPerDeck(ship)} cannons)`;
            text += "<br>";
            text += `Minimal speed: ${ship.minSpeed}, maximal speed: ${ship.maxSpeed} knots`;
            text += "<br>";
            text += `Turning speed: ${ship.maxTurningSpeed}`;
            text += "<br>";
            text += `Armor: ${ship.healthInfo.LeftArmor} sides, ${ship.healthInfo.FrontArmor} front, ${
                ship.healthInfo.BackArmor
            } back, ${ship.healthInfo.InternalStructure} structure, ${ship.healthInfo.Sails} sails, ${
                ship.healthInfo.Pump
            } pump, ${ship.healthInfo.Rudder} rudder`;
            text += "<br>";
            text += `${ship.healthInfo.Crew} crew (${ship.minCrewRequired} minimal)`;
            text += "<br>";
            text += `${ship.maxWeight} hold in ${ship.holdSize} compartments (${ship.shipMass} ship mass)`;
            text += "</small>";

            p.html(text);
        }
    }
}

export default class ShipCompare {
    constructor(shipData) {
        this.shipData = shipData;
        this.shipSelectData = shipData.map(ship => ({ id: ship.id, name: ship.name })).sort((a, b) => a.name - b.name);
        this.minSpeed = d3Min(this.shipData, d => d.minSpeed);
        this.maxSpeed = d3Max(this.shipData, d => d.maxSpeed);
        this.ship = { A: {}, B: {}, Compare: {} };

        ["A", "B"].forEach(compareId => {
            this.setupShipSelect(compareId);
            this.setupListener(compareId);
        });
    }

    setupShipSelect(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.append(
            $("<option>", {
                value: 0,
                text: "Select a ship"
            })
        );
        this.shipSelectData.forEach(ship => {
            select.append(
                $("<option>", {
                    value: ship.id,
                    text: ship.name
                })
            );
        });
    }

    setupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.change(() => {
            const shipId = select.val();
            const shipData = this.shipData.filter(ship => ship.id === shipId);
            this.ship.compareId = new Ship(compareId, shipData);
            this.shipCompare();
        });
    }

    shipCompare() {
        if (this.ship.A && this.ship.B) {
            this.ship.Compare = new Ship("Compare", {});
        }
    }
}
