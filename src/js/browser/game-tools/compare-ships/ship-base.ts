/*!
 * This file is part of na-map.
 *
 * @file      Compare ships base file.
 * @module    game-tools/compare-ships/ship-base
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as d3Selection from "d3-selection"
import {
    arc as d3Arc,
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    lineRadial as d3LineRadial,
    PieArcDatum,
} from "d3-shape"
import { formatFloat, formatIntTrunc, formatPercent } from "../../../common/common-format"
import { degreesToCompass, getOrdinal } from "../../../common/common-math"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { event as d3Event } from "d3-selection"
import { drawSvgCircle, drawSvgLine, rotationAngleInDegrees } from "../../util"
import * as d3Drag from "d3-drag"
import { isEmpty } from "../../../common/common"
import {
    hullRepairsVolume,
    repairsSetSize,
    rigRepairsVolume,
    rumRepairsFactor,
    segmentRadians,
} from "../../../common/common-browser"
import { default as shipIcon } from "Icons/icon-ship.svg"

import { CompareShips, DragData, Ship, ShipComparison, ShipDisplayData } from "."
import { ShipData } from "../../../common/gen-json"

/**
 * Base ship for comparison (displayed on the left side)
 */
export class ShipBase extends Ship {
    readonly shipData: ShipData
    private _speedScale!: ScaleLinear<number, number>
    private _shipRotate!: number
    private _speedText!: d3Selection.Selection<SVGTextElement, DragData, HTMLElement, any>
    private _drag!: d3Drag.DragBehavior<SVGCircleElement | SVGPathElement, DragData, any>

    /**
     * @param id - Ship id
     * @param shipData - Ship data
     * @param shipCompare - Class instance of the ship to be compared to
     */
    constructor(id: string, shipData: ShipData, shipCompare: CompareShips) {
        super(id, shipCompare)

        this.shipData = shipData

        this._setBackground()
        this._setupDrag()
        this._drawWindProfile()
        this._setupShipOutline()
        this._printText()
    }

    /**
     * Set coloured Background
     */
    _setBackground(): void {
        // Arc for text
        const speedArc = d3Arc<number>()
            .outerRadius((d) => this._shipCompare.radiusSpeedScale(d) + 2)
            .innerRadius((d) => this._shipCompare.radiusSpeedScale(d) + 1)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2)

        // Add the paths for the text
        this._mainG
            .append("g")
            .attr("data-ui-component", "speed-textpath")
            .selectAll("path")
            .data(this.ticksSpeed)
            .join((enter) =>
                enter
                    .append("path")
                    .attr("d", speedArc)
                    .attr("id", (d, i) => `tick${i}`)
            )

        // And add the text
        this._mainG
            .append("g")
            .attr("class", "speed-text")
            .selectAll("text")
            .data(this.ticksSpeed)
            .join((enter) =>
                enter
                    .append("text")
                    .append("textPath")
                    .attr("href", (d, i) => `#tick${i}`)
                    .text((d, i) => this.ticksSpeedLabels[i])
                    .attr("startOffset", "10%")
            )
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

    _updateCompareWindProfiles(): void {
        for (const otherCompareId of this._shipCompare.columnsCompare) {
            if (!isEmpty(this._shipCompare.selectedShips[otherCompareId])) {
                ;(this._shipCompare.selectedShips[otherCompareId] as ShipComparison).updateWindProfileRotation()
            }
        }
    }

