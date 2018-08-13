/**
 * This file is part of na-map.
 *
 * @file      Ship comparison.
 * @module    ship-compare
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

import { formatInt, formatFloat, getOrdinal, isEmpty } from "./util";
import { registerEvent } from "./analytics";

const numSegments = 24,
    segmentRadians = (2 * Math.PI) / numSegments,
    hullRepairsFactor = 500,
    rigRepairsFactor = 400,
    rumRepairsFactor = 4;

/**
 * Ship
 */
class Ship {
    /**
     * @param {number} id - ship id
     * @param {Object} shipData - ship data
     */
    constructor(id, shipData) {
        this._id = id;
        this._shipData = shipData;

        this._select = `#ship-${this._id}`;

        this._setupSvg();
        this._g = d3.select(this._select).select("g");
        this._setCompass();
    }

    _setupSvg() {
        d3.select(`${this._select} svg`).remove();
        d3.select(this._select)
            .append("svg")
            .attr("width", this._shipData.svgWidth)
            .attr("height", this._shipData.svgHeight)
            .attr("class", "profile")
            .attr("fill", "none")
            .append("g")
            .attr("transform", `translate(${this._shipData.svgWidth / 2}, ${this._shipData.svgHeight / 2})`);
        d3.select(`${this._select} div`).remove();
        d3.select(this._select)
            .append("div")
            .classed("block", true);
    }

    _setCompass() {
        // Compass
        const data = new Array(numSegments / 2);
        data.fill(1, 0);
        const pie = d3
            .pie()
            .sort(null)
            .value(1)(data);

        const arc = d3
            .arc()
            .outerRadius(this._shipData.radiusScaleAbsolute(12))
            .innerRadius(this._shipData.innerRadius);

        const g = this._g
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
        let s = `${gunsPerDeck[0]}\u00a0${Ship.pd(deckClassLimit[0])}`,
            br = "";
        for (let i = 1; i < 4; i += 1) {
            if (gunsPerDeck[i]) {
                s = `${gunsPerDeck[i]}\u00a0${Ship.pd(deckClassLimit[i])}\u202f<br>${s}`;
            } else {
                br = `${br}<br>`;
            }
        }
        return [s, br];
    }

