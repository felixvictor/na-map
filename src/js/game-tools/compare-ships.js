/**
 * This file is part of na-map.
 *
 * @file      Compare ships.
 * @module    game-tools/compare-ships
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/tooltip";

import { ascending as d3Ascending, max as d3Max, min as d3Min } from "d3-array";
import { nest as d3Nest } from "d3-collection";
import { drag as d3Drag } from "d3-drag";
import { interpolateCubehelixLong as d3InterpolateCubehelixLong } from "d3-interpolate";

import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { event as d3Event, select as d3Select } from "d3-selection";
import {
    arc as d3Arc,
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    radialLine as d3RadialLine
} from "d3-shape";

import { registerEvent } from "../analytics";
import {
    appVersion,
    colourGreenDark,
    colourRedDark,
    colourWhite,
    hashids,
    hullRepairsPercent,
    hullRepairsVolume,
    rigRepairsPercent,
    rigRepairsVolume,
    rumRepairsPercent,
    rumRepairsVolume,
    repairTime,
    insertBaseModal
} from "../common";
import {
    // colourRamp,
    copyToClipboard,
    drawSvgCircle,
    drawSvgLine,
    formatFloat,
    formatInt,
    formatIntTrunc,
    formatPercent,
    formatPP,
    formatSignInt,
    formatSignFloat,
    formatSignPercent,
    getOrdinal,
    isEmpty,
    putImportError,
    rotationAngleInDegrees,
    roundToThousands,
    sortBy,
    degreesToCompass
} from "../util";

import CompareWoods from "./compare-woods";

// eslint-disable-next-line import/no-unresolved
import { default as shipIcon } from "Icons/icon-ship.svg";

const numberSegments = 24;
const segmentRadians = (2 * Math.PI) / numberSegments;

const rumRepairsFactor = rumRepairsPercent / rumRepairsVolume;
const repairsSetSize = 5;

/**
 * Ship
 */
class Ship {
    /**
     * @param {string} id - column id
     * @param {Class} shipCompare - Class instance of the ship to be compared to
     */
    constructor(id, shipCompare) {
        this._id = id;
        this._shipCompare = shipCompare;

        // Speed ticks
        this._ticksSpeed = [12, 8, 4, 0];
        this._ticksSpeedLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

        this._select = `#ship-compare-${this._id}`;

        this._setupSvg();
        this._setCompass();
    }

    /**
     * Setup svg
     * @returns {void}
     */
    _setupSvg() {
        const element = d3Select(this.select);

        d3Select(`${this.select} svg`).remove();

        this._svg = element
            .append("svg")
            .attr("width", this._shipCompare.svgWidth)
            .attr("height", this._shipCompare.svgHeight)
            .attr("data-ui-component", "sailing-profile")
            .attr("fill", "none");
        this.mainG = this._svg
            .append("g")
            .attr("transform", `translate(${this._shipCompare.svgWidth / 2},${this._shipCompare.svgHeight / 2})`);
        d3Select(`${this.select} div`).remove();

        element.append("div").attr("class", "block-small");
    }

    /**
     * Set compass
     * @returns {void}
     */
    _setCompass() {
        // Compass
        const data = new Array(numberSegments / 2);
        data.fill(1, 0);
        const pie = d3Pie()
            .sort(null)
            .value(1)(data);

        const arc = d3Arc()
            .outerRadius(this._shipCompare.radiusSpeedScale(12))
            .innerRadius(this._shipCompare.innerRadius);

        // Add compass arcs
        this.mainG
            .append("g")
            .attr("class", "compass-arc")
            .selectAll("path")
            .data(pie)
            .join(enter => enter.append("path").attr("d", arc));

        // Add the circles for each speed tick
        this.mainG
            .append("g")
            .attr("class", "speed-circle")
            .selectAll("circle")
            .data(this._ticksSpeed)
            .join(enter => enter.append("circle").attr("r", d => this._shipCompare.radiusSpeedScale(d)));
    }

    /**
     * Format cannon pound value
     * @param {number[]} limit Upper limit for [0] cannon and [1] carronades
     * @return {void}
     */
    static pd(limit) {
        let s = `<span class="badge badge-white">${limit[0]}\u202F/\u202F`;
        if (limit[1]) {
            s += `${limit[1]}`;
        } else {
            s += "\u2013";
        }

        s += "\u202Flb</span>";
        return s;
    }

    /**
     * Format cannon/carronade upper limit classes
     * @param {number[]} deckClassLimit - Limit per deck
     * @param {number[]} gunsPerDeck - Guns per deck
     * @returns {string[]} Formatted string [0] limits and [1] possibly empty lines at the bottom
     */
    static getCannonsPerDeck(deckClassLimit, gunsPerDeck) {
        let s = `${gunsPerDeck[0]}\u00A0${Ship.pd(deckClassLimit[0])}`;
        let br = "";
        for (let i = 1; i < 4; i += 1) {
            if (gunsPerDeck[i]) {
                s = `${gunsPerDeck[i]}\u00A0${Ship.pd(deckClassLimit[i])}\u202F<br>${s}`;
            } else {
                br = `${br}<br>`;
            }
        }

        return [s, br];
    }

    /**
     * HTML format head of second block
     * @return {string} HTML formatted block head
     */
    static displaySecondBlock() {
        return '<div class="col-9"><div class="row no-gutters">';
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
            return `<div class="row row-small ${row % 2 ? "row-light" : ""}"><div class="col-3">${element}</div>`;
        }

        /**
         * HTML format a single column
         * @param {string} element - Ship element
         * @param {string} description - Element description
         * @param {number} col - Number of columns
         * @return {string} HTML formatted column
         */
        function displayColumn(element, description, col = 6) {
            let elementText = "";
            let br = "";

            if (element === "cannonsPerDeck") {
                [elementText, br] = ship[element];
                br = `<br>${br}`;
            } else {
                elementText = element === "" ? "" : ship[element];
            }

            return `<div class="col-${col}">${elementText}<br><span class="des">${description}</span>${br}</div>`;
        }

        let text = "";

        text += displayFirstColumn(ship.shipRating);
        text += Ship.displaySecondBlock();
        text += displayColumn("battleRating", "Battle rating");
        text += displayColumn("guns", "Cannons");
        text += displayColumn("upgradeXP", "Knowledge XP");
        text += displayColumn("waterlineHeight", "Water line");
        text += "</div></div></div>";

        text += displayFirstColumn(ship.decks);
        text += Ship.displaySecondBlock();
        text += displayColumn("cannonsPerDeck", "Gun decks");
        text += displayColumn("firezoneHorizontalWidth", "Firezone horizontal width");
        text += "</div></div></div>";

        text += displayFirstColumn("Broadside (lb)");
        text += Ship.displaySecondBlock();
        text += displayColumn("cannonBroadside", "Cannons");
        text += displayColumn("carroBroadside", "Carronades");
        text += "</div></div></div>";

        text += displayFirstColumn("Chasers");
        text += Ship.displaySecondBlock();
        text += displayColumn("gunsFront", "Bow");
        text += displayColumn("gunsBack", "Stern");
        text += "</div></div></div>";

        text += displayFirstColumn("Speed");
        text += Ship.displaySecondBlock();
        text += displayColumn("maxSpeed", "Maximum");
        text += displayColumn("", "");
        text += displayColumn("acceleration", "Acceleration");
        text += displayColumn("deceleration", "Deceleration");
        text += displayColumn("maxTurningSpeed", "Turn speed");
        text += displayColumn("halfturnTime", "Rudder half time");
        text += "</div></div></div>";

        text += displayFirstColumn('Hit points <span class="badge badge-white">Thickness</span>');
        text += Ship.displaySecondBlock();
        text += displayColumn("sideArmor", "Sides");
        text += displayColumn("structure", "Hull");
        text += displayColumn("frontArmor", "Bow");
        text += displayColumn("backArmor", "Stern");
        text += displayColumn("pump", "Pump");
        text += displayColumn("rudder", "Rudder");
        text += "</div></div></div>";

        text += displayFirstColumn('Masts <span class="badge badge-white">Thickness</span>');
        text += Ship.displaySecondBlock();
        text += displayColumn("sails", "Sails");
        text += displayColumn("mastBottomArmor", "Bottom");
        text += displayColumn("mastMiddleArmor", "Middle");
        text += displayColumn("mastTopArmor", "Top");
        text += "</div></div></div>";

        text += displayFirstColumn("Crew");
        text += Ship.displaySecondBlock();
        text += displayColumn("minCrew", "Minimum", 4);
        text += displayColumn("sailingCrew", "Sailing", 4);
        text += displayColumn("maxCrew", "Maximum", 4);
        text += "</div></div></div>";