    _setupDrag(): void {
        const steps = this.shipData.speedDegrees.length
        const degreesPerStep = 360 / steps
        const domain = new Array(steps + 1).fill(null).map((e, i) => i * degreesPerStep)
        this._speedScale = d3ScaleLinear()
            .domain(domain)
            .range([...this.shipData.speedDegrees, this.shipData.speedDegrees[0]])
            .clamp(true)

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const dragStart = (d: DragData): void => {
            d.this.classed("drag-active", true)
        }

        const dragged = (d: DragData): void => {
            const update = (): void => {
                d.this.attr("transform", (d: DragData) => `rotate(${d.rotate})`)
                d.compassText
                    .attr("transform", (d: DragData) => `rotate(${-d.rotate},${d.compassTextX},${d.compassTextY})`)
                    .text((d: DragData) => this._getHeadingInCompass(d.rotate))
                if (d.type === "ship") {
                    this._shipRotate = d.rotate
                } else if (d.type === "windProfile") {
                    this._shipCompare.windProfileRotate = d.rotate
                }

                this._speedText
                    .attr("transform", `rotate(${-this._shipRotate})`)
                    .text(this._getSpeed(this._shipCompare.windProfileRotate - this._shipRotate))
            }

            const { x: xMouse, y: yMouse } = d3Event
            d.rotate = this._getHeadingInDegrees(
                rotationAngleInDegrees({ x: d.initX, y: d.initY }, { x: xMouse, y: yMouse }),
                d.correctionValueDegrees
            )
            update()
            if (d.type === "windProfile") {
                this._updateCompareWindProfiles()
            }
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
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
        const { shipMass } = this.shipData
        const heightShip = this._shipCompare.shipMassScale(shipMass)
        // noinspection JSSuspiciousNameCombination
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
            .text((d) => this._getSpeed(d.initRotate))

        datum.this = gShip
        datum.compassText = compassText
        gShip.datum(datum).attr("transform", (d) => `rotate(${d.initRotate})`)
    }

    /**
     * Draw profile
     */
    _drawWindProfile(): void {
        const pie = d3Pie().sort(null).value(1)

        const arcsBase = pie(this.shipData.speedDegrees) as Array<PieArcDatum<number>>

        const curve = d3CurveCatmullRomClosed
        const line = d3LineRadial<PieArcDatum<number>>()
            .angle((d, i) => i * segmentRadians)
            .radius((d) => this._shipCompare.radiusSpeedScale(d.data))
            .curve(curve)

        // Profile shape
        this._shipCompare.windProfileRotate = 0
        const circleSize = 20
        const svgHeight = this._shipCompare.svgHeight / 2 - circleSize
        const datum = {
            initX: 0,
            initY: 0,
            initRotate: this._shipCompare.windProfileRotate,
            correctionValueDegrees: 0,
            compassTextX: 0,
            compassTextY: -svgHeight,
            type: "windProfile",
        } as DragData

        const gWindProfile = this._mainG.append("g").datum(datum).attr("class", "wind-profile")

        // Add big wind arrow
        gWindProfile
            .append("path")
            .attr(
                "d",
                (d) =>
                    String(drawSvgCircle(d.compassTextX, d.compassTextY, circleSize)) +
                    drawSvgLine(d.compassTextX, d.compassTextY, -d.compassTextY / 2)
            )

            .attr("class", "wind-profile-arrow")
            .attr("marker-end", "url(#wind-profile-arrow-head)")
            .call(this._drag as d3Drag.DragBehavior<SVGPathElement, DragData, any>)

        gWindProfile
            .append("circle")
            .attr("cx", (d) => d.compassTextX)
            .attr("cy", (d) => d.compassTextY)
            .attr("r", circleSize)

        const compassText = gWindProfile
            .append("text")
            .attr("x", (d) => d.compassTextX)
            .attr("y", (d) => d.compassTextY)
            .attr("transform", (d) => `rotate(${-d.initRotate},${d.compassTextX},${d.compassTextY})`)
            .text((d) => this._getHeadingInCompass(d.initRotate))

        // @ts-ignore
        gWindProfile.append("path").attr("class", "base-profile").attr("d", line(arcsBase))

        // Speed marker
        gWindProfile
            // .insert("g", "g.compass-arc")
            .append("g")
            .attr("data-ui-component", "speed-markers")
            .selectAll("circle")
            .data(arcsBase)
            .join((enter) =>
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -this._shipCompare.radiusSpeedScale(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * this._shipCompare.radiusSpeedScale(d.data))
                    .attr("fill", (d) => this._shipCompare.colorScale(d.data))
                    .attr("fill", (d) => this._shipCompare.colorScale(d.data))
                    .append("title")
                    .text((d) => `${Math.round(d.data * 10) / 10} knots`)
            )

        datum.this = gWindProfile
        datum.compassText = compassText
        gWindProfile.datum(datum).attr("transform", (d) => `rotate(${d.initRotate})`)

        // colourRamp(d3Select(this._select), this.shipCompareData.colorScale, this._shipData.speedDegrees.length);
    }

    /**
     * Print text
     */
    _printText(): void {
        const cannonsPerDeck = Ship.getCannonsPerDeck(this.shipData.deckClassLimit, this.shipData.gunsPerDeck)
        const hullRepairsNeeded = Math.round(
            (this.shipData.sides.armour * this.shipData.repairAmount!.armour) / hullRepairsVolume
        )
        const rigRepairsNeeded = Math.round(
            (this.shipData.sails.armour * this.shipData.repairAmount!.sails) / rigRepairsVolume
        )
        const rumRepairsNeeded = Math.round(this.shipData.crew.max * rumRepairsFactor)

        const ship = {
            acceleration: formatFloat(this.shipData.ship.acceleration),
            additionalRow: `${this.shipData.decks < 4 ? "<br>\u00A0" : ""}`,
            backArmor: `${formatIntTrunc(
                this.shipData.stern.armour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.stern.thickness)}</span>`,
            battleRating: String(this.shipData.battleRating),
            bowRepair: `${formatIntTrunc(this.shipData.repairTime.bow)}`,
            cannonBroadside: formatIntTrunc(this.shipData.broadside.cannons),
            cannonsPerDeck,
            carroBroadside: formatIntTrunc(this.shipData.broadside.carronades),
            deceleration: formatFloat(this.shipData.ship.deceleration),
            decks: `${this.shipData.decks} deck${this.shipData.decks > 1 ? "s" : ""}`,
            fireResistance: formatPercent(this.shipData.resistance!.fire, 0),
            firezoneHorizontalWidth: String(this.shipData.ship.firezoneHorizontalWidth),
            frontArmor: `${formatIntTrunc(
                this.shipData.bow.armour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.bow.thickness)}</span>`,
            guns: String(this.shipData.guns),
            gunsBack: this.shipData.gunsPerDeck[5],
            gunsFront: this.shipData.gunsPerDeck[4],
            halfturnTime: formatFloat(this.shipData.rudder.halfturnTime, 4),
            holdSize: formatIntTrunc(this.shipData.holdSize),
            hullRepairAmount: `${formatIntTrunc(
                (this.shipData.repairAmount!.armour + this.shipData.repairAmount!.armourPerk) * 100
            )}`,
            hullRepairsNeeded: `${formatIntTrunc(
                hullRepairsNeeded
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(hullRepairsNeeded * repairsSetSize)}</span>`,
            leakResistance: formatPercent(this.shipData.resistance!.leaks, 0),
            limitBack: this.shipData.deckClassLimit[5],
            limitFront: this.shipData.deckClassLimit[4],
            mastBottomArmor: `${formatIntTrunc(
                this.shipData.mast.bottomArmour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.mast.bottomThickness)}</span>`,
            mastMiddleArmor: `${formatIntTrunc(
                this.shipData.mast.middleArmour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.mast.middleThickness)}</span>`,
            mastTopArmor: `${formatIntTrunc(
                this.shipData.mast.topArmour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.mast.topThickness)}</span>`,
            maxCrew: formatIntTrunc(this.shipData.crew.max),
            maxSpeed: formatFloat(this.shipData.speed.max, 4),
            maxTurningSpeed: formatFloat(this.shipData.rudder.turnSpeed, 4),
            maxWeight: formatIntTrunc(this.shipData.maxWeight),
            minCrew: formatIntTrunc(this.shipData.crew.min),
            pump: formatIntTrunc(this.shipData.pump.armour),
            repairTime: `${formatIntTrunc(this.shipData.repairTime.sides)}`,
            rigRepairAmount: `${formatIntTrunc(
                (this.shipData.repairAmount!.sails + this.shipData.repairAmount!.sailsPerk) * 100
            )}`,
            rigRepairsNeeded: `${formatIntTrunc(
                rigRepairsNeeded
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(rigRepairsNeeded * repairsSetSize)}</span>`,
            rudder: `${formatIntTrunc(
                this.shipData.rudder.armour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.rudder.thickness)}</span>`,
            rumRepairsNeeded: `${formatIntTrunc(
                rumRepairsNeeded
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(rumRepairsNeeded * repairsSetSize)}</span>`,
            sailingCrew: formatIntTrunc(this.shipData.crew.sailing ?? 0),
            sails: formatIntTrunc(this.shipData.sails.armour),
            shipRating: `${getOrdinal(this.shipData.class)} rate`,
            sideArmor: `${formatIntTrunc(
                this.shipData.sides.armour
            )}\u00A0<span class="badge badge-white">${formatIntTrunc(this.shipData.sides.thickness)}</span>`,
            splinterResistance: formatPercent(this.shipData.resistance!.splinter, 0),
            sternRepair: `${formatIntTrunc(this.shipData.repairTime.stern)}`,
            structure: formatIntTrunc(this.shipData.structure.armour),
            upgradeXP: formatIntTrunc(this.shipData.upgradeXP),
            waterlineHeight: formatFloat(this.shipData.ship.waterlineHeight),
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