    static getText(ship) {
        let row = 0;
        /**
         * HTML format the first column
         * @param {string} element - Ship element
         * @return {string} HTML formatted column
         */
        function displayFirstColumn(element) {
            row += 1;
            return `<div class="row small ${row % 2 ? "light" : ""}"><div class="col-3">${element}</div>`;
        }

        /**
         * HTML format a single column
         * @param {string} element - Ship element
         * @param {string} description - Element description
         * @param {number} col - Number of columns
         * @return {string} HTML formatted column
         */
        function displayColumn(element, description, col = 6) {
            let elementText = "",
                br = "";

            if (element === "cannonsPerDeck") {
                [elementText, br] = ship[element];
                br = `<br>${br}`;
            } else {
                elementText = element !== "" ? ship[element] : "";
            }
            return `<div class="col-${col}">${elementText}<br><span class="des">${description}</span>${br}</div>`;
        }

        function displaySecondBlock() {
            return '<div class="col-9"><div class="row no-gutters">';
        }

        let text = "";

        text += displayFirstColumn(ship.shipRating);
        text += displaySecondBlock();
        text += displayColumn("battleRating", "Battle rating");
        text += displayColumn("guns", "Cannons");
        text += displayColumn("upgradeXP", "Knowledge XP");
        text += displayColumn("waterlineHeight", "Water line");
        text += "</div></div></div>";

        text += displayFirstColumn(ship.decks);
        text += displaySecondBlock();
        text += displayColumn("cannonsPerDeck", "Gun decks");
        text += displayColumn("firezoneHorizontalWidth", "Firezone horizontal width");
        text += "</div></div></div>";

        text += displayFirstColumn("Broadside (pd)");
        text += displaySecondBlock();
        text += displayColumn("cannonBroadside", "Cannons");
        text += displayColumn("carroBroadside", "Carronades");
        text += "</div></div></div>";

        text += displayFirstColumn("Chasers");
        text += displaySecondBlock();
        text += displayColumn("gunsFront", "Bow");
        text += displayColumn("gunsBack", "Stern");
        text += "</div></div></div>";

        text += displayFirstColumn("Speed");
        text += displaySecondBlock();
        text += displayColumn("maxSpeed", "Maximum");
        text += displayColumn("", "");
        text += displayColumn("acceleration", "Acceleration");
        text += displayColumn("deceleration", "Deceleration");
        text += displayColumn("maxTurningSpeed", "Turn speed");
        text += displayColumn("halfturnTime", "Rudder half time");
        text += "</div></div></div>";

        text += displayFirstColumn('Armour <span class="badge badge-light">Thickness</span>');
        text += displaySecondBlock();
        text += displayColumn("sideArmor", "Sides");
        text += displayColumn("structure", "Hull");
        text += displayColumn("frontArmor", "Bow");
        text += displayColumn("backArmor", "Stern");
        text += displayColumn("pump", "Pump");
        text += displayColumn("rudder", "Rudder");
        text += "</div></div></div>";

        text += displayFirstColumn('Masts <span class="badge badge-light">Thickness</span>');
        text += displaySecondBlock();
        text += displayColumn("sails", "Sails");
        text += displayColumn("mastBottomArmor", "Bottom");
        text += displayColumn("mastMiddleArmor", "Middle");
        text += displayColumn("mastTopArmor", "Top");
        text += "</div></div></div>";

        text += displayFirstColumn("Crew");
        text += displaySecondBlock();
        text += displayColumn("minCrew", "Minimum", 4);
        text += displayColumn("sailingCrew", "Sailing", 4);
        text += displayColumn("maxCrew", "Maximum", 4);
        text += "</div></div></div>";

        text += displayFirstColumn("Repairs needed");
        text += displaySecondBlock();
        text += displayColumn("hullRepair", "Hull", 4);
        text += displayColumn("rigRepair", "Rig", 4);
        text += displayColumn("rumRepair", "Rum", 4);
        text += "</div></div></div>";

        text += displayFirstColumn("Repair time");
        text += displaySecondBlock();
        text += displayColumn("sidesRepair", "Sides", 4);
        text += displayColumn("structureRepair", "Hull", 4);
        text += displayColumn("bowRepair", "Bow", 4);
        text += displayColumn("sternRepair", "Stern", 4);
        text += displayColumn("sailsRepair", "Sails", 4);
        text += displayColumn("rudderRepair", "Rudder", 4);
        text += "</div></div></div>";

        text += displayFirstColumn("Hold");
        text += displaySecondBlock();
        text += displayColumn("maxWeight", "Tons");
        text += displayColumn("holdSize", "Cargo slots");
        text += "</div></div></div>";

        text += "</div>";
        return text;
    }
}

/**
 * Base ship for comparison (displayed on the left side)
 * @extends Ship
 */
class ShipBase extends Ship {
    /**
     * @param {number} id - Ship id
     * @param {Object} shipData - Ship data
     * @param {Object} shipCompareData - Ship data of the ship to be compared to
     */
    constructor(id, shipData, shipCompareData) {
        super(id, shipCompareData);

        this._shipData = shipData;
        this._shipCompareData = shipCompareData;

        this._setBackground();
        this._setBackgroundGradient();
        this._drawProfile();
        this._printText();
    }

    _setBackground() {
        // Arc for text
        const knotsArc = d3
            .arc()
            .outerRadius(d => this._shipCompareData.radiusScaleAbsolute(d) + 2)
            .innerRadius(d => this._shipCompareData.radiusScaleAbsolute(d) + 1)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        // Tick/Grid data
        const ticks = [12, 8, 4, 0];
        const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

        // Add the circles for each tick
        this._g
            .selectAll(".circle")
            .data(ticks)
            .enter()
            .append("circle")
            .attr("class", "knots-circle")
            .attr("r", d => this._shipCompareData.radiusScaleAbsolute(d));

        // Add the paths for the text
        this._g
            .selectAll(".label")
            .data(ticks)
            .enter()
            .append("path")
            .attr("d", knotsArc)
            .attr("id", (d, i) => `tick${i}`);

        // And add the text
        this._g
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

    _setBackgroundGradient() {
        // Extra scale since the color scale is interpolated
        const gradientScale = d3
            .scaleLinear()
            .domain([this._shipData.speed.min, this._shipData.speed.max])
            .range([0, this._shipCompareData.svgWidth]);

        // Calculate the variables for the gradient
        const numStops = 30;
        const gradientDomain = gradientScale.domain();
        gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
        const gradientPoint = [];
        for (let i = 0; i < numStops; i += 1) {
            gradientPoint.push((i * gradientDomain[2]) / (numStops - 1) + gradientDomain[0]);
        }

        // Create the gradient
        this._g
            .append("defs")
            .append("radialGradient")
            .attr("id", "gradient")
            .attr("cx", 0.5)
            .attr("cy", 0.25)
            .attr("r", 0.5)
            .selectAll("stop")
            .data(d3.range(numStops))
            .enter()
            .append("stop")
            .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / this._shipCompareData.svgWidth)
            .attr("stop-color", (d, i) => this._shipCompareData.colorScale(gradientPoint[i]));
    }

