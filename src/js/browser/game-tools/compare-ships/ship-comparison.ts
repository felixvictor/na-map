/*!
 * This file is part of na-map.
 *
 * @file      Compare ships comparison file.
 * @module    game-tools/compare-ships/ship-comparison
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max, min as d3Min } from "d3-array"
import * as d3Drag from "d3-drag"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { event as d3Event } from "d3-selection"
import * as d3Selection from "d3-selection"
import {
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    PieArcDatum,
    lineRadial as d3LineRadial,
} from "d3-shape"

import { formatFloat, formatIntTrunc, formatPercent, formatSignFloat } from "../../../common/common-format"
import { degreesToCompass, getOrdinal, roundToThousands } from "../../../common/common-math"
import {
    HtmlString,
    hullRepairsVolume,
    repairsSetSize,
    rigRepairsVolume,
    rumRepairsFactor,
    segmentRadians,
} from "../../../common/common-browser"
import { rotationAngleInDegrees } from "../../util"
import { default as shipIcon } from "Icons/icon-ship.svg"

import { Ship } from "./ship"
import { CompareShips } from "./compare-ships"

import { ShipData } from "../../../common/gen-json"
import { DragData, ShipDisplayData } from "./types"

export class ShipComparison extends Ship {
    // Ship data of the ship to be compared to
    readonly shipCompareData: ShipData
    // Base ship data
    private readonly _shipBaseData: ShipData
    private _speedScale!: ScaleLinear<number, number>
    private _speedDiff!: number[]
    private _minSpeedDiff!: number
    private _maxSpeedDiff!: number
    private _shipRotate!: number
    private _speedText!: d3Selection.Selection<SVGTextElement, DragData, HTMLElement, any>
    private _drag!: d3Drag.DragBehavior<SVGCircleElement | SVGPathElement, DragData, any>
    private _windProfile!: DragData
    private _gWindProfile!: d3Selection.Selection<SVGGElement, unknown, HTMLElement, any>
    private _arcsComp!: Array<PieArcDatum<number | { valueOf(): number }>>

    constructor(compareId: string, shipBaseData: ShipData, shipCompareData: ShipData, shipCompare: CompareShips) {
        super(compareId, shipCompare)

        this._shipBaseData = shipBaseData
        this.shipCompareData = shipCompareData

        this._setupDrag()
        this._drawDifferenceProfile()
        this._setupShipOutline()
        this._injectTextComparison()
    }

    _setColourScale(minSpeedDiff: number, maxSpeedDiff: number): void {
        // Compare with current min/max domain values
        const min = Math.min(minSpeedDiff, this._shipCompare.colourScaleSpeedDiff.domain()[0])
        const max = Math.max(
            maxSpeedDiff,
            this._shipCompare.colourScaleSpeedDiff.domain()[this._shipCompare.colourScaleSpeedDiff.domain().length - 1]
        )

        this._shipCompare.colourScaleSpeedDiff.domain([min, 0, max])
    }

    _getHeadingInDegrees(rotate: number, degrees: number): number {
        let heading = rotate - degrees - 180
        if (heading < 0) {
            heading += 360
        }

        return heading
    }

    _getSpeed(rotate: number): string {
        return formatFloat(this._speedScale(Math.abs(rotate)))
    }

    _getHeadingInCompass(rotate: number): string {
        return degreesToCompass(rotate)
    }

    _updateSpeedText(): void {
        this._speedText
            .attr("transform", `rotate(${-this._shipRotate})`)
            .text(this._getSpeed(this._shipCompare.windProfileRotate - this._shipRotate))
    }

    _setupDrag(): void {
        const steps = this.shipCompareData.speedDegrees.length
        const degreesPerStep = 360 / steps
        const domain = new Array(steps + 1).fill(0).map((e, i) => i * degreesPerStep)
        this._speedScale = d3ScaleLinear()
            .domain(domain)
            .range([...this.shipCompareData.speedDegrees, this.shipCompareData.speedDegrees[0]])
            .clamp(true)

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragStart = (d: DragData): void => {
            d.this.classed("drag-active", true)
        }

        const dragged = (d: DragData): void => {
            const update = (): void => {
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

        const dragEnd = (d: DragData): void => {
            d.this.classed("drag-active", false)
        }

        this._drag = d3Drag
            .drag<SVGCircleElement | SVGPathElement, DragData>()
            .on("start", dragStart)
            .on("drag", dragged)
            .on("end", dragEnd)
            .container(() => this._mainG.node() as d3Drag.DragContainerElement)
    }

    _setupShipOutline(): void {
        this._shipRotate = 0
        const { shipMass } = this.shipCompareData
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
        } as DragData

        const gShip = this._mainG.append("g").datum(datum).attr("class", "ship-outline")

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
            .call(this._drag as d3Drag.DragBehavior<SVGCircleElement, DragData, any>)

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
     */
    _drawDifferenceProfile(): void {
        const pie = d3Pie().sort(null).value(1)

        const arcsBase = pie(this._shipBaseData.speedDegrees)
        this._arcsComp = pie(this.shipCompareData.speedDegrees)

        this._speedDiff = this.shipCompareData.speedDegrees.map((speedShipCompare, i) =>
            roundToThousands(speedShipCompare - this._shipBaseData.speedDegrees[i])
        )
        this._minSpeedDiff = d3Min(this._speedDiff) ?? 0
        this._maxSpeedDiff = d3Max(this._speedDiff) ?? 0

        const curve = d3CurveCatmullRomClosed
        const line = d3LineRadial<PieArcDatum<number>>()
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
        } as DragData

        this._gWindProfile = this._mainG
            .append("g")
            .attr("class", "wind-profile")
            .attr("transform", `rotate(${this._windProfile.initRotate})`)

        // Base profile shape
        // @ts-ignore
        this._gWindProfile.append("path").attr("class", "base-profile").attr("d", line(arcsBase))

        // Comp profile lines
        // @ts-ignore
        this._gWindProfile.append("path").attr("class", "comp-profile").attr("d", line(this._arcsComp))
    }

    updateWindProfileRotation(): void {
        this._gWindProfile.attr("transform", `rotate(${this._shipCompare.windProfileRotate})`)
        this._updateSpeedText()
    }

    /**
     * Update difference profile
     */
    updateDifferenceProfile(): void {
        this._setColourScale(this._minSpeedDiff, this._maxSpeedDiff)

        // @ts-ignore
        this._gWindProfile
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("data-ui-component", "speed-markers")
            .selectAll("circle")
            .data(this._arcsComp)
            // @ts-ignore
            .join((enter) => {
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusSpeedScale(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusSpeedScale(d.data))
                    .attr("fill", (d, i) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]))
                    .append("title")
                    .text(
                        (d, i) =>
                            `${Math.round((d.data as number) * 10) / 10} (${formatSignFloat(
                                this._speedDiff[i],
                                1
                            )}) knots`
                    )
            })
            .select("circle")
            // @ts-ignore
            .attr("fill", (_d: number, i: number) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]))

        // colourRamp(d3Select(this._select), this._shipCompare.colourScaleSpeedDiff, this._speedDiff.length);
    }

    /**
     * Inject text comparison
     */
    _injectTextComparison(): void {
        /**
         * HTML formatted difference
         * @param a - First value
         * @param b - Second value
         * @param decimals - Number of decimals (default 0)
         * @param isPercentage - True if be to be formatted as percentage
         * @returns HTML formatted string
         */
        function getDiff(a: number, b: number, decimals = 0, isPercentage = false): HtmlString {
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
            (this._shipBaseData.sides.armour * this._shipBaseData.repairAmount!.armour) / hullRepairsVolume
        )
        const rigRepairsNeededBase = Math.round(
            (this._shipBaseData.sails.armour * this._shipBaseData.repairAmount!.sails) / rigRepairsVolume
        )
        const rumRepairsNeededBase = Math.round(this._shipBaseData.crew.max * rumRepairsFactor)
        const hullRepairsNeededCompare = Math.round(
            (this.shipCompareData.sides.armour * this.shipCompareData.repairAmount!.armour) / hullRepairsVolume
        )
        const rigRepairsNeededCompare = Math.round(
            (this.shipCompareData.sails.armour * this.shipCompareData.repairAmount!.sails) / rigRepairsVolume
        )
        const rumRepairsNeededCompare = Math.round(this.shipCompareData.crew.max * rumRepairsFactor)

        const ship = {
            acceleration: `${formatFloat(this.shipCompareData.ship.acceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.acceleration,
                this._shipBaseData.ship.acceleration,
                2
            )}`,
            additionalRow: `${this.shipCompareData.decks < 4 ? "<br>\u00A0" : ""}`,
            backArmor: `${formatIntTrunc(this.shipCompareData.stern.armour)}\u00A0${getDiff(
                this.shipCompareData.stern.armour,
                this._shipBaseData.stern.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.stern.thickness)}</span>${getDiff(
                this.shipCompareData.stern.thickness,
                this._shipBaseData.stern.thickness
            )}`,
            battleRating: `${this.shipCompareData.battleRating}\u00A0${getDiff(
                this.shipCompareData.battleRating,
                this._shipBaseData.battleRating
            )}`,
            cannonBroadside: `${this.shipCompareData.broadside.cannons}\u00A0${getDiff(
                this.shipCompareData.broadside.cannons,
                this._shipBaseData.broadside.cannons
            )}`,
            cannonsPerDeck: Ship.getCannonsPerDeck(
                this.shipCompareData.deckClassLimit,
                this.shipCompareData.gunsPerDeck
            ),
            carroBroadside: `${this.shipCompareData.broadside.carronades}\u00A0${getDiff(
                this.shipCompareData.broadside.carronades,
                this._shipBaseData.broadside.carronades
            )}`,
            deceleration: `${formatFloat(this.shipCompareData.ship.deceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.deceleration,
                this._shipBaseData.ship.deceleration,
                2
            )}`,
            decks: `${this.shipCompareData.decks}\u00A0${getDiff(
                this.shipCompareData.decks,
                this._shipBaseData.decks
            )} deck${this.shipCompareData.decks > 1 ? "s" : ""}`,
            fireResistance: `${formatPercent(this.shipCompareData.resistance!.fire, 0)}\u00A0${getDiff(
                this.shipCompareData.resistance!.fire,
                this._shipBaseData.resistance!.fire,
                2,
                true
            )}`,
            firezoneHorizontalWidth: `${this.shipCompareData.ship.firezoneHorizontalWidth}\u00A0${getDiff(
                this.shipCompareData.ship.firezoneHorizontalWidth,
                this._shipBaseData.ship.firezoneHorizontalWidth
            )}`,
            frontArmor: `${formatIntTrunc(this.shipCompareData.bow.armour)}\u00A0${getDiff(
                this.shipCompareData.bow.armour,
                this._shipBaseData.bow.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.bow.thickness)}</span>${getDiff(
                this.shipCompareData.bow.thickness,
                this._shipBaseData.bow.thickness
            )}`,
            guns: `${this.shipCompareData.guns}\u00A0${getDiff(this.shipCompareData.guns, this._shipBaseData.guns)}`,
            gunsBack: this.shipCompareData.gunsPerDeck[5],
            gunsFront: this.shipCompareData.gunsPerDeck[4],
            halfturnTime: `${formatFloat(this.shipCompareData.rudder.halfturnTime, 4)}\u00A0${getDiff(
                this.shipCompareData.rudder.halfturnTime,
                this._shipBaseData.rudder.halfturnTime,
                2
            )}`,
            holdSize: `${formatIntTrunc(this.shipCompareData.holdSize)}\u00A0${getDiff(
                this.shipCompareData.holdSize,
                this._shipBaseData.holdSize
            )}`,
            hullRepairAmount: `${formatIntTrunc(
                (this.shipCompareData.repairAmount!.armour + this.shipCompareData.repairAmount!.armourPerk) * 100
            )}\u00A0${getDiff(
                this.shipCompareData.repairAmount!.armour + this.shipCompareData.repairAmount!.armourPerk,
                this._shipBaseData.repairAmount!.armour + this._shipBaseData.repairAmount!.armourPerk,
                3,
                true
            )}`,
            hullRepairsNeeded: `${formatIntTrunc(hullRepairsNeededCompare)}\u00A0${getDiff(
                hullRepairsNeededCompare,
                hullRepairsNeededBase
            )} <span class="badge badge-white">${formatIntTrunc(hullRepairsNeededCompare * repairsSetSize)}</span>`,
            leakResistance: `${formatPercent(this.shipCompareData.resistance!.leaks, 0)}\u00A0${getDiff(
                this.shipCompareData.resistance!.leaks,
                this._shipBaseData.resistance!.leaks,
                2,
                true
            )}`,
            limitBack: this.shipCompareData.deckClassLimit[5],
            limitFront: this.shipCompareData.deckClassLimit[4],
            mastBottomArmor: `${formatIntTrunc(this.shipCompareData.mast.bottomArmour)}\u00A0${getDiff(
                this.shipCompareData.mast.bottomArmour,
                this._shipBaseData.mast.bottomArmour
            )} <span class="badge badge-white">${formatIntTrunc(
                this.shipCompareData.mast.bottomThickness
            )}</span>${getDiff(this.shipCompareData.mast.bottomThickness, this._shipBaseData.mast.bottomThickness)}`,
            mastMiddleArmor: `${formatIntTrunc(this.shipCompareData.mast.middleArmour)}\u00A0${getDiff(
                this.shipCompareData.mast.middleArmour,
                this._shipBaseData.mast.middleArmour
            )} <span class="badge badge-white">${formatIntTrunc(
                this.shipCompareData.mast.middleThickness
            )}</span>${getDiff(this.shipCompareData.mast.middleThickness, this._shipBaseData.mast.middleThickness)}`,
            mastTopArmor: `${formatIntTrunc(this.shipCompareData.mast.topArmour)}\u00A0${getDiff(
                this.shipCompareData.mast.topArmour,
                this._shipBaseData.mast.topArmour
            )} <span class="badge badge-white">${formatIntTrunc(
                this.shipCompareData.mast.topThickness
            )}</span>${getDiff(this.shipCompareData.mast.topThickness, this._shipBaseData.mast.topThickness)}`,
            maxCrew: `${formatIntTrunc(this.shipCompareData.crew.max)}\u00A0${getDiff(
                this.shipCompareData.crew.max,
                this._shipBaseData.crew.max
            )}`,
            maxSpeed: `${formatFloat(this.shipCompareData.speed.max, 4)}\u00A0${getDiff(
                this.shipCompareData.speed.max,
                this._shipBaseData.speed.max,
                2
            )}`,
            maxTurningSpeed: `${formatFloat(this.shipCompareData.rudder.turnSpeed, 4)}\u00A0${getDiff(
                this.shipCompareData.rudder.turnSpeed,
                this._shipBaseData.rudder.turnSpeed,
                2
            )}`,
            maxWeight: `${formatIntTrunc(this.shipCompareData.maxWeight)}\u00A0${getDiff(
                this.shipCompareData.maxWeight,
                this._shipBaseData.maxWeight
            )}`,
            minCrew: `${formatIntTrunc(this.shipCompareData.crew.min)}\u00A0${getDiff(
                this.shipCompareData.crew.min,
                this._shipBaseData.crew.min
            )}`,
            minSpeed: `${formatFloat(this.shipCompareData.speed.min)}\u00A0${getDiff(
                this.shipCompareData.speed.min,
                this._shipBaseData.speed.min,
                2
            )}`,
            pump: `${formatIntTrunc(this.shipCompareData.pump.armour)}\u00A0${getDiff(
                this.shipCompareData.pump.armour,
                this._shipBaseData.pump.armour
            )}`,
            repairTime: `${formatIntTrunc(this.shipCompareData.repairTime.sides)}\u00A0${getDiff(
                this._shipBaseData.repairTime.sides,
                this.shipCompareData.repairTime.sides
            )}`,
            rigRepairAmount: `${formatIntTrunc(
                (this.shipCompareData.repairAmount!.sails + this.shipCompareData.repairAmount!.sailsPerk) * 100
            )}\u00A0${getDiff(
                this.shipCompareData.repairAmount!.sails + this.shipCompareData.repairAmount!.sailsPerk,
                this._shipBaseData.repairAmount!.sails + this._shipBaseData.repairAmount!.sailsPerk,
                3,
                true
            )}`,
            rigRepairsNeeded: `${formatIntTrunc(rigRepairsNeededCompare)}\u00A0${getDiff(
                rigRepairsNeededCompare,
                rigRepairsNeededBase
            )} <span class="badge badge-white">${formatIntTrunc(rigRepairsNeededCompare * repairsSetSize)}</span>`,
            rudder: `${formatIntTrunc(this.shipCompareData.rudder.armour)}\u00A0${getDiff(
                this.shipCompareData.rudder.armour,
                this._shipBaseData.rudder.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.rudder.thickness)}</span>${getDiff(
                this.shipCompareData.rudder.thickness,
                this._shipBaseData.rudder.thickness
            )}`,
            rumRepairsNeeded: `${formatIntTrunc(rumRepairsNeededCompare)}\u00A0${getDiff(
                rumRepairsNeededCompare,
                rumRepairsNeededBase
            )} <span class="badge badge-white">${formatIntTrunc(rumRepairsNeededCompare * repairsSetSize)}</span>`,
            sailingCrew: `${formatIntTrunc(this.shipCompareData.crew.sailing)}\u00A0${getDiff(
                this.shipCompareData.crew.sailing,
                this._shipBaseData.crew.sailing
            )}`,
            sails: `${formatIntTrunc(this.shipCompareData.sails.armour)}\u00A0${getDiff(
                this.shipCompareData.sails.armour,
                this._shipBaseData.sails.armour
            )}`,
            shipRating: `${getOrdinal(this.shipCompareData.class)} rate`,
            sideArmor: `${formatIntTrunc(this.shipCompareData.sides.armour)}\u00A0${getDiff(
                this.shipCompareData.sides.armour,
                this._shipBaseData.sides.armour
            )} <span class="badge badge-white">${formatIntTrunc(this.shipCompareData.sides.thickness)}</span>${getDiff(
                this.shipCompareData.sides.thickness,
                this._shipBaseData.sides.thickness
            )}`,
            splinterResistance: `${formatPercent(this.shipCompareData.resistance!.splinter, 0)}\u00A0${getDiff(
                this.shipCompareData.resistance!.splinter,
                this._shipBaseData.resistance!.splinter,
                2,
                true
            )}`,
            structure: `${formatIntTrunc(this.shipCompareData.structure.armour)}\u00A0${getDiff(
                this.shipCompareData.structure.armour,
                this._shipBaseData.structure.armour
            )}`,
            upgradeXP: `${formatIntTrunc(this.shipCompareData.upgradeXP)}\u00A0${getDiff(
                this._shipBaseData.upgradeXP,
                this.shipCompareData.upgradeXP
            )}`,
            waterlineHeight: `${formatFloat(this.shipCompareData.ship.waterlineHeight)}\u00A0${getDiff(
                this.shipCompareData.ship.waterlineHeight,
                this._shipBaseData.ship.waterlineHeight,
                2
            )}`,
        } as ShipDisplayData

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
}
