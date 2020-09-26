/*!
 * This file is part of na-map.
 *
 * @file      Compare ships base file.
 * @module    game-tools/compare-ships/ship-base
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import {
    arc as d3Arc,
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    lineRadial as d3LineRadial,
    PieArcDatum,
} from "d3-shape"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { drag as d3Drag, DragBehavior, DragContainerElement, SubjectPosition } from "d3-drag"
import { isEmpty } from "../../../common/common"

import { pluralise, segmentRadians } from "../../../common/common-browser"
import { formatFloat, formatInt, formatSignFloat, formatSignInt } from "../../../common/common-format"
import { degreesToCompass, getOrdinal } from "../../../common/common-math"
import { drawSvgCircle, drawSvgLine, rotationAngleInDegrees } from "../../util"

import { Selection } from "d3-selection"

import { Ship } from "./ship"
import { CompareShips } from "./compare-ships"
import { ShipComparison } from "./ship-comparison"

import {
    hullRepairsVolume,
    repairsSetSize,
    rigRepairsVolume,
    rumRepairsFactor,
} from "../../../common/common-game-tools"
import { default as shipIcon } from "Icons/icon-ship.svg"

import { ShipData } from "../../../common/gen-json"
import { DragData, ShipDisplayData } from "./types"

/**
 * Base ship for comparison (displayed on the left side)
 */
export class ShipBase extends Ship {
    readonly shipData: ShipData
    private _speedScale!: ScaleLinear<number, number>
    private _shipRotate!: number
    private _speedText!: Selection<SVGTextElement, DragData, HTMLElement, unknown>
    private _drag!: DragBehavior<SVGCircleElement | SVGPathElement, DragData, DragData | SubjectPosition>
    private readonly _gShip!: Selection<SVGGElement, DragData, HTMLElement, unknown>

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
        // eslint-disable-next-line unicorn/no-null
        const domain = new Array(steps + 1).fill(null).map((e, i) => i * degreesPerStep)
        this._speedScale = d3ScaleLinear()
            .domain(domain)
            .range([...this.shipData.speedDegrees, this.shipData.speedDegrees[0]])
            .clamp(true)

        const dragStart = (event: Event, d: DragData): void => {
            d.this.classed("drag-active", true)
        }

        const dragged = (event: Event, d: DragData): void => {
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

            // @ts-expect-error
            const { x: xMouse, y: yMouse } = event
            d.rotate = this._getHeadingInDegrees(
                rotationAngleInDegrees({ x: d.initX, y: d.initY }, { x: xMouse, y: yMouse }),
                d.correctionValueDegrees
            )
            update()
            if (d.type === "windProfile") {
                this._updateCompareWindProfiles()
            }
        }

        const dragEnd = (event: Event, d: DragData): void => {
            d.this.classed("drag-active", false)
        }

        this._drag = d3Drag<SVGCircleElement | SVGPathElement, DragData>()
            // @ts-expect-error
            .on("start", (event: Event, d: DragData): void => dragStart(event, d))
            // @ts-expect-error
            .on("drag", (event: Event, d: DragData): void => dragged(event, d))
            // @ts-expect-error
            .on("end", (event: Event, d: DragData): void => dragEnd(event, d))
            .container(() => this._mainG.node() as DragContainerElement)
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
            // @ts-expect-error
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
            .text((d) => this._getSpeed(d.initRotate))