    _drawProfile() {
        const pie = d3
            .pie()
            .sort(null)
            .value(1);

        const arcs = pie(this._shipData.speedDegrees);

        const curve = d3.curveCatmullRomClosed,
            line = d3
                .radialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this._shipCompareData.radiusScaleAbsolute(d.data))
                .curve(curve);

        const profile = this._g.append("path");
        const markers = this._g.append("g").classed("markers", true);
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
            .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompareData.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompareData.radiusScaleAbsolute(d.data))
            .attr("fill", d => this._shipCompareData.colorScale(d.data))
            .style("opacity", 0.5)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);
    }

    _printText() {
        const cannonsPerDeck = Ship.getCannonsPerDeck(this._shipData.deckClassLimit, this._shipData.gunsPerDeck),
            ship = {
                shipRating: `${getOrdinal(this._shipData.class)} rate`,
                battleRating: this._shipData.battleRating,
                guns: this._shipData.guns,
                decks: `${this._shipData.decks} deck${this._shipData.decks > 1 ? "s" : ""}`,
                additionalRow: `${this._shipData.decks < 4 ? "<br>\u00a0" : ""}`,
                cannonsPerDeck,
                cannonBroadside: formatInt(this._shipData.broadside.cannons),
                carroBroadside: formatInt(this._shipData.broadside.carronades),
                gunsFront: this._shipData.gunsPerDeck[4],
                limitFront: this._shipData.deckClassLimit[4],
                gunsBack: this._shipData.gunsPerDeck[5],
                limitBack: this._shipData.deckClassLimit[5],
                firezoneHorizontalWidth: this._shipData.ship.firezoneHorizontalWidth,
                waterlineHeight: formatFloat(this._shipData.ship.waterlineHeight),
                maxSpeed: formatFloat(this._shipData.ship.maxSpeed, 3),
                acceleration: formatFloat(this._shipData.ship.acceleration),
                deceleration: formatFloat(this._shipData.ship.deceleration),
                maxTurningSpeed: formatFloat(this._shipData.rudder.turnSpeed),
                halfturnTime: formatFloat(this._shipData.rudder.halfturnTime),
                sideArmor: `${formatInt(this._shipData.sides.armour)}\u00a0<span class="badge badge-light">${formatInt(
                    this._shipData.sides.thickness
                )}</span>`,
                frontArmor: `${formatInt(this._shipData.bow.armour)}\u00a0<span class="badge badge-light">${formatInt(
                    this._shipData.bow.thickness
                )}</span>`,
                pump: formatInt(this._shipData.pump.armour),
                sails: formatInt(this._shipData.sails.armour),
                structure: formatInt(this._shipData.structure.armour),
                backArmor: `${formatInt(this._shipData.stern.armour)}\u00a0<span class="badge badge-light">${formatInt(
                    this._shipData.stern.thickness
                )}</span>`,
                rudder: `${formatInt(this._shipData.rudder.armour)}\u00a0<span class="badge badge-light">${formatInt(
                    this._shipData.rudder.thickness
                )}</span>`,
                minCrew: formatInt(this._shipData.crew.min),
                maxCrew: formatInt(this._shipData.crew.max),
                sailingCrew: formatInt(this._shipData.crew.sailing),
                maxWeight: formatInt(this._shipData.maxWeight),
                holdSize: formatInt(this._shipData.holdSize),
                upgradeXP: formatInt(this._shipData.upgradeXP),
                sternRepair: formatInt(this._shipData.repairTime.stern),
                bowRepair: formatInt(this._shipData.repairTime.bow),
                sidesRepair: formatInt(this._shipData.repairTime.sides),
                rudderRepair: formatInt(this._shipData.repairTime.rudder),
                sailsRepair: formatInt(this._shipData.repairTime.sails),
                structureRepair: formatInt(this._shipData.repairTime.structure),
                hullRepair: `${formatInt(this._shipData.sides.armour / hullRepairsFactor)}`,
                rigRepair: `${formatInt(this._shipData.sails.armour / rigRepairsFactor)}`,
                rumRepair: `${formatInt(this._shipData.crew.max / rumRepairsFactor)}`,
                mastBottomArmor: `${formatInt(
                    this._shipData.mast.bottomArmour
                )}\u00a0<span class="badge badge-light">${formatInt(this._shipData.mast.bottomThickness)}</span>`,
                mastMiddleArmor: `${formatInt(
                    this._shipData.mast.middleArmour
                )}\u00a0<span class="badge badge-light">${formatInt(this._shipData.mast.middleThickness)}</span>`,
                mastTopArmor: `${formatInt(
                    this._shipData.mast.topArmour
                )}\u00a0<span class="badge badge-light">${formatInt(this._shipData.mast.topThickness)}</span>`
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

        $(`${this._select}`)
            .find("div")
            .append(Ship.getText(ship));
    }
}