        text += displayFirstColumn("Resistance");
        text += Ship.displaySecondBlock();
        text += displayColumn("fireResistance", "Fire", 4);
        text += displayColumn("leakResistance", "Leak", 4);
        text += displayColumn("splinterResistance", "Splinter", 4);
        text += "</div></div></div>";

        text += displayFirstColumn('Repairs needed <span class="badge badge-white">Set of 5</span>');
        text += Ship.displaySecondBlock();
        text += displayColumn("hullRepairsNeeded", "Hull", 4);
        text += displayColumn("rigRepairsNeeded", "Rig", 4);
        text += displayColumn("rumRepairsNeeded", "Rum", 4);
        text += "</div></div></div>";

        text += displayFirstColumn("Repair");
        text += Ship.displaySecondBlock();
        text += displayColumn("hullRepairAmount", "Hull %", 4);
        text += displayColumn("rigRepairAmount", "Rig %", 4);
        text += displayColumn("repairTime", "Time (sec)", 4);
        text += "</div></div></div>";

        text += displayFirstColumn("Hold");
        text += Ship.displaySecondBlock();
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
}

/**
 * Base ship for comparison (displayed on the left side)
 * @extends Ship
 */
class ShipBase extends Ship {
    /**
     * @param {string} id - Ship id
     * @param {Object} shipData - Ship data
     * @param {Class} shipCompare - Class instance of the ship to be compared to
     */
    constructor(id, shipData, shipCompare) {
        super(id, shipCompare);

        this._shipData = shipData;
        this._shipCompare = shipCompare;

        this._setBackground();
        this._setupDrag();
        this._drawWindProfile();
        this._setupShipOutline();
        this._printText();
    }

    /**
     * Set coloured Background
     * @returns {void}
     */
    _setBackground() {
        // Arc for text
        const speedArc = d3Arc()
            .outerRadius(d => this._shipCompare.radiusSpeedScale(d) + 2)
            .innerRadius(d => this._shipCompare.radiusSpeedScale(d) + 1)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        // Add the paths for the text
        this.mainG
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("data-ui-component", "speed-textpath")
            .selectAll("path")
            .data(this._ticksSpeed)
            .join(enter =>
                enter
                    .append("path")
                    .attr("d", speedArc)
                    .attr("id", (d, i) => `tick${i}`)
            );

        // And add the text
        this.mainG
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("class", "speed-text")
            .selectAll("text")
            .data(this._ticksSpeed)
            .join(enter =>
                enter
                    .append("text")
                    .append("textPath")
                    .attr("href", (d, i) => `#tick${i}`)
                    .text((d, i) => this._ticksSpeedLabels[i])
                    .attr("startOffset", "10%")
            );
    }

    _getHeadingInDegrees(rotate, degrees) {
        let heading = rotate - degrees - 180;
        if (heading < 0) {
            heading += 360;
        }

        return heading;
    }

    _getSpeed(rotate) {
        return formatFloat(this._speedScale(Math.abs(rotate)));
    }

    _getHeadingInCompass(rotate) {
        return degreesToCompass(rotate);
    }

    _setupDrag() {
        const steps = this._shipData.speedDegrees.length;
        const degreesPerStep = 360 / steps;
        const domain = new Array(steps + 1).fill().map((e, i) => i * degreesPerStep);
        this._speedScale = d3ScaleLinear()
            .domain(domain)
            .range([...this._shipData.speedDegrees, this._shipData.speedDegrees[0]])
            .clamp(true);

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragStart = d => {
            d.this.classed("drag-active", true);
        };

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragged = d => {
            const update = () => {
                d.this.attr("transform", d => `rotate(${d.rotate})`);
                d.compassText
                    .attr("transform", d => `rotate(${-d.rotate},${d.compassTextX},${d.compassTextY})`)
                    .text(d => this._getHeadingInCompass(d.rotate));
                if (d.type === "ship") {
                    d.speedText
                        .attr("transform", d => `rotate(${-d.rotate},${d.speedTextX},${d.speedTextY})`)
                        .text(d => this._getSpeed(d.rotate));
                }
            };

            const { x: xMouse, y: yMouse } = d3Event;
            d.rotate = this._getHeadingInDegrees(
                rotationAngleInDegrees({ x: d.initX, y: d.initY }, { x: xMouse, y: yMouse }),
                d.correctionValueDegrees
            );
            update();
        };

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragEnd = d => {
            d.this.classed("drag-active", false);
        };

        this._drag = d3Drag()
            .on("start", dragStart)
            .on("drag", dragged)
            .on("end", dragEnd)
            .container(() => this.mainG.node());
    }

    _setupShipOutline() {
        // Add ship outline
        const { shipMass } = this._shipData;
        const heightShip = this._shipCompare.shipMassScale(shipMass);
        const widthShip = heightShip;
        const circleSize = 20;
        const svgHeight = this._shipCompare.svgHeight / 2 - 2 * circleSize;

        const datum = {
            initX: 0,
            initY: 0,
            initRotate: 0,
            correctionValueDegrees: 180,
            compassTextX: 0,
            compassTextY: svgHeight,
            speedTextX: 0,
            speedTextY: 0,
            type: "ship"
        };

        const gShip = this.mainG
            .append("g")
            .datum(datum)
            .attr("class", "ship-outline");

        gShip
            .append("line")
            .attr("x1", d => d.initX)
            .attr("y1", svgHeight - circleSize)
            .attr("x2", d => d.initX)
            .attr("y2", d => d.initY);

        gShip
            .append("image")
            .attr("height", heightShip)
            .attr("width", widthShip)
            .attr("x", -heightShip / 2)
            .attr("y", -widthShip / 2)
            .attr("xlink:href", shipIcon);

        gShip
            .append("circle")
            .attr("cx", d => d.compassTextX)
            .attr("cy", d => d.compassTextY)
            .attr("r", circleSize)
            .call(this._drag);

        const compassText = gShip
            .append("text")
            .attr("x", d => d.compassTextX)
            .attr("y", d => d.compassTextY)
            .attr("transform", d => `rotate(${-d.initRotate},${d.compassTextX},${d.compassTextY})`)
            .text(d => this._getHeadingInCompass(d.initRotate));

        const speedText = gShip
            .append("text")
            .attr("x", d => d.speedTextX)
            .attr("y", d => d.speedTextY)
            .attr("transform", d => `rotate(${-d.initRotate},${d.speedTextX},${d.speedTextY})`)
            .text(d => this._getSpeed(d.initRotate));

        datum.this = gShip;
        datum.compassText = compassText;
        datum.speedText = speedText;
        gShip.datum(datum).attr("transform", d => `rotate(${d.initRotate})`);
    }

