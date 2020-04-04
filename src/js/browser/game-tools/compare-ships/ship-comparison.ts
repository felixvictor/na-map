/*!
 * This file is part of na-map.
 *
 * @file      Compare ships comparison file.
 * @module    game-tools/compare-ships/ship-comparison
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */


import { formatFloat, formatIntTrunc, formatPercent, formatSignFloat } from "../../../common/common-format"
import { degreesToCompass } from "../../../common/common-math"
import { scaleLinear as d3ScaleLinear } from "d3-scale"
import { event as d3Event } from "d3-selection"
import { rotationAngleInDegrees } from "../../util"
import { drag as d3Drag } from "d3-drag"
import { curveCatmullRomClosed as d3CurveCatmullRomClosed, pie as d3Pie, radialLine as d3RadialLine } from "d3-shape"
import { max as d3Max, min as d3Min } from "d3-array"
import { Ship } from "./ship"

export class ShipComparison extends Ship {
    /**
     * @param compareId - Compare id
     * @param {Object} shipBaseData - Base ship data
     * @param {Object} shipCompareData - Ship data of the ship to be compared to
     * @param shipCompare - Class instance of the ship to be compared to
     */
    constructor(compareId: string, shipBaseData, shipCompareData, shipCompare: CompareShips) {
        super(compareId, shipCompare)

        this._shipBaseData = shipBaseData
        this._shipCompareData = shipCompareData
        this._shipCompare = shipCompare

        this._setupDrag()
        this._drawDifferenceProfile()
        this._setupShipOutline()
        this._injectTextComparison()
    }

    _setColourScale(minSpeedDiff, maxSpeedDiff) {
        // Compare with current min/max domain values
        const min = Math.min(minSpeedDiff, this._shipCompare.colourScaleSpeedDiff.domain()[0])
        const max = Math.max(
            maxSpeedDiff,
            this._shipCompare.colourScaleSpeedDiff.domain()[this._shipCompare.colourScaleSpeedDiff.domain().length - 1]
        )

        this._shipCompare.colourScaleSpeedDiff.domain([min, 0, max])
    }

    _getHeadingInDegrees(rotate, degrees) {
        let heading = rotate - degrees - 180
        if (heading < 0) {
            heading += 360
        }

        return heading
    }

    _getSpeed(rotate) {
        return formatFloat(this._speedScale(Math.abs(rotate)))
    }

    _getHeadingInCompass(rotate) {
        return degreesToCompass(rotate)
    }

    _updateSpeedText() {
        this._speedText
            .attr("transform", `rotate(${-this._shipRotate})`)
            .text(this._getSpeed(this._shipCompare.windProfileRotate - this._shipRotate))
    }

    _setupDrag() {
        const steps = this._shipCompareData.speedDegrees.length
        const degreesPerStep = 360 / steps
        const domain = new Array(steps + 1).fill().map((e, i) => i * degreesPerStep)
        this._speedScale = d3ScaleLinear()
            .domain(domain)
            .range([...this._shipCompareData.speedDegrees, this._shipCompareData.speedDegrees[0]])
            .clamp(true)

        const dragStart = (d) => {
            d.this.classed("drag-active", true)
        }

        const dragged = (d) => {
            const update = () => {
                d.this.attr("transform", (d) => `rotate(${d.rotate})`)
                d.compassText
                    .attr("transform", (d) => `rotate(${-d.rotate},${d.compassTextX},${d.compassTextY})`)
                    .text((d) => this._getHeadingInCompass(d.rotate))
                this._shipRotate = d.rotate
                this._updateSpeedText()
            }

            const { x: xMouse, y: yMouse } = d3Event
            d.rotate = this._getHeadingInDegrees(
                rotationAngleInDegrees({ x: d.initX, y: d.initY }, { x: xMouse, y: yMouse }),
                d.correctionValueDegrees
            )
            update()
        }

        const dragEnd = (d) => {
            d.this.classed("drag-active", false)
        }

        this._drag = d3Drag()
            .on("start", dragStart)
            .on("drag", dragged)
            .on("end", dragEnd)
            .container(() => this.mainG.node())
    }

    _setupShipOutline() {
        this._shipRotate = 0
        const { shipMass } = this._shipCompareData
        const heightShip = this._shipCompare.shipMassScale(shipMass)
        const widthShip = heightShip
        const circleSize = 20
        const svgHeight = this._shipCompare.svgHeight / 2 - 2 * circleSize

        const datum = {
            initX: 0,
            initY: 0,
            initRotate: this._shipRotate,
            correctionValueDegrees: 180,
            compassTextX: 0,
            compassTextY: svgHeight,
            speedTextX: 0,
            speedTextY: 0,
            type: "ship",
        }

        const gShip = this.mainG.append("g").datum(datum).attr("class", "ship-outline")

        gShip
            .append("line")
            .attr("x1", (d) => d.initX)
            .attr("y1", svgHeight - circleSize)
            .attr("x2", (d) => d.initX)
            .attr("y2", (d) => d.initY)

        gShip
            .append("image")
            .attr("height", heightShip)
            .attr("width", widthShip)
            .attr("x", -heightShip / 2)
            .attr("y", -widthShip / 2)
            .attr("xlink:href", shipIcon)

        gShip
            .append("circle")
            .attr("cx", (d) => d.compassTextX)
            .attr("cy", (d) => d.compassTextY)
            .attr("r", circleSize)
            .call(this._drag)

        const compassText = gShip
            .append("text")
            .attr("x", (d) => d.compassTextX)
            .attr("y", (d) => d.compassTextY)
            .attr("transform", (d) => `rotate(${-d.initRotate},${d.compassTextX},${d.compassTextY})`)
            .text((d) => this._getHeadingInCompass(d.initRotate))

        this._speedText = gShip
            .append("text")
            .attr("x", (d) => d.speedTextX)
            .attr("y", (d) => d.speedTextY)
            .attr("transform", (d) => `rotate(${-d.initRotate})`)
            .text((d) => this._getSpeed(this._shipCompare.windProfileRotate - d.initRotate))

        datum.this = gShip
        datum.compassText = compassText
        gShip.datum(datum).attr("transform", (d) => `rotate(${d.initRotate})`)
    }