/**
 * ship comparison
 * @extends Ship
 */
class ShipComparison extends Ship {
    constructor(compareId, shipBaseData, shipCompareData, shipCompare) {
        super(compareId, shipCompare);

        this._shipBaseData = shipBaseData;
        this._shipCompareData = shipCompareData;
        this._shipCompare = shipCompare;

        this._drawDifferenceProfile();
        this._printTextComparison();
    }

    _drawDifferenceProfile() {
        const pie = d3
            .pie()
            .sort(null)
            .value(1);
        const arcsBase = pie(this._shipBaseData.speedDegrees),
            arcsComp = pie(this._shipCompareData.speedDegrees);
        const curve = d3.curveCatmullRomClosed,
            lineBase = d3
                .radialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this._shipCompare.radiusScaleAbsolute(d.data))
                .curve(curve),
            lineB = d3
                .radialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this._shipCompare.radiusScaleAbsolute(d.data))
                .curve(curve);

        const pathComp = this._g.append("path"),
            markersComp = this._g.append("g").attr("class", "markers"),
            pathBase = this._g.append("path"),
            markersBase = this._g.append("g").attr("class", "markers");

        const speedDiff = [];
        this._shipBaseData.speedDegrees.forEach((speedShipBase, i) => {
            speedDiff.push(speedShipBase - this._shipCompareData.speedDegrees[i]);
        });
        const colourScale = d3
            .scaleLinear()
            .domain([Math.min(-0.01, d3.min(speedDiff)), 0, Math.max(0.01, d3.max(speedDiff))])
            .range(["#a62e39", "#fbf8f5", "#419f57"])
            .interpolate(d3.interpolateHcl);

        pathBase.attr("d", lineBase(arcsBase)).classed("base", true);
        const selBase = markersBase.selectAll("circle").data(arcsBase);
        selBase
            .enter()
            .append("circle")
            .merge(selBase)
            .attr("r", "5")
            .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("fill", (d, i) => colourScale(speedDiff[i]))
            .classed("base", true)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);

        pathComp.attr("d", lineB(arcsComp)).classed("comp", true);

        const selComp = markersComp.selectAll("circle").data(arcsComp);
        selComp
            .enter()
            .append("circle")
            .merge(selComp)
            .attr("r", "5")
            .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusScaleAbsolute(d.data))
            .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusScaleAbsolute(d.data))
            .classed("comp", true)
            .append("title")
            .text(d => `${Math.round(d.data * 10) / 10} knots`);
    }

    _printTextComparison() {
        function getDiff(a, b, decimals = 0) {
            const diff = parseFloat((a - b).toFixed(decimals));

            if (diff < 0) {
                return `<span class="badge badge-danger">${formatFloat(Math.abs(diff))}</span>`;
            }
            if (diff > 0) {
                return `<span class="badge badge-success">${formatFloat(diff)}</span>`;
            }
            return "";
        }

        const ship = {
            shipRating: `${getOrdinal(this._shipCompareData.class)} rate`,
            battleRating: `${this._shipCompareData.battleRating}\u00a0${getDiff(
                this._shipCompareData.battleRating,
                this._shipBaseData.battleRating
            )}`,
            guns: `${this._shipCompareData.guns}\u00a0${getDiff(this._shipCompareData.guns, this._shipBaseData.guns)}`,
            decks: `${this._shipCompareData.decks} deck${this._shipCompareData.decks > 1 ? "s" : ""}\u00a0${getDiff(
                this._shipCompareData.decks,
                this._shipBaseData.decks
            )}`,
            additionalRow: `${this._shipCompareData.decks < 4 ? "<br>\u00a0" : ""}`,
            cannonsPerDeck: Ship.getCannonsPerDeck(
                this._shipCompareData.deckClassLimit,
                this._shipCompareData.gunsPerDeck
            ),
            cannonBroadside: `${this._shipCompareData.broadside.cannons}\u00a0${getDiff(
                this._shipCompareData.broadside.cannons,
                this._shipBaseData.broadside.cannons
            )}`,
            carroBroadside: `${this._shipCompareData.broadside.carronades}\u00a0${getDiff(
                this._shipCompareData.broadside.carronades,
                this._shipBaseData.broadside.carronades
            )}`,
            gunsFront: this._shipCompareData.gunsPerDeck[4],
            limitFront: this._shipCompareData.deckClassLimit[4],
            gunsBack: this._shipCompareData.gunsPerDeck[5],
            limitBack: this._shipCompareData.deckClassLimit[5],
            minSpeed: `${formatFloat(this._shipCompareData.speed.min)}\u00a0${getDiff(
                this._shipCompareData.speed.min,
                this._shipBaseData.speed.min,
                2
            )}`,
            maxSpeed: `${formatFloat(this._shipCompareData.ship.maxSpeed, 3)}\u00a0${getDiff(
                this._shipCompareData.ship.maxSpeed,
                this._shipBaseData.ship.maxSpeed,
                2
            )}`,
            maxTurningSpeed: `${formatFloat(this._shipCompareData.rudder.turnSpeed)}\u00a0${getDiff(
                this._shipCompareData.rudder.turnSpeed,
                this._shipBaseData.rudder.turnSpeed,
                2
            )}`,
            firezoneHorizontalWidth: `${this._shipCompareData.ship.firezoneHorizontalWidth}\u00a0${getDiff(
                this._shipCompareData.ship.firezoneHorizontalWidth,
                this._shipBaseData.ship.firezoneHorizontalWidth
            )}`,
            waterlineHeight: `${formatFloat(this._shipCompareData.ship.waterlineHeight)}\u00a0${getDiff(
                this._shipCompareData.ship.waterlineHeight,
                this._shipBaseData.ship.waterlineHeight,
                2
            )}`,
            acceleration: `${formatFloat(this._shipCompareData.ship.acceleration)}\u00a0${getDiff(
                this._shipCompareData.ship.acceleration,
                this._shipBaseData.ship.acceleration,
                2
            )}`,
            deceleration: `${formatFloat(this._shipCompareData.ship.deceleration)}\u00a0${getDiff(
                this._shipCompareData.ship.deceleration,
                this._shipBaseData.ship.deceleration,
                2
            )}`,
            halfturnTime: `${formatFloat(this._shipCompareData.rudder.halfturnTime)}\u00a0${getDiff(
                this._shipCompareData.rudder.halfturnTime,
                this._shipBaseData.rudder.halfturnTime
            )}`,

            sideArmor: `${formatInt(
                this._shipCompareData.sides.armour
            )}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.sides.thickness
            )}</span>\u00a0${getDiff(this._shipCompareData.sides.armour, this._shipBaseData.sides.armour)}`,
            frontArmor: `${formatInt(
                this._shipCompareData.bow.armour
            )}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.bow.thickness
            )}</span>\u00a0${getDiff(this._shipCompareData.bow.armour, this._shipBaseData.bow.armour)}`,
            pump: `${formatInt(this._shipCompareData.pump.armour)}\u00a0${getDiff(
                this._shipCompareData.pump.armour,
                this._shipBaseData.pump.armour
            )}`,
            sails: `${formatInt(this._shipCompareData.sails.armour)}\u00a0${getDiff(
                this._shipCompareData.sails.armour,
                this._shipBaseData.sails.armour
            )}`,
            structure: `${formatInt(this._shipCompareData.structure.armour)}\u00a0${getDiff(
                this._shipCompareData.structure.armour,
                this._shipBaseData.structure.armour
            )}`,
            backArmor: `${formatInt(
                this._shipCompareData.stern.armour
            )}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.stern.thickness
            )}</span>\u00a0${getDiff(this._shipCompareData.stern.armour, this._shipBaseData.stern.armour)}`,
            rudder: `${formatInt(this._shipCompareData.rudder.armour)}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.rudder.thickness
            )}</span>\u00a0${getDiff(this._shipCompareData.rudder.armour, this._shipBaseData.rudder.armour)}`,
            minCrew: `${formatInt(this._shipCompareData.crew.min)}\u00a0${getDiff(
                this._shipCompareData.crew.min,
                this._shipBaseData.crew.min
            )}`,
            maxCrew: `${formatInt(this._shipCompareData.crew.max)}\u00a0${getDiff(
                this._shipCompareData.crew.max,
                this._shipBaseData.crew.max
            )}`,
            sailingCrew: `${formatInt(this._shipCompareData.crew.sailing)}\u00a0${getDiff(
                this._shipCompareData.crew.sailing,
                this._shipBaseData.crew.sailing
            )}`,
            maxWeight: `${formatInt(this._shipCompareData.maxWeight)}\u00a0${getDiff(
                this._shipCompareData.maxWeight,
                this._shipBaseData.maxWeight
            )}`,
            holdSize: `${formatInt(this._shipCompareData.holdSize)}\u00a0${getDiff(
                this._shipCompareData.holdSize,
                this._shipBaseData.holdSize
            )}`,
            upgradeXP: `${formatInt(this._shipCompareData.upgradeXP)}\u00a0${getDiff(
                this._shipCompareData.upgradeXP,
                this._shipBaseData.upgradeXP
            )}`,
            sternRepair: `${formatInt(this._shipCompareData.repairTime.stern)}\u00a0${getDiff(
                this._shipCompareData.repairTime.stern,
                this._shipBaseData.repairTime.stern
            )}`,
            bowRepair: `${formatInt(this._shipCompareData.repairTime.bow)}\u00a0${getDiff(
                this._shipCompareData.repairTime.bow,
                this._shipBaseData.repairTime.bow
            )}`,
            sidesRepair: `${formatInt(this._shipCompareData.repairTime.sides)}\u00a0${getDiff(
                this._shipCompareData.repairTime.sides,
                this._shipBaseData.repairTime.sides
            )}`,
            rudderRepair: `${formatInt(this._shipCompareData.repairTime.rudder)}\u00a0${getDiff(
                this._shipCompareData.repairTime.rudder,
                this._shipBaseData.repairTime.rudder
            )}`,
            sailsRepair: `${formatInt(this._shipCompareData.repairTime.sails)}\u00a0${getDiff(
                this._shipCompareData.repairTime.sails,
                this._shipBaseData.repairTime.sails
            )}`,
            structureRepair: `${formatInt(this._shipCompareData.repairTime.structure)}\u00a0${getDiff(
                this._shipCompareData.repairTime.structure,
                this._shipBaseData.repairTime.structure
            )}`,
            hullRepair: `${formatInt(this._shipCompareData.sides.armour / hullRepairsFactor)}\u00a0${getDiff(
                this._shipCompareData.sides.armour / hullRepairsFactor,
                this._shipBaseData.sides.armour / hullRepairsFactor
            )}`,
            rigRepair: `${formatInt(this._shipCompareData.sails.armour / rigRepairsFactor)}\u00a0${getDiff(
                this._shipCompareData.sails.armour / rigRepairsFactor,
                this._shipBaseData.sails.armour / rigRepairsFactor
            )}`,
            rumRepair: `${formatInt(this._shipCompareData.crew.max / rumRepairsFactor)}\u00a0${getDiff(
                this._shipCompareData.crew.max / rumRepairsFactor,
                this._shipBaseData.crew.max / rumRepairsFactor
            )}`,
            mastBottomArmor: `${formatInt(this._shipCompareData.mast.bottomArmour)}\u00a0${getDiff(
                this._shipCompareData.mast.bottomArmour,
                this._shipBaseData.mast.bottomArmour
            )}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.mast.bottomThickness
            )}</span>\u00a0${getDiff(
                this._shipCompareData.mast.bottomThickness,
                this._shipBaseData.mast.bottomThickness
            )}`,
            mastMiddleArmor: `${formatInt(this._shipCompareData.mast.middleArmour)}\u00a0${getDiff(
                this._shipCompareData.mast.middleArmour,
                this._shipBaseData.mast.middleArmour
            )}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.mast.middleThickness
            )}</span>\u00a0${getDiff(
                this._shipCompareData.mast.middleThickness,
                this._shipBaseData.mast.middleThickness
            )}`,
            mastTopArmor: `${formatInt(this._shipCompareData.mast.topArmour)}\u00a0${getDiff(
                this._shipCompareData.mast.topArmour,
                this._shipBaseData.mast.topArmour
            )}\u00a0<span class="badge badge-light">${formatInt(
                this._shipCompareData.mast.topThickness
            )}</span>\u00a0${getDiff(this._shipCompareData.mast.topThickness, this._shipBaseData.mast.topThickness)}`
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

        $(`${this._select}`)
            .find("div")
            .append(Ship.getText(ship));
    }
}

