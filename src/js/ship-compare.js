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
    constructor(compareId, minSpeed, maxSpeed) {
        console.log(compareId, minSpeed, maxSpeed);
        this.id = compareId;
        this.select = `#ship-${this.id}`;
        this.svgWidth = 350;
        this.svgHeight = 350;
        this.minSpeed = minSpeed;
        this.maxSpeed = maxSpeed;

        const outerRadius = Math.min(this.svgWidth, this.svgHeight) / 2,
            innerRadius = 0.3 * outerRadius;
        this.colorScale = d3ScaleLinear()
            .domain([this.minSpeed, 0, 10, 12, this.maxSpeed])
            .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"])
            .interpolate(d3InterpolateHcl);
        this.radiusScaleAbsolute = d3ScaleLinear()
            .domain([this.minSpeed, 0, this.maxSpeed])
            .range([10, innerRadius, outerRadius]);

        const numSegments = 25;
        this.segmentRadians = 2 * Math.PI / numSegments;

        this.setupSvg();
        this.g = d3Select(this.select).select("g");
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

    static getCannonsPerDeck(healthInfo) {
        let s = healthInfo.Deck4.toString();
        [healthInfo.Deck3, healthInfo.Deck2, healthInfo.Deck1].forEach(cannons => {
            s = `${cannons} | ${s}`;
        });
        return s;
    }
}

class ShipStandard extends Ship {
    constructor(compareId, shipData, minSpeed, maxSpeed) {
        super(compareId, minSpeed, maxSpeed);

        this.shipData = shipData;

        this.setBackground();
        this.setBackgroundGradient();
        this.drawProfile();
        this.printText();
    }

    setBackground() {
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
        this.g
            .selectAll(".circle")
            .data(ticks)
            .enter()
            .append("circle")
            .attr("class", "knots-circle")
            .attr("r", d => this.radiusScaleAbsolute(d));

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
            .domain([this.minSpeed, this.maxSpeed])
            .range([0, this.svgWidth]);

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
            .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / this.svgWidth)
            .attr("stop-color", (d, i) => this.colorScale(gradientPoint[i]));
    }

    drawProfile() {
        const pie = d3Pie()
            .sort(null)
            .value(1);

        const arcs = pie(this.shipData.speedDegrees);

        const curve = d3CurveCatmullRomClosed,
            line = d3RadialLine()
                .angle((d, i) => i * this.segmentRadians)
                .radius(d => this.radiusScaleAbsolute(d.data))
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
            .attr("cy", (d, i) => Math.cos(i * this.segmentRadians) * -this.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * this.segmentRadians) * this.radiusScaleAbsolute(d.data))
            .attr("fill", d => this.colorScale(d.data))
            .style("opacity", 0.5)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);
    }

    printText() {
        const p = d3Select(`${this.select} p`);
        let text = "";
        console.log(this.shipData);
        text += `${this.shipData.name} (${getOrdinal(this.shipData.class)} rate) <small>${
            this.shipData.battleRating
        } battle rating`;
        text += "<br>";
        text += `${this.shipData.decks} decks (${Ship.getCannonsPerDeck(this.shipData.healthInfo)} cannons)`;
        text += "<br>";
        text += `Minimal speed: ${this.shipData.minSpeed.toFixed(2)}, maximal speed: ${this.shipData.maxSpeed.toFixed(
            2
        )} knots`;
        text += "<br>";
        text += `Turning speed: ${this.shipData.maxTurningSpeed.toFixed(2)}`;
        text += "<br>";
        text += `Armor: ${this.shipData.healthInfo.LeftArmor} sides, ${this.shipData.healthInfo.FrontArmor} front, ${
            this.shipData.healthInfo.BackArmor
        } back, ${this.shipData.healthInfo.InternalStructure} structure, ${this.shipData.healthInfo.Sails} sails, ${
            this.shipData.healthInfo.Pump
        } pump, ${this.shipData.healthInfo.Rudder} rudder`;
        text += "<br>";
        text += `${this.shipData.healthInfo.Crew} crew (${this.shipData.minCrewRequired} minimal)`;
        text += "<br>";
        text += `${this.shipData.maxWeight} hold in ${this.shipData.holdSize} compartments (${
            this.shipData.shipMass
        } ship mass)`;
        text += "</small>";

        p.html(text);
    }
}

class ShipComparison extends Ship {
    constructor(shipAData, shipBData, minSpeed, maxSpeed) {
        super("Compare", {}, minSpeed, maxSpeed);
        this.shipAData = shipAData;
        this.shipBData = shipBData;

        this.drawDifferenceProfile();
        this.printTextComparison();
    }

    drawDifferenceProfile() {
        const colorScale = d3ScaleLinear()
            .domain(["A", "B"])
            .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"]);

        const pie = d3Pie()
            .sort(null)
            .value(1);
        const arcsA = pie(this.shipAData.speedDegrees),
            arcsB = pie(this.shipBData.speedDegrees);
        const curve = d3CurveCatmullRomClosed,
            lineA = d3RadialLine()
                .angle((d, i) => i * this.segmentRadians)
                .radius(d => this.radiusScaleAbsolute(d.data))
                .curve(curve),
            lineB = d3RadialLine()
                .angle((d, i) => i * this.segmentRadians)
                .radius(d => this.radiusScaleAbsolute(d.data))
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

    printTextComparison() {
        function getDiff(a, b, decimals = 0) {
            let text = "<span class='";
            text += a < b ? "mm" : "pp";
            text += `'>${(a - b).toFixed(decimals)}</span>`;
            return text;
        }
        const p = d3Select(`${this.select} p`);
        let text = "";
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
        console.log(ship);
        text += `${this.shipAData.name} (compared to ${this.shipBData.name}) <small>${ship.battleRating} battle rating`;
        text += "<br>";
        text += `${ship.decks} decks (${Ship.getCannonsPerDeck(ship.healthInfo)} cannons)`;
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

export default class ShipCompare {
    constructor(shipData) {
        this.shipData = shipData;
        this.shipSelectData = this.shipData.map(ship => ({ id: ship.id, name: ship.name })).sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
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
        const options = `<option value="" data-id="0">Select a ship</option>${this.shipSelectData
            .map(ship => `<option value="${ship.id}">${ship.name}</option>`)
            .join("")}`;
        select.append(options);
    }

    setupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.change(() => {
            const shipId = +select.val();
            const shipData = this.shipData.filter(ship => ship.id === shipId)[0];
            this.ship[compareId] = new ShipStandard(compareId, shipData, this.minSpeed, this.maxSpeed);
            this.shipCompare();
        });
    }

    shipCompare() {
        if (!isEmpty(this.ship.A) && !isEmpty(this.ship.B)) {
            this.ship.Compare = new ShipComparison(
                this.ship.A.shipData,
                this.ship.B.shipData,
                this.minSpeed,
                this.maxSpeed
            );
        }
    }
}