    /**
     * Draw difference profile
     * @returns {void}
     */
    _drawDifferenceProfile() {
        this._pie = d3Pie().sort(null).value(1)

        const arcsBase = this._pie(this._shipBaseData.speedDegrees)
        this._arcsComp = this._pie(this._shipCompareData.speedDegrees)

        this._speedDiff = this._shipCompareData.speedDegrees.map((speedShipCompare, i) =>
            roundToThousands(speedShipCompare - this._shipBaseData.speedDegrees[i])
        )
        this._minSpeedDiff = d3Min(this._speedDiff)
        this._maxSpeedDiff = d3Max(this._speedDiff)

        const curve = d3CurveCatmullRomClosed
        const line = d3RadialLine()
            .angle((d, i) => i * segmentRadians)
            .radius((d) => this._shipCompare.radiusSpeedScale(d.data))
            .curve(curve)

        // Profile shape
        const circleSize = 20
        const svgHeight = this._shipCompare.svgHeight / 2 - circleSize
        this._windProfile = {
            initX: 0,
            initY: 0,
            initRotate: this._shipCompare.windProfileRotate,
            correctionValueDegrees: 0,
            compassTextX: 0,
            compassTextY: -svgHeight,
            type: "windProfile",
        }

        this._gWindProfile = this.mainG
            .append("g")
            .attr("class", "wind-profile")
            .attr("transform", `rotate(${this._windProfile.initRotate})`)

        // Base profile shape
        this._gWindProfile.append("path").attr("class", "base-profile").attr("d", line(arcsBase))

        // Comp profile lines
        this._gWindProfile.append("path").attr("class", "comp-profile").attr("d", line(this._arcsComp))
    }

    updateWindProfileRotation() {
        this._gWindProfile.attr("transform", `rotate(${this._shipCompare.windProfileRotate})`)
        this._updateSpeedText()
    }

    /**
     * Update difference profile
     * @returns {void}
     */
    updateDifferenceProfile() {
        this._setColourScale(this._minSpeedDiff, this._maxSpeedDiff)

        this._gWindProfile
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("data-ui-component", "speed-markers")
            .selectAll("circle")
            .data(this._arcsComp)
            .join((enter) => {
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusSpeedScale(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusSpeedScale(d.data))
                    .attr("fill", (d, i) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]))
                    .append("title")
                    .text((d, i) => `${Math.round(d.data * 10) / 10} (${formatSignFloat(this._speedDiff[i], 1)}) knots`)
            })
            .select("circle")
            .attr("fill", (d, i) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]))

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
            let diff = Number.parseFloat((a - b).toFixed(decimals))

            if (isPercentage) {
                diff *= 100
            }

            if (diff < 0) {
                return `<span class="badge badge-danger">${formatFloat(Math.abs(diff))}</span>`
            }

            if (diff > 0) {
                return `<span class="badge badge-success">${formatFloat(diff)}</span>`
            }

            return ""
        }

        const hullRepairsNeededBase = Math.round(
            (this.shipBaseData.sides.armour * this.shipBaseData.repairAmount.armour) / hullRepairsVolume
        )
        const rigRepairsNeededBase = Math.round(
            (this.shipBaseData.sails.armour * this.shipBaseData.repairAmount.sails) / rigRepairsVolume
        )
        const rumRepairsNeededBase = Math.round(this.shipBaseData.crew.max * rumRepairsFactor)
        const hullRepairsNeededCompare = Math.round(
            (this.shipCompareData.sides.armour * this.shipCompareData.repairAmount.armour) / hullRepairsVolume
        )
        const rigRepairsNeededCompare = Math.round(
            (this.shipCompareData.sails.armour * this.shipCompareData.repairAmount.sails) / rigRepairsVolume
        )
        const rumRepairsNeededCompare = Math.round(this.shipCompareData.crew.max * rumRepairsFactor)

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
            maxTurningSpeed: `${formatFloat(this.shipCompareData.rudder.turnSpeed, 4)}\u00A0${getDiff(
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
            halfturnTime: `${formatFloat(this.shipCompareData.rudder.halfturnTime, 4)}\u00A0${getDiff(
                this.shipCompareData.rudder.halfturnTime,
                this.shipBaseData.rudder.halfturnTime,
                2
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
                this.shipBaseData.upgradeXP,
                this.shipCompareData.upgradeXP
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
            )}</span>${getDiff(this.shipCompareData.mast.topThickness, this.shipBaseData.mast.topThickness)}`,
        }

        if (ship.gunsFront) {
            ship.gunsFront += `\u00A0${Ship.pd(ship.limitFront)}`
        } else {
            ship.gunsFront = "\u2013"
        }

        if (ship.gunsBack) {
            ship.gunsBack += `\u00A0${Ship.pd(ship.limitBack)}`
        } else {
            ship.gunsBack = "\u2013"
        }

        $(`${this.select}`).find("div").append(Ship.getText(ship))
    }

    get shipBaseData() {
        return this._shipBaseData
    }

    get shipCompareData() {
        return this._shipCompareData
    }

    get shipCompare() {
        return this._shipCompare
    }
}