        datum.this = gShip
        datum.compassText = compassText
        gShip.datum(datum).attr("transform", (d) => `rotate(${d.initRotate})`)
    }

    /**
     * Draw profile
     */
    _drawWindProfile(): void {
        // eslint-disable-next-line unicorn/no-null
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
            // @ts-expect-error
            .call(this._drag)

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

        // @ts-expect-error
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
        const cannonsPerDeck = Ship.getCannonsPerDeck(this.shipData.guns)
        const hullRepairsNeeded = Math.round(
            (this.shipData.sides.armour * this.shipData.repairAmount!.armour) / hullRepairsVolume
        )
        const rigRepairsNeeded = Math.round(
            (this.shipData.sails.armour * this.shipData.repairAmount!.sails) / rigRepairsVolume
        )
        const rumRepairsNeeded = Math.round(this.shipData.crew.max * rumRepairsFactor)

        const ship = {
            attack: formatSignFloat(this.shipData.boarding.attack!, 2),
            cannonsAccuracy: formatSignInt(this.shipData.boarding.cannonsAccuracy! * 100),
            defense: formatSignFloat(this.shipData.boarding.defense!, 2),
            disengageTime: formatInt(this.shipData.boarding.disengageTime!),
            morale: formatInt(this.shipData.boarding.morale!),
            musketsAccuracy: formatSignInt(this.shipData.boarding.musketsAccuracy! * 100),
            musketsCrew: formatInt((this.shipData.boarding.musketsCrew! / 100) * this.shipData.crew.max),
            prepPerRound: formatInt(this.shipData.boarding.prepPerRound),
            prepInitial: formatInt(this.shipData.boarding.prepInitial),

            acceleration: formatFloat(this.shipData.ship.acceleration),
            additionalRow: `${this.shipData.guns.decks < 4 ? "<br>\u00A0" : ""}`,
            backArmor: `${formatInt(this.shipData.stern.armour)}</br><span class="badge badge-white">${formatInt(
                this.shipData.stern.thickness
            )}</span>`,
            battleRating: String(this.shipData.battleRating),
            bowRepair: `${formatInt(this.shipData.repairTime.bow)}`,
            cannonBroadside: formatInt(this.shipData.guns.broadside.cannons),
            cannonsPerDeck,
            carroBroadside: formatInt(this.shipData.guns.broadside.carronades),
            deceleration: formatFloat(this.shipData.ship.deceleration),
            decks: pluralise(this.shipData.guns.decks, "deck"),
            fireResistance: formatSignInt(this.shipData.resistance!.fire * 100),
            firezoneHorizontalWidth: String(this.shipData.ship.firezoneHorizontalWidth),
            frontArmor: `${formatInt(this.shipData.bow.armour)}</br><span class="badge badge-white">${formatInt(
                this.shipData.bow.thickness
            )}</span>`,
            guns: String(this.shipData.guns.total),
            gunsBack: this.shipData.guns.gunsPerDeck[5].amount,
            gunsFront: this.shipData.guns.gunsPerDeck[4].amount,
            halfturnTime: formatFloat(this.shipData.rudder.halfturnTime, 4),
            holdSize: formatInt(this.shipData.holdSize),
            hullRepairAmount: `${formatInt(
                (this.shipData.repairAmount!.armour + this.shipData.repairAmount!.armourPerk) * 100
            )}`,
            hullRepairsNeeded: `${formatInt(hullRepairsNeeded)}\u00A0<span class="badge badge-white">${formatInt(
                hullRepairsNeeded * repairsSetSize
            )}</span>`,
            leakResistance: formatSignInt(this.shipData.resistance!.leaks * 100),
            limitBack: this.shipData.guns.gunsPerDeck[5],
            limitFront: this.shipData.guns.gunsPerDeck[4],
            mastBottomArmor: `${formatInt(
                this.shipData.mast.bottomArmour
            )}</br><span class="badge badge-white">${formatInt(this.shipData.mast.bottomThickness)}</span>`,
            mastMiddleArmor: `${formatInt(
                this.shipData.mast.middleArmour
            )}</br><span class="badge badge-white">${formatInt(this.shipData.mast.middleThickness)}</span>`,
            mastTopArmor: `${formatInt(this.shipData.mast.topArmour)}</br><span class="badge badge-white">${formatInt(
                this.shipData.mast.topThickness
            )}</span>`,
            maxCrew: formatInt(this.shipData.crew.max),
            maxSpeed: formatFloat(this.shipData.speed.max, 3),
            maxWeight: formatInt(this.shipData.maxWeight),
            minCrew: formatInt(this.shipData.crew.min),
            cannonCrew: formatInt(this.shipData.crew.cannons),
            carroCrew: formatInt(this.shipData.crew.carronades),
            pump: formatInt(this.shipData.pump.armour),
            repairTime: `${formatInt(this.shipData.repairTime.sides)}`,
            rigRepairAmount: `${formatInt(
                (this.shipData.repairAmount!.sails + this.shipData.repairAmount!.sailsPerk) * 100
            )}`,
            rigRepairsNeeded: `${formatInt(rigRepairsNeeded)}\u00A0<span class="badge badge-white">${formatInt(
                rigRepairsNeeded * repairsSetSize
            )}</span>`,
            rollAngle: formatInt(this.shipData.ship.rollAngle),
            rudder: `${formatInt(this.shipData.rudder.armour)}\u00A0<span class="badge badge-white">${formatInt(
                this.shipData.rudder.thickness
            )}</span>`,
            rumRepairsNeeded: `${formatInt(rumRepairsNeeded)}\u00A0<span class="badge badge-white">${formatInt(
                rumRepairsNeeded * repairsSetSize
            )}</span>`,
            sailingCrew: formatInt(this.shipData.crew.sailing ?? 0),
            sails: formatInt(this.shipData.sails.armour),
            shipRating: `${getOrdinal(this.shipData.class)} rate`,
            sideArmor: `${formatInt(this.shipData.sides.armour)}</br><span class="badge badge-white">${formatInt(
                this.shipData.sides.thickness
            )}</span>`,
            splinterResistance: formatSignInt(this.shipData.resistance!.splinter * 100),
            sternRepair: `${formatInt(this.shipData.repairTime.stern)}`,
            structure: formatInt(this.shipData.structure.armour),
            turnAcceleration: formatFloat(this.shipData.ship.turnAcceleration, 4),
            turnSpeed: formatFloat(this.shipData.ship.turnSpeed, 3),
            upgradeXP: formatInt(this.shipData.upgradeXP),
            waterlineHeight: formatFloat(this.shipData.ship.waterlineHeight),
            cannonWeight: formatInt(this.shipData.guns.weight.cannons),
            carroWeight: formatInt(this.shipData.guns.weight.carronades),
        } as ShipDisplayData

        ship.repairWeight = formatInt((hullRepairsNeeded + rigRepairsNeeded + rumRepairsNeeded * 0.1) * repairsSetSize)

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
