/**
 * This file is part of na-map.
 *
 * @file      Compare ships.
 * @module    game-tools/compare-ships
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { ascending as d3Ascending, min as d3Min, range as d3Range } from "d3-array";
import { nest as d3Nest } from "d3-collection";
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";
import {
    arc as d3Arc,
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    radialLine as d3RadialLine
} from "d3-shape";

import { registerEvent } from "../analytics";
import {
    appVersion,
    colourRed,
    colourRedDark,
    colourWhite,
    colourGreen,
    colourGreenDark,
    hashids,
    insertBaseModal
} from "../common";
import { copyToClipboard, formatInt, formatFloat, getOrdinal, isEmpty, roundToThousands, sortBy } from "../util";

import CompareWoods from "./compare-woods";

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

        this._select = `#ship-compare-${this._id}`;

        this._setupSvg();
        this._g = d3Select(this._select).select("g");
        this._setCompass();
    }

    /**
     * Setup svg
     * @returns {void}
     */
    _setupSvg() {
        const element = d3Select(this.select);

        d3Select(`${this.select} svg`).remove();

        element
            .append("svg")
            .attr("width", this.shipData.svgWidth)
            .attr("height", this.shipData.svgHeight)
            .attr("class", "profile")
            .attr("fill", "none")
            .append("g")
            .attr("transform", `translate(${this.shipData.svgWidth / 2}, ${this.shipData.svgHeight / 2})`);
        d3Select(`${this.select} div`).remove();

        element.append("div").classed("block", true);
    }

    /**
     * Set compass
     * @returns {void}
     */
    _setCompass() {
        // Compass
        const data = new Array(numSegments / 2);
        data.fill(1, 0);
        const pie = d3Pie()
            .sort(null)
            .value(1)(data);

        const arc = d3Arc()
            .outerRadius(this.shipData.radiusScaleAbsolute(12))
            .innerRadius(this.shipData.innerRadius);

        const g = this.g
            .selectAll(".compass-arc")
            .data(pie)
            .join(enter => enter.append("g").attr("class", "compass-arc"));

        g.append("path").attr("d", arc);

        this.g
            .append("line")
            .attr("x1", 0)
            .attr("y1", -160)
            .attr("x2", 0)
            .attr("y2", -79)
            .attr("marker-end", "url(#course-arrow)");
    }

    /**
     * Format cannon pound value
     * @param {number[]} limit Upper limit for [0] cannon and [1] carronades
     */
    static pd(limit) {
        let s = `<span class="badge badge-white">${limit[0]}\u202f/\u202f`;
        if (limit[1]) {
            s += `${limit[1]}`;
        } else {
            s += "\u2013";
        }
        s += "\u202fpd</span>";
        return s;
    }

    /**
     * Format cannon/carronade upper limit classes
     * @param {number[]} deckClassLimit - Limit per deck
     * @param {number[]} gunsPerDeck - Guns per deck
     * @returns {string[]} Formatted string [0] limits and [1] possibly empty lines at the bottom
     */
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

    /**
     * Get HTML formatted data for a single ship
     * @param {Object} ship - Ship data
     * @return {string} HTML formatted column
     */
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

        /**
         * HTML format head of second block
         * @return {string} HTML formatted block head
         */
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

        text += displayFirstColumn('Armour <span class="badge badge-white">Thickness</span>');
        text += displaySecondBlock();
        text += displayColumn("sideArmor", "Sides");
        text += displayColumn("structure", "Hull");
        text += displayColumn("frontArmor", "Bow");
        text += displayColumn("backArmor", "Stern");
        text += displayColumn("pump", "Pump");
        text += displayColumn("rudder", "Rudder");
        text += "</div></div></div>";

        text += displayFirstColumn('Masts <span class="badge badge-white">Thickness</span>');
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

        text += displayFirstColumn("Resistance");
        text += displaySecondBlock();
        text += displayColumn("fireResistance", "Fire", 3);
        text += displayColumn("leakResistance", "Leaks", 3);
        text += displayColumn("crewProtection", "Crew Protection", 6);
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

    get id() {
        return this._id;
    }

    get shipData() {
        return this._shipData;
    }

    get select() {
        return this._select;
    }

    get g() {
        return this._g;
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

    /**
     * Set coloroured Background
     * @returns {void}
     */
    _setBackground() {
        // Arc for text
        const knotsArc = d3Arc()
            .outerRadius(d => this.shipCompareData.radiusScaleAbsolute(d) + 2)
            .innerRadius(d => this.shipCompareData.radiusScaleAbsolute(d) + 1)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        // Tick/DisplayGrid data
        const ticks = [12, 8, 4, 0];
        const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

        // Add the circles for each tick
        this.g
            .selectAll(".circle")
            .data(ticks)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("class", "knots-circle")
                    .attr("r", d => this.shipCompareData.radiusScaleAbsolute(d))
            );

        // Add the paths for the text
        this.g
            .selectAll(".label")
            .data(ticks)
            .join(enter =>
                enter
                    .append("path")
                    .attr("d", knotsArc)
                    .attr("id", (d, i) => `tick${i}`)
            );

        // And add the text
        this.g
            .selectAll(".label")
            .data(ticks)
            .join(enter =>
                enter
                    .append("text")
                    .attr("class", "knots-text")
                    .append("textPath")
                    .attr("href", (d, i) => `#tick${i}`)
                    .text((d, i) => tickLabels[i])
                    .attr("startOffset", "16%")
            );
    }

    /**
     * Set Background gradient
     * @returns {void}
     */
    _setBackgroundGradient() {
        // Extra scale since the color scale is interpolated
        const gradientScale = d3ScaleLinear()
            .domain([this.shipData.speed.min, this.shipData.speed.max])
            .range([0, this.shipCompareData.svgWidth]);

        // Calculate the variables for the gradient
        const numStops = 30;
        const gradientDomain = gradientScale.domain();
        gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
        const gradientPoint = [];
        for (let i = 0; i < numStops; i += 1) {
            gradientPoint.push((i * gradientDomain[2]) / (numStops - 1) + gradientDomain[0]);
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
            .join(enter =>
                enter
                    .append("stop")
                    .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / this.shipCompareData.svgWidth)
                    .attr("stop-color", (d, i) => this.shipCompareData.colorScale(gradientPoint[i]))
            );
    }

    /**
     * Draw profile
     * @returns {void}
     */
    _drawProfile() {
        const pie = d3Pie()
            .sort(null)
            .value(1);

        const arcs = pie(this.shipData.speedDegrees);

        const curve = d3CurveCatmullRomClosed,
            line = d3RadialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this.shipCompareData.radiusScaleAbsolute(d.data))
                .curve(curve);

        const profile = this.g.append("path").classed("base", true);
        const markers = this.g.append("g").classed("markers", true);
        profile.attr("d", line(arcs));

        markers
            .selectAll("circle")
            .data(arcs)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr(
                        "cy",
                        (d, i) => Math.cos(i * segmentRadians) * -this.shipCompareData.radiusScaleAbsolute(d.data)
                    )
                    .attr(
                        "cx",
                        (d, i) => Math.sin(i * segmentRadians) * this.shipCompareData.radiusScaleAbsolute(d.data)
                    )
                    .attr("fill", d => this.shipCompareData.colorScale(d.data))
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`)
            );
    }

    /**
     * Print text
     * @returns {void}
     */
    _printText() {
        const cannonsPerDeck = Ship.getCannonsPerDeck(this.shipData.deckClassLimit, this.shipData.gunsPerDeck),
            ship = {
                shipRating: `${getOrdinal(this.shipData.class)} rate`,
                battleRating: this.shipData.battleRating,
                guns: this.shipData.guns,
                decks: `${this.shipData.decks} deck${this.shipData.decks > 1 ? "s" : ""}`,
                additionalRow: `${this.shipData.decks < 4 ? "<br>\u00a0" : ""}`,
                cannonsPerDeck,
                cannonBroadside: formatInt(this.shipData.broadside.cannons),
                carroBroadside: formatInt(this.shipData.broadside.carronades),
                gunsFront: this.shipData.gunsPerDeck[4],
                limitFront: this.shipData.deckClassLimit[4],
                gunsBack: this.shipData.gunsPerDeck[5],
                limitBack: this.shipData.deckClassLimit[5],
                firezoneHorizontalWidth: this.shipData.ship.firezoneHorizontalWidth,
                waterlineHeight: formatFloat(this.shipData.ship.waterlineHeight),
                maxSpeed: formatFloat(this.shipData.speed.max, 3),
                acceleration: formatFloat(this.shipData.ship.acceleration),
                deceleration: formatFloat(this.shipData.ship.deceleration),
                maxTurningSpeed: formatFloat(this.shipData.rudder.turnSpeed),
                halfturnTime: formatFloat(this.shipData.rudder.halfturnTime),
                sideArmor: `${formatInt(this.shipData.sides.armour)}\u00a0<span class="badge badge-white">${formatInt(
                    this.shipData.sides.thickness
                )}</span>`,
                frontArmor: `${formatInt(this.shipData.bow.armour)}\u00a0<span class="badge badge-white">${formatInt(
                    this.shipData.bow.thickness
                )}</span>`,
                pump: formatInt(this.shipData.pump.armour),
                sails: formatInt(this.shipData.sails.armour),
                structure: formatInt(this.shipData.structure.armour),
                backArmor: `${formatInt(this.shipData.stern.armour)}\u00a0<span class="badge badge-white">${formatInt(
                    this.shipData.stern.thickness
                )}</span>`,
                rudder: `${formatInt(this.shipData.rudder.armour)}\u00a0<span class="badge badge-white">${formatInt(
                    this.shipData.rudder.thickness
                )}</span>`,
                minCrew: formatInt(this.shipData.crew.min),
                maxCrew: formatInt(this.shipData.crew.max),
                sailingCrew: formatInt(this.shipData.crew.sailing),
                maxWeight: formatInt(this.shipData.maxWeight),
                holdSize: formatInt(this.shipData.holdSize),
                upgradeXP: formatInt(this.shipData.upgradeXP),
                sternRepair: formatInt(this.shipData.repairTime.stern),
                bowRepair: formatInt(this.shipData.repairTime.bow),
                sidesRepair: formatInt(this.shipData.repairTime.sides),
                rudderRepair: formatInt(this.shipData.repairTime.rudder),
                sailsRepair: formatInt(this.shipData.repairTime.sails),
                structureRepair: formatInt(this.shipData.repairTime.structure),
                hullRepair: `${formatInt(this.shipData.sides.armour / hullRepairsFactor)}`,
                rigRepair: `${formatInt(this.shipData.sails.armour / rigRepairsFactor)}`,
                rumRepair: `${formatInt(this.shipData.crew.max / rumRepairsFactor)}`,
                fireResistance: formatInt(this.shipData.resistance.fire),
                leakResistance: formatInt(this.shipData.resistance.leaks),
                crewProtection: formatInt(this.shipData.resistance.crew),
                mastBottomArmor: `${formatInt(
                    this.shipData.mast.bottomArmour
                )}\u00a0<span class="badge badge-white">${formatInt(this.shipData.mast.bottomThickness)}</span>`,
                mastMiddleArmor: `${formatInt(
                    this.shipData.mast.middleArmour
                )}\u00a0<span class="badge badge-white">${formatInt(this.shipData.mast.middleThickness)}</span>`,
                mastTopArmor: `${formatInt(
                    this.shipData.mast.topArmour
                )}\u00a0<span class="badge badge-white">${formatInt(this.shipData.mast.topThickness)}</span>`
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

    get shipData() {
        return this._shipData;
    }

    get shipCompareData() {
        return this._shipCompareData;
    }
}

/**
 * ship comparison
 * @extends Ship
 */
class ShipComparison extends Ship {
    /**
     * @param {number} compareId - Ship id
     * @param {Object} shipBaseData - Base ship data
     * @param {Object} shipCompareData - Ship data of the ship to be compared to
     * @param {Class} shipCompare - Class instance of the ship to be compared to
     */
    constructor(compareId, shipBaseData, shipCompareData, shipCompare) {
        super(compareId, shipCompare);

        this._shipBaseData = shipBaseData;
        this._shipCompareData = shipCompareData;
        this._shipCompare = shipCompare;

        this._drawDifferenceProfile();
        this._injectTextComparison();
    }

    /**
     * Draw difference profile
     * @returns {void}
     */
    _drawDifferenceProfile() {
        const pie = d3Pie()
            .sort(null)
            .value(1);
        const arcsComp = pie(this.shipCompareData.speedDegrees),
            arcsBase = pie(this.shipBaseData.speedDegrees);
        const curve = d3CurveCatmullRomClosed,
            line = d3RadialLine()
                .angle((d, i) => i * segmentRadians)
                .radius(d => this.shipCompare.radiusScaleAbsolute(d.data))
                .curve(curve);

        const pathComp = this.g.append("path"),
            pathBase = this.g.append("path"),
            pathMarkersComp = this.g.append("g").attr("class", "markers");

        const speedDiff = [];
        this.shipCompareData.speedDegrees.forEach((speedShipCompare, i) => {
            speedDiff.push(roundToThousands(speedShipCompare - this.shipBaseData.speedDegrees[i]));
        });
        const min = this._shipCompare._minSpeed,
            max = this._shipCompare._maxSpeed;
        const colourScale = d3ScaleLinear()
            .domain([min, -1, 0, 1, max])
            .range([colourRedDark, colourRed, colourWhite, colourGreen, colourGreenDark])
            .interpolate(d3InterpolateHcl);

        pathComp.attr("d", line(arcsComp)).classed("comp", true);

        pathMarkersComp
            .selectAll("circle")
            .data(arcsComp)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this.shipCompare.radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this.shipCompare.radiusScaleAbsolute(d.data))
                    .attr("fill", (d, i) => colourScale(speedDiff[i]))
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`)
            );

        pathBase.attr("d", line(arcsBase)).classed("base", true);
    }

    /**
     * Inject text comparison
     * @returns {void}
     */
    _injectTextComparison() {
        /**
         * HTML formatted difference
         * @param {number} a - First value
         * @param {number} b - Second value
         * @param {number} decimals - Number of decimals (default 0)
         * @returns {string} HTML formatted string
         */
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
            shipRating: `${getOrdinal(this.shipCompareData.class)} rate`,
            battleRating: `${this.shipCompareData.battleRating}\u00a0${getDiff(
                this.shipCompareData.battleRating,
                this.shipBaseData.battleRating
            )}`,
            guns: `${this.shipCompareData.guns}\u00a0${getDiff(this.shipCompareData.guns, this.shipBaseData.guns)}`,
            decks: `${this.shipCompareData.decks} deck${this.shipCompareData.decks > 1 ? "s" : ""}\u00a0${getDiff(
                this.shipCompareData.decks,
                this.shipBaseData.decks
            )}`,
            additionalRow: `${this.shipCompareData.decks < 4 ? "<br>\u00a0" : ""}`,
            cannonsPerDeck: Ship.getCannonsPerDeck(
                this.shipCompareData.deckClassLimit,
                this.shipCompareData.gunsPerDeck
            ),
            cannonBroadside: `${this.shipCompareData.broadside.cannons}\u00a0${getDiff(
                this.shipCompareData.broadside.cannons,
                this.shipBaseData.broadside.cannons
            )}`,
            carroBroadside: `${this.shipCompareData.broadside.carronades}\u00a0${getDiff(
                this.shipCompareData.broadside.carronades,
                this.shipBaseData.broadside.carronades
            )}`,
            gunsFront: this.shipCompareData.gunsPerDeck[4],
            limitFront: this.shipCompareData.deckClassLimit[4],
            gunsBack: this.shipCompareData.gunsPerDeck[5],
            limitBack: this.shipCompareData.deckClassLimit[5],
            minSpeed: `${formatFloat(this.shipCompareData.speed.min)}\u00a0${getDiff(
                this.shipCompareData.speed.min,
                this.shipBaseData.speed.min,
                2
            )}`,
            maxSpeed: `${formatFloat(this.shipCompareData.speed.max, 3)}\u00a0${getDiff(
                this.shipCompareData.speed.max,
                this.shipBaseData.speed.max,
                2
            )}`,
            maxTurningSpeed: `${formatFloat(this.shipCompareData.rudder.turnSpeed)}\u00a0${getDiff(
                this.shipCompareData.rudder.turnSpeed,
                this.shipBaseData.rudder.turnSpeed,
                2
            )}`,
            firezoneHorizontalWidth: `${this.shipCompareData.ship.firezoneHorizontalWidth}\u00a0${getDiff(
                this.shipCompareData.ship.firezoneHorizontalWidth,
                this.shipBaseData.ship.firezoneHorizontalWidth
            )}`,
            waterlineHeight: `${formatFloat(this.shipCompareData.ship.waterlineHeight)}\u00a0${getDiff(
                this.shipCompareData.ship.waterlineHeight,
                this.shipBaseData.ship.waterlineHeight,
                2
            )}`,
            acceleration: `${formatFloat(this.shipCompareData.ship.acceleration)}\u00a0${getDiff(
                this.shipCompareData.ship.acceleration,
                this.shipBaseData.ship.acceleration,
                2
            )}`,
            deceleration: `${formatFloat(this.shipCompareData.ship.deceleration)}\u00a0${getDiff(
                this.shipCompareData.ship.deceleration,
                this.shipBaseData.ship.deceleration,
                2
            )}`,
            halfturnTime: `${formatFloat(this.shipCompareData.rudder.halfturnTime)}\u00a0${getDiff(
                this.shipCompareData.rudder.halfturnTime,
                this.shipBaseData.rudder.halfturnTime
            )}`,
            sideArmor: `${formatInt(this.shipCompareData.sides.armour)}\u00a0${getDiff(
                this.shipCompareData.sides.armour,
                this.shipBaseData.sides.armour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.sides.thickness)}</span>${getDiff(
                this.shipCompareData.sides.thickness,
                this.shipBaseData.sides.thickness
            )}`,
            frontArmor: `${formatInt(this.shipCompareData.bow.armour)}\u00a0${getDiff(
                this.shipCompareData.bow.armour,
                this.shipBaseData.bow.armour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.bow.thickness)}</span>${getDiff(
                this.shipCompareData.bow.thickness,
                this.shipBaseData.bow.thickness
            )}`,
            backArmor: `${formatInt(this.shipCompareData.stern.armour)}\u00a0${getDiff(
                this.shipCompareData.stern.armour,
                this.shipBaseData.stern.armour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.stern.thickness)}</span>${getDiff(
                this.shipCompareData.stern.thickness,
                this.shipBaseData.stern.thickness
            )}`,
            pump: `${formatInt(this.shipCompareData.pump.armour)}\u00a0${getDiff(
                this.shipCompareData.pump.armour,
                this.shipBaseData.pump.armour
            )}`,
            sails: `${formatInt(this.shipCompareData.sails.armour)}\u00a0${getDiff(
                this.shipCompareData.sails.armour,
                this.shipBaseData.sails.armour
            )}`,
            structure: `${formatInt(this.shipCompareData.structure.armour)}\u00a0${getDiff(
                this.shipCompareData.structure.armour,
                this.shipBaseData.structure.armour
            )}`,
            rudder: `${formatInt(this.shipCompareData.rudder.armour)}\u00a0${getDiff(
                this.shipCompareData.rudder.armour,
                this.shipBaseData.rudder.armour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.rudder.thickness)}</span>${getDiff(
                this.shipCompareData.rudder.thickness,
                this.shipBaseData.rudder.thickness
            )}`,

            minCrew: `${formatInt(this.shipCompareData.crew.min)}\u00a0${getDiff(
                this.shipCompareData.crew.min,
                this.shipBaseData.crew.min
            )}`,
            maxCrew: `${formatInt(this.shipCompareData.crew.max)}\u00a0${getDiff(
                this.shipCompareData.crew.max,
                this.shipBaseData.crew.max
            )}`,
            sailingCrew: `${formatInt(this.shipCompareData.crew.sailing)}\u00a0${getDiff(
                this.shipCompareData.crew.sailing,
                this.shipBaseData.crew.sailing
            )}`,
            maxWeight: `${formatInt(this.shipCompareData.maxWeight)}\u00a0${getDiff(
                this.shipCompareData.maxWeight,
                this.shipBaseData.maxWeight
            )}`,
            holdSize: `${formatInt(this.shipCompareData.holdSize)}\u00a0${getDiff(
                this.shipCompareData.holdSize,
                this.shipBaseData.holdSize
            )}`,
            upgradeXP: `${formatInt(this.shipCompareData.upgradeXP)}\u00a0${getDiff(
                this.shipCompareData.upgradeXP,
                this.shipBaseData.upgradeXP
            )}`,
            sternRepair: `${formatInt(this.shipCompareData.repairTime.stern)}\u00a0${getDiff(
                this.shipBaseData.repairTime.stern,
                this.shipCompareData.repairTime.stern
            )}`,
            bowRepair: `${formatInt(this.shipCompareData.repairTime.bow)}\u00a0${getDiff(
                this.shipBaseData.repairTime.bow,
                this.shipCompareData.repairTime.bow
            )}`,
            sidesRepair: `${formatInt(this.shipCompareData.repairTime.sides)}\u00a0${getDiff(
                this.shipBaseData.repairTime.sides,
                this.shipCompareData.repairTime.sides
            )}`,
            rudderRepair: `${formatInt(this.shipCompareData.repairTime.rudder)}\u00a0${getDiff(
                this.shipBaseData.repairTime.rudder,
                this.shipCompareData.repairTime.rudder
            )}`,
            sailsRepair: `${formatInt(this.shipCompareData.repairTime.sails)}\u00a0${getDiff(
                this.shipBaseData.repairTime.sails,
                this.shipCompareData.repairTime.sails
            )}`,
            structureRepair: `${formatInt(this.shipCompareData.repairTime.structure)}\u00a0${getDiff(
                this.shipBaseData.repairTime.structure,
                this.shipCompareData.repairTime.structure
            )}`,
            hullRepair: `${formatInt(this.shipCompareData.sides.armour / hullRepairsFactor)}\u00a0${getDiff(
                this.shipBaseData.sides.armour / hullRepairsFactor,
                this.shipCompareData.sides.armour / hullRepairsFactor
            )}`,
            rigRepair: `${formatInt(this.shipCompareData.sails.armour / rigRepairsFactor)}\u00a0${getDiff(
                this.shipBaseData.sails.armour / rigRepairsFactor,
                this.shipCompareData.sails.armour / rigRepairsFactor
            )}`,
            rumRepair: `${formatInt(this.shipCompareData.crew.max / rumRepairsFactor)}\u00a0${getDiff(
                this.shipBaseData.crew.max / rumRepairsFactor,
                this.shipCompareData.crew.max / rumRepairsFactor
            )}`,
            fireResistance: `${formatInt(this.shipCompareData.resistance.fire)}\u00a0${getDiff(
                this.shipCompareData.resistance.fire,
                this.shipBaseData.resistance.fire
            )}`,
            leakResistance: `${formatInt(this.shipCompareData.resistance.leaks)}\u00a0${getDiff(
                this.shipCompareData.resistance.leaks,
                this.shipBaseData.resistance.leaks
            )}`,
            crewProtection: `${formatInt(this.shipCompareData.resistance.crew)}\u00a0${getDiff(
                this.shipCompareData.resistance.crew,
                this.shipBaseData.resistance.crew
            )}`,
            mastBottomArmor: `${formatInt(this.shipCompareData.mast.bottomArmour)}\u00a0${getDiff(
                this.shipCompareData.mast.bottomArmour,
                this.shipBaseData.mast.bottomArmour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.mast.bottomThickness)}</span>${getDiff(
                this.shipCompareData.mast.bottomThickness,
                this.shipBaseData.mast.bottomThickness
            )}`,
            mastMiddleArmor: `${formatInt(this.shipCompareData.mast.middleArmour)}\u00a0${getDiff(
                this.shipCompareData.mast.middleArmour,
                this.shipBaseData.mast.middleArmour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.mast.middleThickness)}</span>${getDiff(
                this.shipCompareData.mast.middleThickness,
                this.shipBaseData.mast.middleThickness
            )}`,
            mastTopArmor: `${formatInt(this.shipCompareData.mast.topArmour)}\u00a0${getDiff(
                this.shipCompareData.mast.topArmour,
                this.shipBaseData.mast.topArmour
            )} <span class="badge badge-white">${formatInt(this.shipCompareData.mast.topThickness)}</span>${getDiff(
                this.shipCompareData.mast.topThickness,
                this.shipBaseData.mast.topThickness
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

    get shipBaseData() {
        return this._shipBaseData;
    }

    get shipCompareData() {
        return this._shipCompareData;
    }

    get shipCompare() {
        return this._shipCompare;
    }
}

/**
 * Ship compare
 */
export default class CompareShips {
    /**
     * @param {Object} shipData - Ship data
     * @param {Object} woodData - Wood data
     * @param {Object} upgradeData - Module data
     * @param {string} id - Base id (default "ship-compare")
     */
    constructor({ shipData, woodData, moduleData, id = "ship-compare" }) {
        this._shipData = shipData;
        this._moduleDataDefault = moduleData;
        this._baseId = id;
        this._baseName = "Compare ships";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._moduleId = `${this._baseId}-module`;
        this._copyButtonId = `button-copy-${this._baseId}`;

        this._shipIds = [];
        this._selectedUpgradeIds = [];
        this._selectShip$ = {};
        this._selectWood$ = {};
        this._selectModule$ = {};
        this._modal$ = null;

        if (this._baseId === "ship-compare") {
            this._columnsCompare = ["C1", "C2"];
        } else {
            this._columnsCompare = [];
        }
        this._columns = this._columnsCompare.slice();
        this._columns.unshift("Base");

        this._ships = { Base: {}, C1: {}, C2: {} };

        const theoreticalMinSpeed = d3Min(this._shipData, ship => ship.speed.min) * 1.2,
            theoreticalMaxSpeed = 15.5;
        this._minSpeed = theoreticalMinSpeed;
        this._maxSpeed = theoreticalMaxSpeed;
        this._colorScale = d3ScaleLinear()
            .domain([this._minSpeed, 0, 12, this._maxSpeed])
            .range([colourRed, colourWhite, colourGreen, colourGreenDark])
            .interpolate(d3InterpolateHcl);

        this._woodChanges = new Map([
            // ["Mast thickness", ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"]],
            ["Acceleration", ["ship.acceleration"]],
            ["Crew protection", ["resistance.crew"]],
            ["Crew", ["crew.max"]],
            ["Fire resistance", ["resistance.fire"]],
            ["Hull strength", ["structure.armour"]],
            ["Leak resistance", ["resistance.leaks"]],
            ["Rudder speed", ["rudder.halfturnTime"]],
            ["Ship speed", ["speed.max"]],
            ["Armour strength", ["bow.armour", "sides.armour", "sails.armour", "structure.armour", "stern.armour"]],
            ["Armor thickness", ["sides.thickness", "bow.thickness", "stern.thickness"]],
            ["Turn speed", ["rudder.turnSpeed"]]
        ]);

        this._moduleChanges = new Map([
            ["Acceleration", ["ship.acceleration"]],
            ["Back armour thickness", ["stern.thickness"]],
            ["Crew protection", ["resistance.crew"]],
            ["Crew", ["crew.max"]],
            ["Fire resistance", ["resistance.fire"]],
            ["Front armour thickness", ["bow.thickness"]],
            ["Hold weight", ["maxWeight"]],
            ["Hull strength", ["structure.armour"]],
            ["Leak resistance", ["resistance.leaks"]],
            ["Mast health", ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"]],
            ["Mast thickness", ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"]],
            ["Rudder health", ["rudder.armour"]],
            ["Rudder repair time", ["repairTime.rudder"]],
            ["Rudder speed", ["rudder.halfturnTime"]],
            // ["Sail damage", [  ]],
            // ["Sail health", [  ]],
            ["Sail repair time", ["repairTime.sails"]],
            ["Sailing crew", ["crew.sailing"]],
            ["Ship speed", ["speed.max"]],
            ["Side armour repair time", ["repairTime.sides"]],
            ["Armour strength", ["bow.armour", "sides.armour", "sails.armour", "structure.armour", "stern.armour"]],
            ["Speed decrease", ["ship.deceleration"]],
            ["Armor thickness", ["sides.thickness", "bow.thickness", "stern.thickness"]],
            ["Turn speed", ["rudder.turnSpeed"]],
            ["Water pump health", ["pump.armour"]]
        ]);

        if (this._baseId === "ship-journey") {
            this._woodId = "wood-journey";
        } else {
            this._woodId = "wood-ship";
        }

        this._woodCompare = new CompareWoods(woodData, this._woodId);

        if (this._baseId === "ship-journey") {
            this._initData();
            this._initSelects();
        } else {
            this._setupListener();
        }
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._shipCompareSelected();
        });
    }

    /**
     * Set graphics parameter
     * @returns {void}
     */
    _setGraphicsParameters() {
        this.svgWidth = parseInt($(`#${this._modalId} .columnA`).width(), 10);
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth;
        this.outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2);
        this.innerRadius = Math.floor(this.outerRadius * 0.3);
        this.radiusScaleAbsolute = d3ScaleLinear()
            .domain([this.minSpeed, 0, this.maxSpeed])
            .range([10, this.innerRadius, this.outerRadius]);
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _shipCompareSelected() {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal();
            this._modal$ = $(`#${this._modalId}`);

            // Copy data to clipboard (ctrl-c key event)
            this._modal$.one("keydown", event => {
                if (event.code === "KeyC" && event.ctrlKey) {
                    this._copyDataClicked(event);
                }
            });
            // Copy data to clipboard (click event)
            document.getElementById(this._copyButtonId).addEventListener("click", event => {
                this._copyDataClicked(event);
            });
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
        this._setGraphicsParameters();
    }

    _getCompareData() {
        const data = [];

        this._columns.forEach(columnId => {
            if (this._shipIds[columnId] !== undefined) {
                data.push(this._shipIds[columnId]);

                ["frame", "trim"].forEach(type => {
                    data.push(+this._selectWood$[columnId][type].val());
                });

                data.push(this._selectedUpgradeIds[columnId] ? this._selectedUpgradeIds[columnId] : 0);
                console.log("data", columnId, data);
            }
        });

        return data;
    }

    _copyDataClicked(event) {
        registerEvent("Menu", "Copy ship compare");
        event.preventDefault();

        const data = this._getCompareData();

        if (data.length) {
            const F11Url = new URL(window.location);
            console.log("data", data, hashids.encode(data));
            F11Url.searchParams.set("cmp", hashids.encode(data));
            F11Url.searchParams.set("v", encodeURIComponent(appVersion));

            copyToClipboard(F11Url.href);
        }
    }

    /**
     * Setup ship data
     * @returns {void}
     */
    _setupShipData() {
        this.shipSelectData = d3Nest()
            .key(ship => ship.class)
            .sortKeys(d3Ascending)
            .entries(
                this._shipData
                    .map(ship => ({
                        id: ship.id,
                        name: ship.name,
                        class: ship.class,
                        battleRating: ship.battleRating,
                        guns: ship.guns
                    }))
                    .sort(sortBy(["name"]))
            );
    }

    /**
     * Setup module data
     * @returns {void}
     */
    _setupModuleData() {
        // Get all modules where change modifier (moduleChanges) exists
        this._moduleProperties = new Map(
            this._moduleDataDefault
                .map(type =>
                    type[1]
                        .filter(module =>
                            module.properties.some(property => {
                                return this._moduleChanges.has(property.modifier);
                            })
                        )
                        .map(module => [module.id, module])
                )
                .flat()
        );

        // Get types from moduleProperties list
        this._moduleTypes = new Set(
            Array.from(this._moduleProperties).map(module => module[1].type.replace(/\s–\s[a-zA-Z/]+/, ""))
        );
        // console.log(this._moduleProperties, this._moduleTypes);
    }

    /**
     * Inject modal
     * @returns {void}
     */
    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const row = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("class", "container-fluid")
            .append("div")
            .attr("class", "row");

        this._columns.forEach(columnId => {
            const div = row
                .append("div")
                .attr("class", `col-md-4 ml-auto pt-2 ${columnId === "Base" ? "columnA" : "columnC"}`);

            const shipSelectId = this._getShipSelectId(columnId);
            div.append("label")
                .append("select")
                .attr("name", shipSelectId)
                .attr("id", shipSelectId)
                .attr("class", "selectpicker");

            ["frame", "trim"].forEach(type => {
                const woodId = this._getWoodSelectId(type, columnId);
                div.append("label")
                    .append("select")
                    .attr("name", woodId)
                    .attr("id", woodId)
                    .attr("class", "selectpicker");
            });

            this._moduleTypes.forEach(type => {
                const moduleId = this._getModuleSelectId(type, columnId);
                div.append("label")
                    .append("select")
                    .attr("name", moduleId)
                    .attr("id", moduleId)
                    .property("multiple", type !== "Ship trim")
                    .attr("class", "selectpicker");
            });

            div.append("div")
                .attr("id", `${this._baseId}-${columnId}`)
                .attr("class", `${columnId === "Base" ? "ship-base" : "ship-compare"}`);
        });

        const footer = d3Select(`#${this._modalId} .modal-footer`);
        footer
            .insert("button", "button")
            .classed("btn btn-outline-secondary", true)
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .classed("far fa-copy", true);
    }

    _initData() {
        this._setupShipData();
        this._setupModuleData();
        this.woodCompare._setupData();
    }

    _initSelects() {
        this._columns.forEach(columnId => {
            this._selectWood$[columnId] = {};
            this._setupShipSelect(columnId);
            ["frame", "trim"].forEach(type => {
                this._selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`);
                this.woodCompare._setupWoodSelects(columnId, type, this._selectWood$[columnId][type]);
            });
            this._setupSelectListener(columnId);
        });
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._initData();
        this._injectModal();
        this._initSelects();
    }

    /**
     * Get select options
     * @returns {string} HTML formatted option
     */
    _getShipOptions() {
        return this.shipSelectData
            .map(
                key =>
                    `<optgroup label="${getOrdinal(key.key, false)} rate">${key.values
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

    /**
     * Setup ship select
     * @param {string} columnId - Column id
     * @returns {void}
     */
    _setupShipSelect(columnId) {
        this._selectShip$[columnId] = $(`#${this._getShipSelectId(columnId)}`);
        const options = this._getShipOptions();

        this._selectShip$[columnId].append(options);
        if (columnId !== "Base") {
            this._selectShip$[columnId].attr("disabled", "disabled");
        }
    }

    /**
     * Get select options
     * @param {string} moduleType - Module type
     * @param {number} shipClass - Ship class
     * @returns {string} HTML formatted option
     */
    _getUpgradesOptions(moduleType, shipClass) {
        const getModuleLevel = rate => (rate <= 3 ? "L" : rate <= 5 ? "M" : "S");

        // Nest module data by sub type (e.g. "Gunnery")
        const modules = d3Nest()
            .key(module => module[1].type.replace(/[a-zA-Z\s]+\s–\s/, ""))
            .sortKeys(d3Ascending)
            .entries(
                Array.from(this._moduleProperties).filter(
                    module =>
                        module[1].type.replace(/\s–\s[a-zA-Z/]+/, "") === moduleType &&
                        (module[1].moduleLevel === "U" || module[1].moduleLevel === getModuleLevel(shipClass))
                )
            );

        let options = "";
        if (modules.length > 1) {
            // Get options with sub types as optgroups
            options = modules
                .map(
                    group =>
                        `<optgroup label="${group.key}">${group.values
                            .map(module => `<option value="${module[0]}">${module[1].name}`)
                            .join("</option>")}`
                )
                .join("</optgroup>");
        } else {
            // Get options without optgroups
            options = modules.map(
                group =>
                    `${group.values.map(module => `<option value="${module[0]}">${module[1].name}`).join("</option>")}`
            );
        }

        return options;
    }

    /**
     * Setup upgrades select
     * @param {string} columnId - Column id
     * @returns {void}
     */
    _setupModulesSelect(columnId) {
        const getShipClass = () => this._shipData.find(ship => ship.id === this._shipIds[columnId]).class;

        this._selectModule$[columnId] = {};

        this._moduleTypes.forEach(type => {
            this._selectModule$[columnId][type] = $(`#${this._getModuleSelectId(type, columnId)}`);
            const options = this._getUpgradesOptions(type, getShipClass());

            this._selectModule$[columnId][type].append(options);
            this._selectModule$[columnId][type]
                .on("changed.bs.select", () => {
                    this._upgradeSelected(columnId);
                    this._refreshShips(columnId);
                })
                .selectpicker({
                    selectedTextFormat: "count > 1",
                    countSelectedText(amount) {
                        return `${amount} ${type.toLowerCase()}s selected`;
                    },
                    title: `${type}`,
                    width: "150px"
                });
        });
    }

    /**
     * Get ship data for ship with id <id>
     * @param {string} columnId - Column id
     * @returns {Object} Ship data
     */
    _getShipData(columnId) {
        let shipData = this._shipData.find(ship => ship.id === this._shipIds[columnId]);

        shipData = this._addWoodData(shipData, columnId);
        shipData = this._addModulesData(shipData, columnId);

        return shipData;
    }

    /**
     * Add to ship data changes based on selected woods
     * @param {*} shipData - Ship id
     * @param {*} compareId - Column id
     * @returns {Object} - Updated ship data
     */
    _addWoodData(shipData, compareId) {
        const data = JSON.parse(JSON.stringify(shipData));

        data.resistance = {};
        data.resistance.fire = 0;
        data.resistance.leaks = 0;
        data.resistance.crew = 0;

        if (typeof this.woodCompare._instances[compareId] !== "undefined") {
            let dataLink = "_woodData";
            if (compareId !== "Base") {
                dataLink = "_compareData";
            }
            const modifierAmount = new Map();
            // Add modifier amount for both frame and trim
            ["frame", "trim"].forEach(type => {
                this.woodCompare._instances[compareId][dataLink][type].properties.forEach(property => {
                    if (this._woodChanges.has(property.modifier)) {
                        modifierAmount.set(
                            property.modifier,
                            modifierAmount.has(property.modifier)
                                ? modifierAmount.get(property.modifier) + property.amount
                                : property.amount
                        );
                    }
                });
            });
            modifierAmount.forEach((value, key) => {
                this._woodChanges.get(key).forEach(modifier => {
                    const index = modifier.split("."),
                        factor = 1 + modifierAmount.get(key) / 100;

                    if (index.length > 1) {
                        if (data[index[0]][index[1]]) {
                            data[index[0]][index[1]] *= factor;
                        } else {
                            data[index[0]][index[1]] = modifierAmount.get(key);
                        }
                    } else if (data[index[0]]) {
                        data[index[0]] *= factor;
                    } else {
                        data[index[0]] = modifierAmount.get(key);
                    }
                });
            });

            data.speedDegrees = data.speedDegrees.map(speed => {
                const factor = 1 + modifierAmount.get("Ship speed") / 100;
                return Math.max(Math.min(speed * factor, this._maxSpeed), this._minSpeed);
            });
        }

        return data;
    }

    /**
     * Add upgrade changes to ship data
     * @param {*} shipData - Ship id
     * @param {*} compareId - Column id
     * @returns {Object} - Updated ship data
     */
    _addModulesData(shipData, compareId) {
        const data = JSON.parse(JSON.stringify(shipData));

        if (typeof this._selectedUpgradeIds[compareId] !== "undefined") {
            const modifierAmount = new Map();

            // Add modifier amount
            this._selectedUpgradeIds[compareId].forEach(id => {
                const module = this._moduleProperties.get(id);

                module.properties.forEach(property => {
                    if (this._moduleChanges.has(property.modifier)) {
                        modifierAmount.set(
                            property.modifier,
                            modifierAmount.has(property.modifier)
                                ? modifierAmount.get(property.modifier) + property.amount
                                : property.amount
                        );
                    }
                });
            });

            modifierAmount.forEach((value, key) => {
                this._moduleChanges.get(key).forEach(modifier => {
                    const index = modifier.split("."),
                        factor = 1 + modifierAmount.get(key) / 100;

                    if (index.length > 1) {
                        if (data[index[0]][index[1]]) {
                            data[index[0]][index[1]] *= factor;
                        } else {
                            data[index[0]][index[1]] = modifierAmount.get(key);
                        }
                    } else if (data[index[0]]) {
                        data[index[0]] *= factor;
                    } else {
                        data[index[0]] = modifierAmount.get(key);
                    }
                });
            });

            if (modifierAmount.has("Ship speed")) {
                data.speedDegrees = data.speedDegrees.map(speed => {
                    const factor = 1 + modifierAmount.get("Ship speed") / 100;
                    return Math.max(Math.min(speed * factor, this._maxSpeed), this._minSpeed);
                });
            }
        }

        return data;
    }

    /**
     * Refresh ship data
     * @param {*} compareId - Column id
     * @returns {void}
     */
    _refreshShips(compareId) {
        const singleShipData = this._getShipData(compareId);
        if (this._baseId !== "ship-journey") {
            if (compareId === "Base") {
                this._setShip(compareId, new ShipBase(compareId, singleShipData, this));
                this._columnsCompare.forEach(id => {
                    this._selectShip$[id].removeAttr("disabled").selectpicker("refresh");
                    if (!isEmpty(this.ships[id])) {
                        this._setShip(
                            id,
                            new ShipComparison(id, singleShipData, this.ships[id]._shipCompareData, this)
                        );
                    }
                });
            } else {
                this._setShip(
                    compareId,
                    new ShipComparison(compareId, this.ships.Base._shipData, singleShipData, this)
                );
            }
        } else {
            this._singleShipData = singleShipData;
        }
    }

    /**
     * Enable compare selects
     * @returns {void}
     */
    _enableCompareSelects() {
        this._columnsCompare.forEach(compareId => {
            this._selectShip$[compareId].removeAttr("disabled").selectpicker("refresh");
        });
    }

    _upgradeSelected(compareId) {
        this._selectedUpgradeIds[compareId] = [];

        this._moduleTypes.forEach(type => {
            let selectedOptions = this._selectModule$[compareId][type].val();

            if (Array.isArray(selectedOptions)) {
                // Multiple selects
                selectedOptions = selectedOptions.map(Number);
            } else {
                // Single select
                selectedOptions = selectedOptions !== "" ? [+selectedOptions] : [];
            }

            if (selectedOptions.length) {
                this._selectedUpgradeIds[compareId] = this._selectedUpgradeIds[compareId].concat(selectedOptions);
            }
        });

        // console.log("selectedUpgradeIds", this._selectedUpgradeIds, compareId, this._selectedUpgradeIds[compareId]);
    }

    /**
     * Listener for the select
     * @param {string} compareId - Column id
     * @returns {void}
     */
    _setupSelectListener(compareId) {
        this._selectShip$[compareId]
            .on("changed.bs.select", () => {
                this._shipIds[compareId] = +this._selectShip$[compareId].val();
                this._refreshShips(compareId);
                if (compareId === "Base" && this._baseId !== "ship-journey") {
                    this._enableCompareSelects();
                }
                this.woodCompare.enableSelects(compareId);
                this._setupModulesSelect(compareId);
            })
            .selectpicker({ title: "Ship" });

        ["frame", "trim"].forEach(type => {
            this._selectWood$[compareId][type]
                .on("changed.bs.select", () => {
                    this.woodCompare._woodSelected(compareId, type, this._selectWood$[compareId][type]);
                    this._refreshShips(compareId);
                })
                .selectpicker({ title: `Wood ${type}`, width: "150px" });
        });
    }

    init(data) {
        const setData = () => {};

        console.log("init", data);
        this._initData();
        this._injectModal();
        this._initSelects();

        setData();
    }

    _getShipSelectId(columnId) {
        return `${this._baseId}-${columnId}-select`;
    }

    _getWoodSelectId(type, columnId) {
        return `${this._woodId}-${type}-${columnId}-select`;
    }

    _getModuleSelectId(type, columnId) {
        return `${this._moduleId}-${type.replace(/\s/, "")}-${columnId}-select`;
    }

    get woodCompare() {
        return this._woodCompare;
    }

    _setShip(id, ship) {
        this._ships[id] = ship;
    }

    get ships() {
        return this._ships;
    }

    get minSpeed() {
        return this._minSpeed;
    }

    get maxSpeed() {
        return this._maxSpeed;
    }

    get colorScale() {
        return this._colorScale;
    }

    set svgWidth(width) {
        this._svgWidth = width;
    }

    get svgWidth() {
        return this._svgWidth;
    }

    set svgHeight(height) {
        this._svgHeight = height;
    }

    get svgHeight() {
        return this._svgHeight;
    }

    set outerRadius(radius) {
        this._outerRadius = radius;
    }

    get outerRadius() {
        return this._outerRadius;
    }

    set innerRadius(radius) {
        this._innerRadius = radius;
    }

    get innerRadius() {
        return this._innerRadius;
    }

    set radiusScaleAbsolute(scale) {
        this._radiusScaleAbsolute = scale;
    }

    get radiusScaleAbsolute() {
        return this._radiusScaleAbsolute;
    }
}