    /**
     * Draw profile
     * @returns {void}
     */
    _drawWindProfile() {
        const pie = d3Pie()
            .sort(null)
            .value(1);

        const arcsBase = pie(this._shipData.speedDegrees);

        const curve = d3CurveCatmullRomClosed;
        const line = d3RadialLine()
            .angle((d, i) => i * segmentRadians)
            .radius(d => this._shipCompare.radiusSpeedScale(d.data))
            .curve(curve);

        // Profile shape
        const circleSize = 20;
        const svgHeight = this._shipCompare.svgHeight / 2 - circleSize;
        const datum = {
            initX: 0,
            initY: 0,
            initRotate: 0,
            correctionValueDegrees: 0,
            compassTextX: 0,
            compassTextY: -svgHeight,
            type: "windProfile"
        };

        const gWindProfile = this.mainG
            .append("g")
            .datum(datum)
            .attr("class", "wind-profile");

        // Add big wind arrow
        gWindProfile
            .append("path")
            .attr(
                "d",
                d =>
                    String(drawSvgCircle(d.compassTextX, d.compassTextY, circleSize)) +
                    drawSvgLine(d.compassTextX, d.compassTextY, -d.compassTextY / 2)
            )

            .attr("class", "wind-profile-arrow")
            .attr("marker-end", "url(#wind-profile-arrow-head)")
            .call(this._drag);

        gWindProfile
            .append("circle")
            .attr("cx", d => d.compassTextX)
            .attr("cy", d => d.compassTextY)
            .attr("r", circleSize);

        const compassText = gWindProfile
            .append("text")
            .attr("x", d => d.compassTextX)
            .attr("y", d => d.compassTextY)
            .attr("transform", d => `rotate(${-d.initRotate},${d.compassTextX},${d.compassTextY})`)
            .text(d => this._getHeadingInCompass(d.initRotate));

        gWindProfile
            .append("path")
            .attr("class", "base-profile")
            .attr("d", line(arcsBase));

        // Speed marker
        gWindProfile
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("data-ui-component", "speed-markers")
            .selectAll("circle")
            .data(arcsBase)
            .join(enter =>
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusSpeedScale(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusSpeedScale(d.data))
                    .attr("fill", d => this._shipCompare.colorScale(d.data))
                    .attr("fill", d => this._shipCompare.colorScale(d.data))
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`)
            );

        datum.this = gWindProfile;
        datum.compassText = compassText;
        gWindProfile.datum(datum).attr("transform", d => `rotate(${d.initRotate})`);

        // colourRamp(d3Select(this._select), this.shipCompareData.colorScale, this._shipData.speedDegrees.length);
    }

    /**
     * Print text
     * @returns {void}
     */
    _printText() {
        const cannonsPerDeck = Ship.getCannonsPerDeck(this._shipData.deckClassLimit, this._shipData.gunsPerDeck);
        const hullRepairsNeeded = Math.round(
            (this._shipData.sides.armour * this._shipData.repairAmount.armour) / hullRepairsVolume
        );
        const rigRepairsNeeded = Math.round(
            (this._shipData.sails.armour * this._shipData.repairAmount.sails) / rigRepairsVolume
        );
        const rumRepairsNeeded = Math.round(this._shipData.crew.max * rumRepairsFactor);

        const ship = {
            shipRating: `${getOrdinal(this._shipData.class)} rate`,
            battleRating: this._shipData.battleRating,
            guns: this._shipData.guns,
            decks: `${this._shipData.decks} deck${this._shipData.decks > 1 ? "s" : ""}`,
            additionalRow: `${this._shipData.decks < 4 ? "<br>\u00A0" : ""}`,
            cannonsPerDeck,
            cannonBroadside: formatInt(this._shipData.broadside.cannons),
            carroBroadside: formatInt(this._shipData.broadside.carronades),
            gunsFront: this._shipData.gunsPerDeck[4],
            limitFront: this._shipData.deckClassLimit[4],
            gunsBack: this._shipData.gunsPerDeck[5],
            limitBack: this._shipData.deckClassLimit[5],
            firezoneHorizontalWidth: this._shipData.ship.firezoneHorizontalWidth,
            waterlineHeight: formatFloat(this._shipData.ship.waterlineHeight),
            maxSpeed: formatFloat(this._shipData.speed.max, 4),
            acceleration: formatFloat(this._shipData.ship.acceleration),
            deceleration: formatFloat(this._shipData.ship.deceleration),
            maxTurningSpeed: formatFloat(this._shipData.rudder.turnSpeed, 3),
            halfturnTime: formatFloat(this._shipData.rudder.halfturnTime),
            sideArmor: `${formatInt(this._shipData.sides.armour)}\u00A0<span class="badge badge-white">${formatInt(
                this._shipData.sides.thickness
            )}</span>`,
            frontArmor: `${formatInt(this._shipData.bow.armour)}\u00A0<span class="badge badge-white">${formatInt(
                this._shipData.bow.thickness
            )}</span>`,
            pump: formatInt(this._shipData.pump.armour),
            sails: formatInt(this._shipData.sails.armour),
            structure: formatInt(this._shipData.structure.armour),
            backArmor: `${formatInt(this._shipData.stern.armour)}\u00A0<span class="badge badge-white">${formatInt(
                this._shipData.stern.thickness
            )}</span>`,
            rudder: `${formatInt(this._shipData.rudder.armour)}\u00A0<span class="badge badge-white">${formatInt(
                this._shipData.rudder.thickness
            )}</span>`,
            minCrew: formatInt(this._shipData.crew.min),
            maxCrew: formatInt(this._shipData.crew.max),
            sailingCrew: formatInt(this._shipData.crew.sailing || 0),
            maxWeight: formatInt(this._shipData.maxWeight),
            holdSize: formatInt(this._shipData.holdSize),
            upgradeXP: formatInt(this._shipData.upgradeXP),
            sternRepair: `${formatInt(this._shipData.repairTime.stern)}`,
            bowRepair: `${formatInt(this._shipData.repairTime.bow)}`,
            hullRepairAmount: `${formatInt(
                (this._shipData.repairAmount.armour + this._shipData.repairAmount.armourPerk) * 100
            )}`,
            rigRepairAmount: `${formatInt(
                (this._shipData.repairAmount.sails + this._shipData.repairAmount.sailsPerk) * 100
            )}`,
            repairTime: `${formatInt(this._shipData.repairTime.sides)}`,
            hullRepairsNeeded: `${formatInt(hullRepairsNeeded)}\u00A0<span class="badge badge-white">${formatInt(
                hullRepairsNeeded * repairsSetSize
            )}</span>`,
            rigRepairsNeeded: `${formatInt(rigRepairsNeeded)}\u00A0<span class="badge badge-white">${formatInt(
                rigRepairsNeeded * repairsSetSize
            )}</span>`,
            rumRepairsNeeded: `${formatInt(rumRepairsNeeded)}\u00A0<span class="badge badge-white">${formatInt(
                rumRepairsNeeded * repairsSetSize
            )}</span>`,
            fireResistance: formatPercent(this._shipData.resistance.fire, 0),
            leakResistance: formatPercent(this._shipData.resistance.leaks, 0),
            splinterResistance: formatPercent(this._shipData.resistance.splinter, 0),
            mastBottomArmor: `${formatInt(
                this._shipData.mast.bottomArmour
            )}\u00A0<span class="badge badge-white">${formatInt(this._shipData.mast.bottomThickness)}</span>`,
            mastMiddleArmor: `${formatInt(
                this._shipData.mast.middleArmour
            )}\u00A0<span class="badge badge-white">${formatInt(this._shipData.mast.middleThickness)}</span>`,
            mastTopArmor: `${formatInt(this._shipData.mast.topArmour)}\u00A0<span class="badge badge-white">${formatInt(
                this._shipData.mast.topThickness
            )}</span>`
        };

        if (ship.gunsFront) {
            ship.gunsFront += `\u00A0${Ship.pd(ship.limitFront)}`;
        } else {
            ship.gunsFront = "\u2013";
        }

        if (ship.gunsBack) {
            ship.gunsBack += `\u00A0${Ship.pd(ship.limitBack)}`;
        } else {
            ship.gunsBack = "\u2013";
        }

        $(`${this.select}`)
            .find("div")
            .append(Ship.getText(ship));
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

        this._pie = d3Pie()
            .sort(null)
            .value(1);
        const curve = d3CurveCatmullRomClosed;
        this._line = d3RadialLine()
            .angle((d, i) => i * segmentRadians)
            .radius(d => this.shipCompare.radiusSpeedScale(d.data))
            .curve(curve);
        this._arcsBase = this._pie(this.shipBaseData.speedDegrees);
        this._arcsComp = this._pie(this.shipCompareData.speedDegrees);
        this._speedDiff = this.shipCompareData.speedDegrees.map((speedShipCompare, i) =>
            roundToThousands(speedShipCompare - this.shipBaseData.speedDegrees[i])
        );
        this._minSpeedDiff = d3Min(this._speedDiff);
        this._maxSpeedDiff = d3Max(this._speedDiff);

        this._drawDifferenceProfile();
        this._injectTextComparison();
    }

    _setColourScale(minSpeedDiff, maxSpeedDiff) {
        // Compare with current min/max domain values
        const min = Math.min(minSpeedDiff, this._shipCompare.colourScaleSpeedDiff.domain()[0]);
        const max = Math.max(
            maxSpeedDiff,
            this._shipCompare.colourScaleSpeedDiff.domain()[this._shipCompare.colourScaleSpeedDiff.domain().length - 1]
        );

        this._shipCompare.colourScaleSpeedDiff.domain([min, 0, max]);
    }

    /**
     * Draw difference profile
     * @returns {void}
     */
    _drawDifferenceProfile() {
        // Add ship outline
        const { shipMass } = this._shipCompareData;
        const height = this._shipCompare.shipMassScale(shipMass);
        const width = height;

        this.mainG
            .append("image")
            .attr("height", height)
            .attr("width", width)
            .attr("x", -(width / 2))
            .attr("y", -(height / 2))
            .attr("class", "ship-outline")
            .attr("transform", "rotate(90)")
            .attr("xlink:href", shipIcon);

        // Base profile shape
        this.mainG
            .append("path")
            .attr("class", "base-profile")
            .attr("d", this._line(this._arcsBase));

        // Comp profile lines
        this.mainG
            .append("path")
            .attr("class", "comp-profile")
            .attr("d", this._line(this._arcsComp));
    }

    /**
     * Update difference profile
     * @returns {void}
     */
    updateDifferenceProfile() {
        this._setColourScale(this._minSpeedDiff, this._maxSpeedDiff);

        this.mainG
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("data-ui-component", "speed-markers")
            .selectAll("circle")
            .data(this._arcsComp)
            .join(enter => {
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this.shipCompare.radiusSpeedScale(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this.shipCompare.radiusSpeedScale(d.data))
                    .attr("fill", (d, i) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]))
                    .append("title")
                    .text(
                        (d, i) => `${Math.round(d.data * 10) / 10} (${formatSignFloat(this._speedDiff[i], 1)}) knots`
                    );
            })
            .select("circle")
            .attr("fill", (d, i) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]));

        // colourRamp(d3Select(this._select), this._shipCompare.colourScaleSpeedDiff, this._speedDiff.length);
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
         * @param {boolean} isPercentage - True if be to be formatted as percentage
         * @returns {string} HTML formatted string
         */
        function getDiff(a, b, decimals = 0, isPercentage = false) {
            let diff = parseFloat((a - b).toFixed(decimals));

            if (isPercentage) {
                diff *= 100;
            }

            if (diff < 0) {
                return `<span class="badge badge-danger">${formatFloat(Math.abs(diff))}</span>`;
            }

            if (diff > 0) {
                return `<span class="badge badge-success">${formatFloat(diff)}</span>`;
            }

            return "";
        }

        const hullRepairsNeededBase = Math.round(
            (this.shipBaseData.sides.armour * this.shipBaseData.repairAmount.armour) / hullRepairsVolume
        );
        const rigRepairsNeededBase = Math.round(
            (this.shipBaseData.sails.armour * this.shipBaseData.repairAmount.sails) / rigRepairsVolume
        );
        const rumRepairsNeededBase = Math.round(this.shipBaseData.crew.max * rumRepairsFactor);
        const hullRepairsNeededCompare = Math.round(
            (this.shipCompareData.sides.armour * this.shipCompareData.repairAmount.armour) / hullRepairsVolume
        );
        const rigRepairsNeededCompare = Math.round(
            (this.shipCompareData.sails.armour * this.shipCompareData.repairAmount.sails) / rigRepairsVolume
        );
        const rumRepairsNeededCompare = Math.round(this.shipCompareData.crew.max * rumRepairsFactor);

        const ship = {
            shipRating: `${getOrdinal(this.shipCompareData.class)} rate`,
            battleRating: `${this.shipCompareData.battleRating}\u00A0${getDiff(
                this.shipCompareData.battleRating,
                this.shipBaseData.battleRating
            )}`,
            guns: `${this.shipCompareData.guns}\u00A0${getDiff(this.shipCompareData.guns, this.shipBaseData.guns)}`,
            decks: `${this.shipCompareData.decks}\u00A0${getDiff(
                this.shipCompareData.decks,
                this.shipBaseData.decks
            )} deck${this.shipCompareData.decks > 1 ? "s" : ""}`,
            additionalRow: `${this.shipCompareData.decks < 4 ? "<br>\u00A0" : ""}`,
            cannonsPerDeck: Ship.getCannonsPerDeck(
                this.shipCompareData.deckClassLimit,
                this.shipCompareData.gunsPerDeck
            ),
            cannonBroadside: `${this.shipCompareData.broadside.cannons}\u00A0${getDiff(
                this.shipCompareData.broadside.cannons,
                this.shipBaseData.broadside.cannons
            )}`,
            carroBroadside: `${this.shipCompareData.broadside.carronades}\u00A0${getDiff(
                this.shipCompareData.broadside.carronades,
                this.shipBaseData.broadside.carronades
            )}`,
            gunsFront: this.shipCompareData.gunsPerDeck[4],
            limitFront: this.shipCompareData.deckClassLimit[4],
            gunsBack: this.shipCompareData.gunsPerDeck[5],
            limitBack: this.shipCompareData.deckClassLimit[5],
            minSpeed: `${formatFloat(this.shipCompareData.speed.min)}\u00A0${getDiff(
                this.shipCompareData.speed.min,
                this.shipBaseData.speed.min,
                2
            )}`,
            maxSpeed: `${formatFloat(this.shipCompareData.speed.max, 4)}\u00A0${getDiff(
                this.shipCompareData.speed.max,
                this.shipBaseData.speed.max,
                2
            )}`,
            maxTurningSpeed: `${formatFloat(this.shipCompareData.rudder.turnSpeed)}\u00A0${getDiff(
                this.shipCompareData.rudder.turnSpeed,
                this.shipBaseData.rudder.turnSpeed,
                2
            )}`,
            firezoneHorizontalWidth: `${this.shipCompareData.ship.firezoneHorizontalWidth}\u00A0${getDiff(
                this.shipCompareData.ship.firezoneHorizontalWidth,
                this.shipBaseData.ship.firezoneHorizontalWidth
            )}`,
            waterlineHeight: `${formatFloat(this.shipCompareData.ship.waterlineHeight)}\u00A0${getDiff(
                this.shipCompareData.ship.waterlineHeight,
                this.shipBaseData.ship.waterlineHeight,
                2
            )}`,
            acceleration: `${formatFloat(this.shipCompareData.ship.acceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.acceleration,
                this.shipBaseData.ship.acceleration,
                2
            )}`,
            deceleration: `${formatFloat(this.shipCompareData.ship.deceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.deceleration,
                this.shipBaseData.ship.deceleration,
                2
            )}`,
            halfturnTime: `${formatFloat(this.shipCompareData.rudder.halfturnTime)}\u00A0${getDiff(
                this.shipCompareData.rudder.halfturnTime,
                this.shipBaseData.rudder.halfturnTime
            )}`,
            sideArmor: `${formatIntTrunc(this.shipCompareData.sides.armour)}\u00A0${getDiff(
                this.shipCompareData.sides.armour,
                this.shipBaseData.sides.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.sides.thickness)}</span>${getDiff(
                this.shipCompareData.sides.thickness,
                this.shipBaseData.sides.thickness
            )}`,
            frontArmor: `${formatIntTrunc(this.shipCompareData.bow.armour)}\u00A0${getDiff(
                this.shipCompareData.bow.armour,
                this.shipBaseData.bow.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.bow.thickness)}</span>${getDiff(
                this.shipCompareData.bow.thickness,
                this.shipBaseData.bow.thickness
            )}`,
            backArmor: `${formatIntTrunc(this.shipCompareData.stern.armour)}\u00A0${getDiff(
                this.shipCompareData.stern.armour,
                this.shipBaseData.stern.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.stern.thickness)}</span>${getDiff(
                this.shipCompareData.stern.thickness,
                this.shipBaseData.stern.thickness
            )}`,
            pump: `${formatIntTrunc(this.shipCompareData.pump.armour)}\u00A0${getDiff(
                this.shipCompareData.pump.armour,
                this.shipBaseData.pump.armour
            )}`,
            sails: `${formatIntTrunc(this.shipCompareData.sails.armour)}\u00A0${getDiff(
                this.shipCompareData.sails.armour,
                this.shipBaseData.sails.armour
            )}`,
            structure: `${formatIntTrunc(this.shipCompareData.structure.armour)}\u00A0${getDiff(
                this.shipCompareData.structure.armour,
                this.shipBaseData.structure.armour
            )}`,
            rudder: `${formatIntTrunc(this.shipCompareData.rudder.armour)}\u00A0${getDiff(
                this.shipCompareData.rudder.armour,
                this.shipBaseData.rudder.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.rudder.thickness)}</span>${getDiff(
                this.shipCompareData.rudder.thickness,
                this.shipBaseData.rudder.thickness
            )}`,

            minCrew: `${formatIntTrunc(this.shipCompareData.crew.min)}\u00A0${getDiff(
                this.shipCompareData.crew.min,
                this.shipBaseData.crew.min
            )}`,
            maxCrew: `${formatIntTrunc(this.shipCompareData.crew.max)}\u00A0${getDiff(
                this.shipCompareData.crew.max,
                this.shipBaseData.crew.max
            )}`,
            sailingCrew: `${formatIntTrunc(this.shipCompareData.crew.sailing)}\u00A0${getDiff(
                this.shipCompareData.crew.sailing,
                this.shipBaseData.crew.sailing
            )}`,
            maxWeight: `${formatIntTrunc(this.shipCompareData.maxWeight)}\u00A0${getDiff(
                this.shipCompareData.maxWeight,
                this.shipBaseData.maxWeight
            )}`,
            holdSize: `${formatIntTrunc(this.shipCompareData.holdSize)}\u00A0${getDiff(
                this.shipCompareData.holdSize,
                this.shipBaseData.holdSize
            )}`,
            upgradeXP: `${formatIntTrunc(this.shipCompareData.upgradeXP)}\u00A0${getDiff(
                this.shipCompareData.upgradeXP,
                this.shipBaseData.upgradeXP
            )}`,
            hullRepairAmount: `${formatIntTrunc(
                (this.shipCompareData.repairAmount.armour + this.shipCompareData.repairAmount.armourPerk) * 100
            )}\u00A0${getDiff(
                this.shipCompareData.repairAmount.armour + this.shipCompareData.repairAmount.armourPerk,
                this.shipBaseData.repairAmount.armour + this.shipBaseData.repairAmount.armourPerk,
                3,
                true
            )}`,
            rigRepairAmount: `${formatIntTrunc(
                (this.shipCompareData.repairAmount.sails + this.shipCompareData.repairAmount.sailsPerk) * 100
            )}\u00A0${getDiff(
                this.shipCompareData.repairAmount.sails + this.shipCompareData.repairAmount.sailsPerk,
                this.shipBaseData.repairAmount.sails + this.shipBaseData.repairAmount.sailsPerk,
                3,
                true
            )}`,
            repairTime: `${formatIntTrunc(this.shipCompareData.repairTime.sides)}\u00A0${getDiff(
                this.shipBaseData.repairTime.sides,
                this.shipCompareData.repairTime.sides
            )}`,
            hullRepairsNeeded: `${formatIntTrunc(hullRepairsNeededCompare)}\u00A0${getDiff(
                hullRepairsNeededCompare,
                hullRepairsNeededBase
            )} <span class="badge badge-white">${formatIntTrunc(hullRepairsNeededCompare * repairsSetSize)}</span>`,
            rigRepairsNeeded: `${formatIntTrunc(rigRepairsNeededCompare)}\u00A0${getDiff(
                rigRepairsNeededCompare,
                rigRepairsNeededBase
            )} <span class="badge badge-white">${formatIntTrunc(rigRepairsNeededCompare * repairsSetSize)}</span>`,
            rumRepairsNeeded: `${formatIntTrunc(rumRepairsNeededCompare)}\u00A0${getDiff(
                rumRepairsNeededCompare,
                rumRepairsNeededBase
            )} <span class="badge badge-white">${formatIntTrunc(rumRepairsNeededCompare * repairsSetSize)}</span>`,
            fireResistance: `${formatPercent(this.shipCompareData.resistance.fire, 0)}\u00A0${getDiff(
                this.shipCompareData.resistance.fire,
                this.shipBaseData.resistance.fire,
                2,
                true
            )}`,
            leakResistance: `${formatPercent(this.shipCompareData.resistance.leaks, 0)}\u00A0${getDiff(
                this.shipCompareData.resistance.leaks,
                this.shipBaseData.resistance.leaks,
                2,
                true
            )}`,
            splinterResistance: `${formatPercent(this.shipCompareData.resistance.splinter, 0)}\u00A0${getDiff(
                this.shipCompareData.resistance.splinter,
                this.shipBaseData.resistance.splinter,
                2,
                true
            )}`,
            mastBottomArmor: `${formatIntTrunc(this.shipCompareData.mast.bottomArmour)}\u00A0${getDiff(
                this.shipCompareData.mast.bottomArmour,
                this.shipBaseData.mast.bottomArmour
            )} <span class="badge badge-white">${formatIntTrunc(
                this.shipCompareData.mast.bottomThickness
            )}</span>${getDiff(this.shipCompareData.mast.bottomThickness, this.shipBaseData.mast.bottomThickness)}`,
            mastMiddleArmor: `${formatIntTrunc(this.shipCompareData.mast.middleArmour)}\u00A0${getDiff(
                this.shipCompareData.mast.middleArmour,
                this.shipBaseData.mast.middleArmour
            )} <span class="badge badge-white">${formatIntTrunc(
                this.shipCompareData.mast.middleThickness
            )}</span>${getDiff(this.shipCompareData.mast.middleThickness, this.shipBaseData.mast.middleThickness)}`,
            mastTopArmor: `${formatIntTrunc(this.shipCompareData.mast.topArmour)}\u00A0${getDiff(
                this.shipCompareData.mast.topArmour,
                this.shipBaseData.mast.topArmour
            )} <span class="badge badge-white">${formatIntTrunc(
                this.shipCompareData.mast.topThickness
            )}</span>${getDiff(this.shipCompareData.mast.topThickness, this.shipBaseData.mast.topThickness)}`
        };

        if (ship.gunsFront) {
            ship.gunsFront += `\u00A0${Ship.pd(ship.limitFront)}`;
        } else {
            ship.gunsFront = "\u2013";
        }

        if (ship.gunsBack) {
            ship.gunsBack += `\u00A0${Ship.pd(ship.limitBack)}`;
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
     * @param {string} id - Base id (default "ship-compare")
     */
    constructor(id = "ship-compare") {
        this._baseId = id;

        this._baseName = "Compare ships";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._moduleId = `${this._baseId}-module`;
        this._copyButtonId = `button-copy-${this._baseId}`;

        this.colourScaleSpeedDiff = d3ScaleLinear()
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong);

        this._shipIds = [];
        this._selectedUpgradeIdsPerType = [];
        this._selectedUpgradeIdsList = [];
        this._selectShip$ = {};
        this._selectWood$ = {};
        this._selectModule$ = {};
        this._modal$ = null;
        this._modifierAmount = new Map();

        if (this._baseId === "ship-compare") {
            this._columnsCompare = ["C1", "C2"];
        } else {
            this._columnsCompare = [];
        }

        this._columns = this._columnsCompare.slice();
        this._columns.unshift("Base");

        this._selectedShips = { Base: {}, C1: {}, C2: {} };

        if (this._baseId === "ship-journey") {
            this._woodId = "wood-journey";
        } else {
            this._woodId = "wood-ship";
        }

        this._setupArrow();
        if (this._baseId !== "ship-journey") {
            this._setupListener();
        }
    }

    _setupArrow() {
        // Get current arrow
        const arrow = document.getElementById("journey-arrow");
        // Clone arrow and change properties
        const arrowNew = arrow.cloneNode(true);
        arrowNew.id = "wind-profile-arrow-head";
        if (arrowNew.hasChildNodes()) {
            arrowNew.childNodes.forEach(child => {
                child.classList.replace("journey-arrow-head", "wind-profile-arrow-head");
            });
        }

        // Insert new arrow
        const defs = document.querySelector("#na-map svg defs");
        defs.appendChild(arrowNew);
    }

    async shipJourneyInit() {
        await this._loadAndSetupData();
        this._initData();
        this._initSelects();
    }

    _setupData() {
        this._woodChanges = new Map([
            ["Acceleration", { properties: ["ship.acceleration"], isBaseValueAbsolute: true }],
            [
                "Armor thickness",
                { properties: ["sides.thickness", "bow.thickness", "stern.thickness"], isBaseValueAbsolute: true }
            ],
            [
                "Armour hit points",
                { properties: ["bow.armour", "sides.armour", "stern.armour"], isBaseValueAbsolute: true }
            ],
            ["Splinter resistance", { properties: ["resistance.splinter"], isBaseValueAbsolute: false }],
            ["Crew", { properties: ["crew.max"], isBaseValueAbsolute: true }],
            ["Fire resistance", { properties: ["resistance.fire"], isBaseValueAbsolute: false }],
            ["Hull hit points", { properties: ["structure.armour"], isBaseValueAbsolute: true }],
            ["Leak resistance", { properties: ["resistance.leaks"], isBaseValueAbsolute: false }],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    isBaseValueAbsolute: true
                }
            ],
            ["Rudder speed", { properties: ["rudder.halfturnTime"], isBaseValueAbsolute: true }],
            ["Max speed", { properties: ["speed.max"], isBaseValueAbsolute: true }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], isBaseValueAbsolute: true }]
        ]);

        this._moduleChanges = new Map([
            // ["Sail damage", [  ]],
            // ["Sail health", [  ]],
            ["Acceleration", { properties: ["ship.acceleration"], isBaseValueAbsolute: true }],
            [
                "Armor thickness",
                { properties: ["sides.thickness", "bow.thickness", "stern.thickness"], isBaseValueAbsolute: true }
            ],
            ["Armour repair amount (perk)", { properties: ["repairAmount.armourPerk"], isBaseValueAbsolute: true }],
            ["Armour repair amount", { properties: ["repairAmount.armour"], isBaseValueAbsolute: true }],
            [
                "Armour hit points",
                { properties: ["bow.armour", "sides.armour", "stern.armour"], isBaseValueAbsolute: true }
            ],
            ["Back armour thickness", { properties: ["stern.thickness"], isBaseValueAbsolute: true }],
            ["Splinter resistance", { properties: ["resistance.splinter"], isBaseValueAbsolute: false }],
            ["Crew", { properties: ["crew.max"], isBaseValueAbsolute: true }],
            ["Fire resistance", { properties: ["resistance.fire"], isBaseValueAbsolute: false }],
            ["Front armour thickness", { properties: ["bow.thickness"], isBaseValueAbsolute: true }],
            ["Hold weight", { properties: ["maxWeight"], isBaseValueAbsolute: true }],
            ["Hull hit points", { properties: ["structure.armour"], isBaseValueAbsolute: true }],
            ["Leak resistance", { properties: ["resistance.leaks"], isBaseValueAbsolute: false }],
            [
                "Mast health",
                { properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"], isBaseValueAbsolute: true }
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    isBaseValueAbsolute: true
                }
            ],
            ["Rudder health", { properties: ["rudder.armour"], isBaseValueAbsolute: true }],
            ["Rudder repair time", { properties: ["repairTime.rudder"], isBaseValueAbsolute: true }],
            ["Rudder speed", { properties: ["rudder.halfturnTime"], isBaseValueAbsolute: true }],
            ["Sail repair amount (perk)", { properties: ["repairAmount.sailsPerk"], isBaseValueAbsolute: true }],
            ["Sail repair amount", { properties: ["repairAmount.sails"], isBaseValueAbsolute: true }],
            ["Sail repair time", { properties: ["repairTime.sails"], isBaseValueAbsolute: true }],
            ["Sailing crew", { properties: ["crew.sailing"], isBaseValueAbsolute: true }],
            ["Max speed", { properties: ["speed.max"], isBaseValueAbsolute: true }],
            ["Side armour repair time", { properties: ["repairTime.sides"], isBaseValueAbsolute: true }],
            ["Speed decrease", { properties: ["ship.deceleration"], isBaseValueAbsolute: true }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], isBaseValueAbsolute: true }],
            ["Water pump health", { properties: ["pump.armour"], isBaseValueAbsolute: true }],
            ["Water repair time", { properties: ["repairTime.pump"], isBaseValueAbsolute: true }]
        ]);

        this._moduleCaps = new Map([
            [
                "Armor thickness",
                {
                    properties: ["sides.thickness", "bow.thickness", "stern.thickness"],
                    cap: { amount: 0.3, isPercentage: true }
                }
            ],
            [
                "Armour hit points",
                { properties: ["bow.armour", "sides.armour", "stern.armour"], cap: { amount: 0.3, isPercentage: true } }
            ],
            ["Structure hit points", { properties: ["structure.armour"], cap: { amount: 0.3, isPercentage: true } }],
            [
                "Mast health",
                {
                    properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
                    cap: { amount: 0.3, isPercentage: true }
                }
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    cap: { amount: 0.3, isPercentage: true }
                }
            ],
            ["Max speed", { properties: ["speed.max"], cap: { amount: 15.5, isPercentage: false } }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], cap: { amount: 0.25, isPercentage: true } }]
        ]);

        const theoreticalMinSpeed = d3Min(this._shipData, ship => ship.speed.min) * 1.2;
        const theoreticalMaxSpeed = this._moduleCaps.get("Max speed").cap.amount;

        this._minSpeed = theoreticalMinSpeed;
        this._maxSpeed = theoreticalMaxSpeed;
        this._colorScale = d3ScaleLinear()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong);

        const minShipMass = d3Min(this._shipData, ship => ship.shipMass);
        const maxShipMass = d3Max(this._shipData, ship => ship.shipMass);
        this.shipMassScale = d3ScaleLinear()
            .domain([minShipMass, maxShipMass])
            .range([100, 150]);
    }

    async _loadAndSetupData() {
        try {
            this._moduleDataDefault = (
                await import(/* webpackChunkName: "data-modules" */ "../../gen/modules.json")
            ).default;
            this._shipData = (await import(/* webpackChunkName: "data-ships" */ "../../gen/ships.json")).default;
            this._setupData();
        } catch (error) {
            putImportError(error);
        }
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        let firstClick = true;

        document.getElementById(this._buttonId).addEventListener("click", async event => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }

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
        this.svgWidth = parseInt($(`#${this._modalId} .column-base`).width(), 10);
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth;
        this.outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2);
        this.innerRadius = Math.floor(this.outerRadius * 0.3);
        this.radiusSpeedScale = d3ScaleLinear()
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
            this._modal$.on("keydown", event => {
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
        this._modal$.modal("show");
        this._setGraphicsParameters();
    }

    _getShipAndWoodIds() {
        const data = [];

        this._columns.forEach(columnId => {
            if (this._shipIds[columnId] !== undefined) {
                data.push(this._shipIds[columnId]);

                ["frame", "trim"].forEach(type => {
                    data.push(Number(this._selectWood$[columnId][type].val()));
                });
            }
        });

        return data;
    }

    _copyDataClicked(event) {
        registerEvent("Menu", "Copy ship compare");
        event.preventDefault();

        const ShipAndWoodIds = this._getShipAndWoodIds();

        if (ShipAndWoodIds.length) {
            const ShipCompareUrl = new URL(window.location);

            // Add app version
            ShipCompareUrl.searchParams.set("v", encodeURIComponent(appVersion));
            // Add selected ships and woods, triple (shipId, frameId, trimId) per column, flat array
            ShipCompareUrl.searchParams.set("cmp", hashids.encode(ShipAndWoodIds));

            // Add selected modules, new searchParam per module
            this._columns.forEach((columnId, columnIndex) => {
                if (this._selectedUpgradeIdsPerType[columnId]) {
                    [...this._moduleTypes].forEach((type, typeIndex) => {
                        const moduleIds = this._selectedUpgradeIdsPerType[columnId][type];

                        if (moduleIds && moduleIds.length) {
                            const param = `${columnIndex}${typeIndex}`;

                            ShipCompareUrl.searchParams.set(param, hashids.encode(moduleIds));
                        }
                    });
                }
            });

            copyToClipboard(ShipCompareUrl.href);
        }
    }

    /**
     * Setup ship data (group by class)
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
            this._moduleDataDefault.flatMap(type =>
                type[1]
                    .filter(module =>
                        module.properties.some(property => {
                            return this._moduleChanges.has(property.modifier);
                        })
                    )
                    .map(module => [module.id, module])
            )
        );

        // Get types from moduleProperties list
        this._moduleTypes = new Set(
            [...this._moduleProperties].map(module => module[1].type.replace(/\s\u2013\s[a-zA-Z/\u25CB\s]+/, ""))
        );
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
                .attr("class", `col-md-4 ml-auto pt-2 ${columnId === "Base" ? "column-base" : "column-comp"}`);

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
                    .property("multiple", true)
                    .attr("class", "selectpicker");
            });

            div.append("div")
                .attr("id", `${this._baseId}-${columnId}`)
                .attr("class", `${columnId === "Base" ? "ship-base" : "ship-compare"}`);
        });

        const footer = d3Select(`#${this._modalId} .modal-footer`);
        footer
            .insert("button", "button")
            .classed("btn btn-outline-secondary icon-outline-button", true)
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .classed("icon icon-copy", true);
    }

    _initData() {
        this._setupShipData();
        this._setupModuleData();
    }

    _initSelects() {
        this.woodCompare = new CompareWoods(this._woodId);
        this.woodCompare.woodInit().then(() => {
            this._columns.forEach(columnId => {
                this._selectWood$[columnId] = {};
                this._setupShipSelect(columnId);
                ["frame", "trim"].forEach(type => {
                    this._selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`);
                    this.woodCompare._setupWoodSelects(columnId, type, this._selectWood$[columnId][type]);
                });
                this._setupSelectListener(columnId);
            });
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
                                `<option data-subtext="${ship.battleRating}" value="${ship.id}">${ship.name} (${ship.guns})`
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

    static _getModuleLevel(rate) {
        return rate <= 3 ? "L" : rate <= 5 ? "M" : "S";
    }

    /**
     * Get select options
     * @param {string} moduleType - Module type
     * @param {number} shipClass - Ship class
     * @returns {string} HTML formatted option
     */
    _getUpgradesOptions(moduleType, shipClass) {
        // Nest module data by sub type (e.g. "Gunnery")
        const modules = d3Nest()
            .key(module => module[1].type.replace(/[a-zA-Z\s]+\s–\s/, ""))
            .sortKeys(d3Ascending)
            .entries(
                [...this._moduleProperties].filter(
                    module =>
                        module[1].type.replace(/\s–\s[a-zA-Z/\u25CB\s]+/, "") === moduleType &&
                        (module[1].moduleLevel === "U" ||
                            module[1].moduleLevel === CompareShips._getModuleLevel(shipClass))
                )
            );

        let options = "";
        const moduleTypeWithSingleOption = ["Permanent", "Ship trim"];
        if (modules.length > 1) {
            // Get options with sub types as optgroups
            options = modules
                .map(
                    group =>
                        `<optgroup label="${group.key}" data-max-options="${
                            moduleTypeWithSingleOption.includes(moduleType.replace(/[a-zA-Z\s]+\s–\s/, "")) ? 1 : 5
                        }">${group.values
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

    _fillModuleSelect(columnId, type) {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getShipClass = () => this._shipData.find(ship => ship.id === this._shipIds[columnId]).class;

        const options = this._getUpgradesOptions(type, getShipClass());

        this._selectModule$[columnId][type].find("option").remove();
        this._selectModule$[columnId][type].append(options);
    }

    _resetModuleSelects(columnId) {
        this._moduleTypes.forEach(type => {
            this._fillModuleSelect(columnId, type);
            this._selectModule$[columnId][type].selectpicker("refresh");
        });
    }

    _getModuleFromName(moduleName) {
        let module = {};

        this._moduleDataDefault.some(type => {
            module = type[1].find(module => module.name === moduleName);
            return Boolean(module);
        });

        return module;
    }

    _getModifierFromModule(properties) {
        return `<p class="mb-0">${properties
            .map(property => {
                const amount = property.isPercentage
                    ? formatSignPercent(property.amount / 100)
                    : property.amount < 1 && property.amount > 0
                    ? formatPP(property.amount)
                    : formatSignInt(property.amount);
                return `${property.modifier} ${amount}`;
            })
            .join("<br>")}</p>`;
    }

    /**
     * Setup upgrades select
     * @param {string} columnId - Column id
     * @returns {void}
     */
    _setupModulesSelect(columnId) {
        if (!this._selectModule$[columnId]) {
            this._selectModule$[columnId] = {};

            this._moduleTypes.forEach(type => {
                this._selectModule$[columnId][type] = $(`#${this._getModuleSelectId(type, columnId)}`);
                this._selectModule$[columnId][type]
                    .on("changed.bs.select", () => {
                        this._modulesSelected(columnId);
                        this._refreshShips(columnId);
                    })
                    .on("show.bs.select", event => {
                        const $el = $(event.currentTarget);

                        // Remove 'select all' button
                        $el.parent()
                            .find("button.bs-select-all")
                            .remove();
                    })
                    .on("show.bs.select", event => {
                        const $el = $(event.currentTarget);

                        // Add tooltip
                        $el.data("selectpicker").selectpicker.current.elements.forEach(element => {
                            if (
                                !(
                                    element.classList.contains("dropdown-divider") ||
                                    element.classList.contains("dropdown-header")
                                )
                            ) {
                                const module = this._getModuleFromName(element.innerText);

                                // Add tooltip with module properties
                                $(element)
                                    .attr("data-original-title", this._getModifierFromModule(module.properties))
                                    .tooltip({ boundary: "viewport", html: true });
                            }
                        });
                    })
                    .selectpicker({
                        actionsBox: true,
                        countSelectedText(amount) {
                            return `${amount} ${type.toLowerCase()}s selected`;
                        },
                        deselectAllText: "Clear",
                        liveSearch: true,
                        liveSearchNormalize: true,
                        liveSearchPlaceholder: "Search ...",
                        maxOptions: type.startsWith("Ship trim") ? 6 : 5,
                        selectedTextFormat: "count > 1",
                        title: `${type}`,
                        width: "150px"
                    });
            });
        }

        this._resetModuleSelects(columnId);
    }

    /**
     * Get ship data for ship with id <id>
     * @param {string} columnId - Column id
     * @returns {Object} Ship data
     */
    _getShipData(columnId) {
        const shipDataDefault = this._shipData.find(ship => ship.id === this._shipIds[columnId]);
        let shipDataUpdated = shipDataDefault;

        shipDataUpdated.repairAmount = {
            armour: hullRepairsPercent,
            armourPerk: 0,
            sails: rigRepairsPercent,
            sailsPerk: 0
        };
        shipDataUpdated.repairTime.sides = repairTime;
        shipDataUpdated.repairTime.default = repairTime;

        shipDataUpdated = this._addWoodData(shipDataDefault, columnId);
        shipDataUpdated = this._addModulesData(shipDataDefault, shipDataUpdated, columnId);

        return shipDataUpdated;
    }

    static _adjustAbsolute(currentValue, additionalValue) {
        return currentValue ? currentValue + additionalValue : additionalValue;
    }

    static _adjustPercentage(currentValue, additionalValue, isBaseValueAbsolute) {
        return currentValue
            ? isBaseValueAbsolute
                ? currentValue * (1 + additionalValue)
                : currentValue + additionalValue
            : additionalValue;
    }

    _adjustValue(value, key, isBaseValueAbsolute) {
        let adjustedValue = value;

        if (this._modifierAmount.get(key).absolute) {
            const { absolute } = this._modifierAmount.get(key);
            adjustedValue = CompareShips._adjustAbsolute(adjustedValue, absolute);
        }

        if (this._modifierAmount.get(key).percentage) {
            const percentage = this._modifierAmount.get(key).percentage / 100;
            adjustedValue = CompareShips._adjustPercentage(adjustedValue, percentage, isBaseValueAbsolute);
        }

        return adjustedValue;
    }

    _setModifier(property) {
        let absolute = property.isPercentage ? 0 : property.amount;
        let percentage = property.isPercentage ? property.amount : 0;

        // If modifier has been in the Map add the amount
        if (this._modifierAmount.has(property.modifier)) {
            absolute += this._modifierAmount.get(property.modifier).absolute;
            percentage += this._modifierAmount.get(property.modifier).percentage;
        }

        this._modifierAmount.set(property.modifier, {
            absolute,
            percentage
        });
    }

    /**
     * Add to ship data changes based on selected woods
     * @param {*} shipData - Ship id
     * @param {*} compareId - Column id
     * @returns {Object} - Updated ship data
     */
    _addWoodData(shipData, compareId) {
        const data = JSON.parse(JSON.stringify(shipData));

        data.resistance = {
            fire: 0,
            leaks: 0,
            splinter: 0
        };

        if (typeof this.woodCompare._instances[compareId] !== "undefined") {
            let dataLink = "_woodData";
            if (compareId !== "Base") {
                dataLink = "_compareData";
            }

            this._modifierAmount = new Map();
            // Add modifier amount for both frame and trim
            ["frame", "trim"].forEach(type => {
                this.woodCompare._instances[compareId][dataLink][type].properties.forEach(property => {
                    if (this._woodChanges.has(property.modifier)) {
                        this._setModifier(property);
                    }
                });
            });

            this._modifierAmount.forEach((value, key) => {
                // noinspection DuplicatedCode
                this._woodChanges.get(key).properties.forEach(modifier => {
                    const index = modifier.split(".");

                    if (index.length > 1) {
                        data[index[0]][index[1]] = this._adjustValue(
                            data[index[0]][index[1]],
                            key,
                            this._woodChanges.get(key).isBaseValueAbsolute
                        );
                    } else {
                        data[index[0]] = this._adjustValue(
                            data[index[0]],
                            key,
                            this._woodChanges.get(key).isBaseValueAbsolute
                        );
                    }
                });
            });

            data.speedDegrees = data.speedDegrees.map(speed => {
                const factor = 1 + this._modifierAmount.get("Max speed").percentage / 100;
                return Math.max(Math.min(speed * factor, this._maxSpeed), this._minSpeed);
            });
        }

        return data;
    }

    _showCappingAdvice(compareId) {
        const id = `${this._baseId}-${compareId}-capping`;

        if (!document.getElementById(id)) {
            const div = document.createElement("p");
            div.id = id;
            div.className = "alert alert-warning";
            div.innerHTML = "Values capped";

            const element = document.getElementById(`${this._baseId}-${compareId}`);
            element.firstChild.after(div);
        }
    }

    _removeCappingAdvice(compareId) {
        const id = `${this._baseId}-${compareId}-capping`;
        const div = document.getElementById(id);
        if (div) {
            div.remove();
        }
    }

    /**
     * Add upgrade changes to ship data
     * @param {*} shipDataBase - Base ship data
     * @param {*} shipDataUpdated - Updated ship data
     * @param {*} compareId - Column id
     * @returns {Object} - Updated ship data
     */
    _addModulesData(shipDataBase, shipDataUpdated, compareId) {
        const data = JSON.parse(JSON.stringify(shipDataUpdated));
        this._modifierAmount = new Map();

        const setSpeedDegrees = () => {
            data.speedDegrees = data.speedDegrees.map(speed => {
                const factor = 1 + this._modifierAmount.get("Max speed").percentage / 100;
                const newSpeed = speed > 0 ? speed * factor : speed / factor;
                // Correct speed by caps
                return Math.max(Math.min(newSpeed, this._maxSpeed), this._minSpeed);
            });
        };

        const setModifierAmounts = () => {
            this._selectedUpgradeIdsList[compareId].forEach(id => {
                const module = this._moduleProperties.get(id);

                module.properties.forEach(property => {
                    if (this._moduleChanges.has(property.modifier)) {
                        this._setModifier(property);
                    }
                });
            });
        };

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const adjustDataByModifiers = () => {
            this._modifierAmount.forEach((value, key) => {
                if (this._moduleChanges.get(key).properties) {
                    // noinspection DuplicatedCode
                    this._moduleChanges.get(key).properties.forEach(modifier => {
                        const index = modifier.split(".");

                        if (index.length > 1) {
                            data[index[0]][index[1]] = this._adjustValue(
                                data[index[0]][index[1]],
                                key,
                                this._moduleChanges.get(key).isBaseValueAbsolute
                            );
                        } else {
                            data[index[0]] = this._adjustValue(
                                data[index[0]],
                                key,
                                this._moduleChanges.get(key).isBaseValueAbsolute
                            );
                        }
                    });
                }
            });
        };

        const adjustDataByCaps = () => {
            let valueCapped = false;
            const adjustValue = (currentValue, baseValue, capAmount, isPercentage) => {
                const newValue = Math.min(currentValue, isPercentage ? baseValue * (1 + capAmount) : capAmount);
                if (currentValue !== newValue) {
                    valueCapped = true;
                }

                return newValue;
            };

            this._modifierAmount.forEach((value, key) => {
                if (this._moduleCaps.has(key)) {
                    const { cap } = this._moduleCaps.get(key);
                    this._moduleCaps.get(key).properties.forEach(property => {
                        const index = property.split(".");
                        if (index.length > 1) {
                            if (data[index[0]][index[1]]) {
                                data[index[0]][index[1]] = adjustValue(
                                    data[index[0]][index[1]],
                                    shipDataBase[index[0]][index[1]],
                                    cap.amount,
                                    cap.isPercentage
                                );
                            }
                        } else if (data[index[0]]) {
                            data[index[0]] = adjustValue(
                                data[index[0]],
                                shipDataBase[index[0]],
                                cap.amount,
                                cap.isPercentage
                            );
                        }
                    });
                }
            });

            if (valueCapped) {
                this._showCappingAdvice(compareId);
            } else {
                this._removeCappingAdvice(compareId);
            }
        };

        if (!this._selectedUpgradeIdsList[compareId]) {
            return data;
        }

        setModifierAmounts();

        adjustDataByModifiers();
        adjustDataByCaps();
        if (this._modifierAmount.has("Max speed")) {
            setSpeedDegrees();
        }

        return data;
    }

    _updateDifferenceProfileNeeded(id) {
        if (id !== "Base" && !isEmpty(this._selectedShips[id])) {
            this._selectedShips[id].updateDifferenceProfile();
        }
    }

    /**
     * Update sailing profile for compared ship
     * @param {*} compareId - Column id
     * @returns {void}
     */
    _updateSailingProfile(compareId) {
        // Update recent changes first
        this._updateDifferenceProfileNeeded(compareId);
        // Then update the rest of columns
        this._columnsCompare
            .filter(otherCompareId => otherCompareId !== compareId)
            .forEach(otherCompareId => {
                this._updateDifferenceProfileNeeded(otherCompareId);
            });
    }

    /**
     * Refresh ship data
     * @param {*} compareId - Column id
     * @returns {void}
     */
    _refreshShips(compareId) {
        if (this._baseId !== "ship-journey") {
            this._modulesSelected(compareId);
        }

        const singleShipData = this._getShipData(compareId);
        if (this._baseId === "ship-journey") {
            this._singleShipData = singleShipData;
        } else if (compareId === "Base") {
            this._setSelectedShip(compareId, new ShipBase(compareId, singleShipData, this));
            this._columnsCompare.forEach(otherCompareId => {
                this._selectShip$[otherCompareId].removeAttr("disabled").selectpicker("refresh");
                if (!isEmpty(this.selectedShips[otherCompareId])) {
                    this._setSelectedShip(
                        otherCompareId,
                        new ShipComparison(
                            otherCompareId,
                            singleShipData,
                            this.selectedShips[otherCompareId]._shipCompareData,
                            this
                        )
                    );
                }
            });
        } else {
            this._setSelectedShip(
                compareId,
                new ShipComparison(compareId, this.selectedShips.Base._shipData, singleShipData, this)
            );
        }

        this._updateSailingProfile(compareId);
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

    _modulesSelected(compareId) {
        this._selectedUpgradeIdsList[compareId] = [];
        this._selectedUpgradeIdsPerType[compareId] = {};

        this._moduleTypes.forEach(type => {
            this._selectedUpgradeIdsPerType[compareId][type] = this._selectModule$[compareId][type].val();
            if (Array.isArray(this._selectedUpgradeIdsPerType[compareId][type])) {
                // Multiple selects
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][type].map(
                    Number
                );
            } else {
                // Single select
                this._selectedUpgradeIdsPerType[compareId][type] =
                    this._selectedUpgradeIdsPerType[compareId][type] === ""
                        ? []
                        : [Number(this._selectedUpgradeIdsPerType[compareId][type])];
            }

            if (this._selectedUpgradeIdsPerType[compareId][type].length) {
                this._selectedUpgradeIdsList[compareId] = this._selectedUpgradeIdsList[compareId].concat(
                    this._selectedUpgradeIdsPerType[compareId][type]
                );
            }
            // console.log("_modulesSelected", compareId, type, this._selectedUpgradeIdsPerType[compareId][type]);
        });
    }

    /**
     * Listener for the select
     * @param {string} compareId - Column id
     * @returns {void}
     */
    _setupSelectListener(compareId) {
        this._selectShip$[compareId].selectpicker({ title: "Ship" }).on("changed.bs.select", () => {
            this._shipIds[compareId] = Number(this._selectShip$[compareId].val());
            if (this._baseId !== "ship-journey") {
                this._setupModulesSelect(compareId);
            }

            this._refreshShips(compareId);
            if (compareId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects();
            }

            this.woodCompare.enableSelects(compareId);
        });

        ["frame", "trim"].forEach(type => {
            this._selectWood$[compareId][type]
                .on("changed.bs.select", () => {
                    this.woodCompare._woodSelected(compareId, type, this._selectWood$[compareId][type]);
                    this._refreshShips(compareId);
                })
                .selectpicker({ title: `Wood ${type}`, width: "150px" });
        });
    }

    static _setSelect(select$, id) {
        if (id) {
            select$.val(id);
        }

        select$.selectpicker("render");
    }

    _setShipAndWoodsSelects(ids) {
        let i = 0;

        this._columns.some(columnId => {
            if (!this._shipData.find(ship => ship.id === ids[i])) {
                return false;
            }

            this._shipIds[columnId] = ids[i];
            i += 1;
            CompareShips._setSelect(this._selectShip$[columnId], this._shipIds[columnId]);
            if (columnId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects();
            }

            this.woodCompare.enableSelects(columnId);
            this._setupModulesSelect(columnId);

            if (ids[i]) {
                ["frame", "trim"].forEach(type => {
                    CompareShips._setSelect(this._selectWood$[columnId][type], ids[i]);
                    i += 1;
                    this.woodCompare._woodSelected(columnId, type, this._selectWood$[columnId][type]);
                });
            } else {
                i += 2;
            }

            this._refreshShips(columnId);
            return i >= ids.length;
        });
    }

    /**
     * Get selected modules, new searchParam per module
     * @return {void}
     */
    _setModuleSelects(urlParams) {
        this._columns.forEach((columnId, columnIndex) => {
            let needRefresh = false;
            [...this._moduleTypes].forEach((type, typeIndex) => {
                if (urlParams.has(`${columnIndex}${typeIndex}`)) {
                    const moduleIds = hashids.decode(urlParams.get(`${columnIndex}${typeIndex}`));
                    if (!this._selectedUpgradeIdsPerType[columnId]) {
                        this._selectedUpgradeIdsPerType[columnId] = {};
                    }

                    if (!this._selectedUpgradeIdsList[columnId]) {
                        this._selectedUpgradeIdsList[columnId] = [];
                    }

                    // console.log("moduleIds", { columnId }, { type }, { moduleIds });
                    this._selectedUpgradeIdsPerType[columnId][type] = moduleIds.map(Number);
                    this._setSelect(
                        this._selectModule$[columnId][type],
                        this._selectedUpgradeIdsPerType[columnId][type]
                    );
                    this._selectedUpgradeIdsList[columnId] = this._selectedUpgradeIdsList[columnId].concat(
                        this._selectedUpgradeIdsPerType[columnId][type]
                    );
                    needRefresh = true;
                }
            });
            if (needRefresh) {
                this._refreshShips(columnId);
            }
        });
    }

    initFromClipboard(urlParams) {
        const shipAndWoodsIds = hashids.decode(urlParams.get("cmp"));
        if (shipAndWoodsIds.length) {
            this._shipCompareSelected();
            if (shipAndWoodsIds.length > 3) {
                this._enableCompareSelects();
            }

            this._setShipAndWoodsSelects(shipAndWoodsIds);
            this._setModuleSelects(urlParams);
        }
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

    set woodCompare(woodCompare) {
        this._woodCompare = woodCompare;
    }

    get woodCompare() {
        return this._woodCompare;
    }

    _setSelectedShip(columnId, ship) {
        this._selectedShips[columnId] = ship;
    }

    get selectedShips() {
        return this._selectedShips;
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

    set radiusSpeedScale(scale) {
        this._radiusSpeedScale = scale;
    }

    get radiusSpeedScale() {
        return this._radiusSpeedScale;
    }
}