export default class ShipCompare {
    constructor(shipData) {
        this._shipData = shipData;
        this._ships = { Base: {}, C1: {}, C2: {} };
        this._minSpeed = d3.min(this._shipData, d => d.speed.min);
        this._maxSpeed = d3.max(this._shipData, d => d.speed.max);
        this.colorScale = d3
            .scaleLinear()
            .domain([this._minSpeed, 0, 4, 8, 12, this._maxSpeed])
            .range(["#a62e39", "#fbf8f5", "#a4dab0", "#6cc380", "#419f57"])
            .interpolate(d3.interpolateHcl);

        this._setupData();
        this._setupListener();
        ["Base", "C1", "C2"].forEach(compareId => {
            this._setupShipSelect(compareId);
            this._setupSetupListener(compareId);
        });
    }

    _setupData() {
        this._shipSelectData = d3
            .nest()
            .key(ship => ship.class)
            .sortKeys(d3.ascending)
            .entries(
                this._shipData
                    .map(ship => ({
                        id: ship.id,
                        name: ship.name,
                        class: ship.class,
                        battleRating: ship.battleRating,
                        guns: ship.guns
                    }))
                    .sort((a, b) => {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    })
            );
        this._options = this._shipSelectData
            .map(
                key =>
                    `<optgroup label="${getOrdinal(key.key)} rate">${key.values
                        .map(
                            ship =>
                                `<option data-subtext="${ship.battleRating}" value="${ship.id}">${ship.name} (${
                                    ship.guns
                                })`
                        )
                        .join("</option>")}`
            )
            .join("</optgroup>");
    }

    _shipCompareSelected() {
        $("#modal-ships").modal("show");
        this.svgWidth = parseInt($("#modal-ships .columnA").width(), 10);
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth;
        this._outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2);
        this.innerRadius = Math.floor(this._outerRadius * 0.3);
        this.radiusScaleAbsolute = d3
            .scaleLinear()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([10, this.innerRadius, this._outerRadius]);
    }

    _setupListener() {
        $("#button-ship-compare").on("click", event => {
            registerEvent("Tools", "Compare ships");
            event.stopPropagation();
            this._shipCompareSelected();
        });
    }

    _setupShipSelect(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select.append(this._options);
        if (compareId !== "Base") {
            select.attr("disabled", "disabled");
        }
    }

    _setupSetupListener(compareId) {
        const select = $(`#ship-${compareId}-select`);
        select
            .addClass("selectpicker")
            .on("change", () => {
                const shipId = +select.val();
                const singleShipData = this._shipData.filter(ship => ship.id === shipId)[0];
                if (compareId === "Base") {
                    this._ships[compareId] = new ShipBase(compareId, singleShipData, this);
                    ["C1", "C2"].forEach(id => {
                        $(`#ship-${id}-select`)
                            .removeAttr("disabled")
                            .selectpicker("refresh");
                        if (!isEmpty(this._ships[id])) {
                            this._ships[id] = new ShipComparison(
                                id,
                                singleShipData,
                                this._ships[id]._shipCompareData,
                                this
                            );
                        }
                    });
                } else {
                    this._ships[compareId] = new ShipComparison(
                        compareId,
                        this._ships.Base._shipData,
                        singleShipData,
                        this
                    );
                }
            })
            .selectpicker({ noneSelectedText: "Select ship" });
    }
}
