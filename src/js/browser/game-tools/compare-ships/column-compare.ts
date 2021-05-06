/*!
 * This file is part of na-map.
 *
 * @file      Compare ships comparison file.
 * @module    game-tools/compare-ships/ship-comparison
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max, min as d3Min } from "d3-array"
import { drag as d3Drag, DragBehavior, DragContainerElement, SubjectPosition } from "d3-drag"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import {
    curveCatmullRomClosed as d3CurveCatmullRomClosed,
    pie as d3Pie,
    PieArcDatum,
    lineRadial as d3LineRadial,
} from "d3-shape"

import { formatFloat, formatInt, formatPercent, formatSignFloat, formatSignInt } from "common/common-format"
import { degreesToCompass, getOrdinal, roundToThousands } from "common/common-math"
import { rotationAngleInDegrees } from "../../util"
import { default as shipIcon } from "icons/icon-ship.svg"

import { Selection } from "d3-selection"

import { Column } from "./column"
import { CompareShips } from "./compare-ships"

import { colourWhite, pluralise, segmentRadians } from "common/common-browser"
import { hullRepairsVolume, repairsSetSize, rigRepairsVolume, rumRepairsFactor } from "common/common-game-tools"

import { ShipData } from "common/gen-json"
import { HtmlString } from "common/interface"
import { DragData, ShipDisplayData } from "compare-ships"

export class ColumnCompare extends Column {
    // Ship data of the ship to be compared to
    readonly shipCompareData: ShipData
    // Base ship data
    private readonly _shipBaseData: ShipData
    private _speedScale!: ScaleLinear<number, number>
    private _speedDiff!: number[]
    private _minSpeedDiff!: number
    private _maxSpeedDiff!: number
    private _shipRotate!: number
    private _speedText!: Selection<SVGTextElement, DragData, HTMLElement, unknown>
    private _drag!: DragBehavior<SVGCircleElement | SVGPathElement, DragData, DragData | SubjectPosition>
    private _windProfile!: DragData
    private _gWindProfile!: Selection<SVGGElement, unknown, HTMLElement, unknown>
    private _arcsComp!: Array<PieArcDatum<number>>

    constructor(outputDivId: HtmlString, shipBaseData: ShipData, shipCompareData: ShipData, shipCompare: CompareShips) {
        super(outputDivId, shipCompare)

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
        return formatFloat(this._speedScale(Math.abs(rotate)) ?? 0)
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
        const domain = Array.from({ length: steps + 1 }, (_, i) => i * degreesPerStep)
        this._speedScale = d3ScaleLinear()
            .domain(domain)
            .range([...this.shipCompareData.speedDegrees, this.shipCompareData.speedDegrees[0]])
            .clamp(true)

        const dragged = (event: Event, d: DragData): void => {
            const update = (): void => {
                d.this.attr("transform", (d) => `rotate(${d.rotate})`)
                d.compassText
                    .attr("transform", (d) => `rotate(${-d.rotate},${d.compassTextX},${d.compassTextY})`)
                    .text((d) => this._getHeadingInCompass(d.rotate))
                this._shipRotate = d.rotate
                this._updateSpeedText()
            }

            const { x: xMouse, y: yMouse } = event as MouseEvent
            d.rotate = this._getHeadingInDegrees(
                rotationAngleInDegrees({ x: d.initX, y: d.initY }, { x: xMouse, y: yMouse }),
                d.correctionValueDegrees
            )
            update()
        }

        this._drag = d3Drag<SVGCircleElement | SVGPathElement, DragData>()
            .on("drag", (event: Event, d: DragData): void => {
                dragged(event, d)
            })
            .container(() => super.mainG.node() as DragContainerElement)
    }

    _setupShipOutline(): void {
        this._shipRotate = 0
        const { shipMass } = this.shipCompareData
        const heightShip = this._shipCompare.shipMassScale(shipMass) ?? 0
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

        const gShip = super.mainG.append("g").datum(datum).attr("class", "ship-outline")

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
            .call(this._drag as DragBehavior<SVGCircleElement, DragData, DragData | SubjectPosition>)

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
        gShip.datum(datum).attr("transform", (d) => `rotate(${d.initRotate - 90})`)
        gShip
            .transition()
            .duration(1000)
            .delay(500)
            .attr("transform", (d) => `rotate(${d.initRotate})`)
    }

    /**
     * Draw difference profile
     */
    _drawDifferenceProfile(): void {
        // eslint-disable-next-line unicorn/no-null
        const pie = d3Pie().sort(null).value(1)

        const arcsBase = pie(this._shipBaseData.speedDegrees) as Array<PieArcDatum<number>>
        this._arcsComp = pie(this.shipCompareData.speedDegrees) as Array<PieArcDatum<number>>

        this._speedDiff = this.shipCompareData.speedDegrees.map((speedShipCompare, i) =>
            roundToThousands(speedShipCompare - this._shipBaseData.speedDegrees[i])
        )
        this._minSpeedDiff = d3Min(this._speedDiff) ?? 0
        this._maxSpeedDiff = d3Max(this._speedDiff) ?? 0

        const curve = d3CurveCatmullRomClosed
        const line = d3LineRadial<PieArcDatum<number>>()
            .angle((d, i) => i * segmentRadians)
            .radius((d) => this._shipCompare.radiusSpeedScale(d.data) ?? 0)
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

        this._gWindProfile = super.mainG
            .append("g")
            .attr("class", "wind-profile")
            .attr("transform", `rotate(${this._windProfile.initRotate})`)

        // Base profile shape
        this._gWindProfile.append("path").attr("class", "base-profile").attr("d", line(arcsBase)!)

        // Comp profile lines
        this._gWindProfile.append("path").attr("class", "comp-profile").attr("d", line(this._arcsComp)!)
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

        this._gWindProfile
            .append("g")
            .attr("data-ui-component", "speed-markers")
            .selectAll("circle")
            .data(this._arcsComp)
            .join((enter) =>
                enter
                    .append("circle")
                    .attr("r", 5)
                    .attr(
                        "cy",
                        (d, i) => Math.cos(i * segmentRadians) * -(this._shipCompare.radiusSpeedScale(d.data) ?? 0)
                    )
                    .attr(
                        "cx",
                        (d, i) => Math.sin(i * segmentRadians) * (this._shipCompare.radiusSpeedScale(d.data) ?? 0)
                    )
                    .attr("fill", (d, i) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]) ?? 0)
                    .append("title")
                    .text((d, i) => `${Math.round(d.data * 10) / 10} (${formatSignFloat(this._speedDiff[i], 1)}) knots`)
            )
            .select("circle")
            .attr(
                "fill",
                (_d: unknown, i: number) => this._shipCompare.colourScaleSpeedDiff(this._speedDiff[i]) ?? colourWhite
            )

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
            if (a === b) {
                return ""
            }

            let diff: number
            let formattedDiff: string
            let badge = "bg-danger"

            if (isPercentage) {
                diff = Number.parseFloat((b - a).toFixed(decimals)) * 100
                formattedDiff = formatFloat(Math.abs(diff))
            } else if (a === 0 || b === 0) {
                diff = b - a
                formattedDiff = formatFloat(Math.abs(diff))
            } else {
                diff = 1 - a / b
                formattedDiff = formatPercent(Math.abs(diff), 0).replace("%", '<span class="x-small">%</span>')
            }

            if (diff < 0) {
                badge = "bg-success"
            }

            return `<span class="badge ${badge}">${formattedDiff}</span>`
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
            morale: `${formatInt(this.shipCompareData.boarding.morale!)}\u00A0${getDiff(
                this.shipCompareData.boarding.morale!,
                this._shipBaseData.boarding.morale!
            )}`,
            musketsAccuracy: `${formatSignInt(this.shipCompareData.boarding.musketsAccuracy! * 100)}\u00A0${getDiff(
                this.shipCompareData.boarding.musketsAccuracy! * 100,
                this._shipBaseData.boarding.musketsAccuracy! * 100
            )}`,
            prepPerRound: `${formatInt(this.shipCompareData.boarding.prepPerRound)}\u00A0${getDiff(
                this.shipCompareData.boarding.prepPerRound,
                this._shipBaseData.boarding.prepPerRound
            )}`,
            attack: `${formatSignFloat(this.shipCompareData.boarding.attack!, 2)}\u00A0${getDiff(
                this.shipCompareData.boarding.attack! / 100,
                this._shipBaseData.boarding.attack! / 100,
                3,
                true
            )}`,
            defense: `${formatSignFloat(this.shipCompareData.boarding.defense!, 2)}\u00A0${getDiff(
                this.shipCompareData.boarding.defense! / 100,
                this._shipBaseData.boarding.defense! / 100,
                3,
                true
            )}`,
            disengageTime: `${formatInt(this.shipCompareData.boarding.disengageTime!)}\u00A0${getDiff(
                this._shipBaseData.boarding.disengageTime!,
                this.shipCompareData.boarding.disengageTime!
            )}`,
            musketsCrew: `${formatInt(
                (this.shipCompareData.boarding.musketsCrew! / 100) * this.shipCompareData.crew.max
            )}\u00A0${getDiff(
                (this.shipCompareData.boarding.musketsCrew! / 100) * this.shipCompareData.crew.max,
                (this._shipBaseData.boarding.musketsCrew! / 100) * this._shipBaseData.crew.max
            )}`,
            prepInitial: `${formatInt(this.shipCompareData.boarding.prepInitial)}\u00A0${getDiff(
                this.shipCompareData.boarding.prepInitial,
                this._shipBaseData.boarding.prepInitial
            )}`,
            cannonsAccuracy: `${formatSignInt(this.shipCompareData.boarding.cannonsAccuracy! * 100)}\u00A0${getDiff(
                this.shipCompareData.boarding.cannonsAccuracy! * 100,
                this._shipBaseData.boarding.cannonsAccuracy! * 100
            )}`,

            // Gunnery
            reload: `${formatSignInt(this.shipCompareData.gunnery!.reload * 100)}\u00A0${getDiff(
                this._shipBaseData.gunnery!.reload,
                this.shipCompareData.gunnery!.reload,
                3,
                true
            )}`,
            penetration: `${formatSignInt(this.shipCompareData.gunnery!.penetration * 100)}\u00A0${getDiff(
                this.shipCompareData.gunnery!.penetration,
                this._shipBaseData.gunnery!.penetration,
                3,
                true
            )}`,
            dispersionHorizontal: `${formatSignInt(
                this.shipCompareData.gunnery!.dispersionHorizontal * 100
            )}\u00A0${getDiff(
                this._shipBaseData.gunnery!.dispersionHorizontal,
                this.shipCompareData.gunnery!.dispersionHorizontal,
                3,
                true
            )}`,
            dispersionVertical: `${formatSignInt(
                this.shipCompareData.gunnery!.dispersionVertical * 100
            )}\u00A0${getDiff(
                this._shipBaseData.gunnery!.dispersionVertical,
                this.shipCompareData.gunnery!.dispersionVertical,
                3,
                true
            )}`,
            traverseUpDown: `${formatSignInt(this.shipCompareData.gunnery!.traverseUpDown * 100)}\u00A0${getDiff(
                this.shipCompareData.gunnery!.traverseUpDown,
                this._shipBaseData.gunnery!.traverseUpDown,
                3,
                true
            )}`,
            traverseSide: `${formatSignInt(this.shipCompareData.gunnery!.traverseSide * 100)}\u00A0${getDiff(
                this.shipCompareData.gunnery!.traverseSide,
                this._shipBaseData.gunnery!.traverseSide,
                3,
                true
            )}`,

            acceleration: `${formatFloat(this.shipCompareData.ship.acceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.acceleration,
                this._shipBaseData.ship.acceleration,
                2
            )}`,
            additionalRow: `${this.shipCompareData.guns.decks < 4 ? "<br>\u00A0" : ""}`,
            backArmor: `${formatInt(this.shipCompareData.stern.armour)}\u00A0${getDiff(
                this.shipCompareData.stern.armour,
                this._shipBaseData.stern.armour
            )}</br><span class="badge bg-white text-muted">${formatInt(
                this.shipCompareData.stern.thickness
            )}</span>${getDiff(this.shipCompareData.stern.thickness, this._shipBaseData.stern.thickness)}`,
            battleRating: `${this.shipCompareData.battleRating}\u00A0${getDiff(
                this.shipCompareData.battleRating,
                this._shipBaseData.battleRating
            )}`,
            cannonBroadside: `${this.shipCompareData.guns.broadside.cannons}\u00A0${getDiff(
                this.shipCompareData.guns.broadside.cannons,
                this._shipBaseData.guns.broadside.cannons
            )}`,
            cannonsPerDeck: Column.getCannonsPerDeck(this.shipCompareData.guns),
            carroBroadside: `${this.shipCompareData.guns.broadside.carronades}\u00A0${getDiff(
                this.shipCompareData.guns.broadside.carronades,
                this._shipBaseData.guns.broadside.carronades
            )}`,
            deceleration: `${formatFloat(this.shipCompareData.ship.deceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.deceleration,
                this._shipBaseData.ship.deceleration,
                2
            )}`,
            rollAngle: `${formatInt(this.shipCompareData.ship.rollAngle)}\u00A0${getDiff(
                this._shipBaseData.ship.rollAngle,
                this.shipCompareData.ship.rollAngle
            )}`,
            turnAcceleration: `${formatFloat(this.shipCompareData.ship.turnAcceleration)}\u00A0${getDiff(
                this.shipCompareData.ship.turnAcceleration,
                this._shipBaseData.ship.turnAcceleration,
                2
            )}`,
            turnSpeed: `${formatFloat(this.shipCompareData.ship.turnSpeed, 3)}\u00A0${getDiff(
                this.shipCompareData.ship.turnSpeed,
                this._shipBaseData.ship.turnSpeed,
                2
            )}`,
            decks: pluralise(this.shipCompareData.guns.decks, "deck"),
            firezoneHorizontalWidth: `${this.shipCompareData.ship.firezoneHorizontalWidth}\u00A0${getDiff(
                this.shipCompareData.ship.firezoneHorizontalWidth,
                this._shipBaseData.ship.firezoneHorizontalWidth
            )}`,
            frontArmor: `${formatInt(this.shipCompareData.bow.armour)}\u00A0${getDiff(
                this.shipCompareData.bow.armour,
                this._shipBaseData.bow.armour
            )}</br><span class="badge bg-white text-muted">${formatInt(
                this.shipCompareData.bow.thickness
            )}</span>${getDiff(this.shipCompareData.bow.thickness, this._shipBaseData.bow.thickness)}`,
            guns: `${this.shipCompareData.guns.total}\u00A0${getDiff(
                this.shipCompareData.guns.total,
                this._shipBaseData.guns.total
            )}`,
            gunsBack: this.shipCompareData.guns.gunsPerDeck[5].amount,
            gunsFront: this.shipCompareData.guns.gunsPerDeck[4].amount,
            halfturnTime: `${formatFloat(this.shipCompareData.rudder.halfturnTime, 4)}\u00A0${getDiff(
                this._shipBaseData.rudder.halfturnTime,
                this.shipCompareData.rudder.halfturnTime,
                2
            )}`,
            holdSize: `${formatInt(this.shipCompareData.holdSize)}\u00A0${getDiff(
                this.shipCompareData.holdSize,
                this._shipBaseData.holdSize
            )}`,
            hullRepairAmount: `${formatInt(
                (this.shipCompareData.repairAmount!.armour + this.shipCompareData.repairAmount!.armourPerk) * 100
            )}\u00A0${getDiff(
                this.shipCompareData.repairAmount!.armour + this.shipCompareData.repairAmount!.armourPerk,
                this._shipBaseData.repairAmount!.armour + this._shipBaseData.repairAmount!.armourPerk,
                3,
                true
            )}`,
            hullRepairsNeeded: `${formatInt(
                hullRepairsNeededCompare
            )} <span class="badge bg-white text-muted">${formatInt(hullRepairsNeededCompare * repairsSetSize)}</span>`,
            leakResistance: `${formatSignInt(this.shipCompareData.resistance!.leaks * 100)}\u00A0${getDiff(
                this.shipCompareData.resistance!.leaks,
                this._shipBaseData.resistance!.leaks,
                2,
                true
            )}`,
            limitBack: this.shipCompareData.guns.gunsPerDeck[5],
            limitFront: this.shipCompareData.guns.gunsPerDeck[4],
            mastBottomArmor: `${formatInt(this.shipCompareData.mast.bottomArmour)} ${getDiff(
                this.shipCompareData.mast.bottomArmour,
                this._shipBaseData.mast.bottomArmour
            )}</br><span class="badge bg-white text-muted">${formatInt(
                this.shipCompareData.mast.bottomThickness
            )}</span>${getDiff(this.shipCompareData.mast.bottomThickness, this._shipBaseData.mast.bottomThickness)}`,
            mastMiddleArmor: `${formatInt(this.shipCompareData.mast.middleArmour)} ${getDiff(
                this.shipCompareData.mast.middleArmour,
                this._shipBaseData.mast.middleArmour
            )}</br><span class="badge bg-white text-muted">${formatInt(
                this.shipCompareData.mast.middleThickness
            )}</span>${getDiff(this.shipCompareData.mast.middleThickness, this._shipBaseData.mast.middleThickness)}`,
            mastTopArmor: `${formatInt(this.shipCompareData.mast.topArmour)} ${getDiff(
                this.shipCompareData.mast.topArmour,
                this._shipBaseData.mast.topArmour
            )}</br><span class="badge bg-white text-muted">${formatInt(
                this.shipCompareData.mast.topThickness
            )}</span>${getDiff(this.shipCompareData.mast.topThickness, this._shipBaseData.mast.topThickness)}`,
            maxCrew: `${formatInt(this.shipCompareData.crew.max)}\u00A0${getDiff(
                this.shipCompareData.crew.max,
                this._shipBaseData.crew.max
            )}`,
            maxSpeed: `${formatFloat(this.shipCompareData.speed.max, 3)}\u00A0${getDiff(
                this.shipCompareData.speed.max,
                this._shipBaseData.speed.max,
                2
            )}`,
            maxWeight: `${formatInt(this.shipCompareData.maxWeight)}\u00A0${getDiff(
                this.shipCompareData.maxWeight,
                this._shipBaseData.maxWeight
            )}`,
            minCrew: formatInt(this.shipCompareData.crew.min),
            cannonCrew: `${formatInt(this.shipCompareData.crew.cannons)}\u00A0${getDiff(
                this._shipBaseData.crew.cannons,
                this.shipCompareData.crew.cannons
            )}`,
            carroCrew: `${formatInt(this.shipCompareData.crew.carronades)}\u00A0${getDiff(
                this._shipBaseData.crew.carronades,
                this.shipCompareData.crew.carronades
            )}`,
            minSpeed: `${formatFloat(this.shipCompareData.speed.min)}\u00A0${getDiff(
                this.shipCompareData.speed.min,
                this._shipBaseData.speed.min,
                2
            )}`,
            repairTime: `${formatInt(this.shipCompareData.repairTime.sides)}\u00A0${getDiff(
                this._shipBaseData.repairTime.sides,
                this.shipCompareData.repairTime.sides
            )}`,
            rigRepairAmount: `${formatInt(
                (this.shipCompareData.repairAmount!.sails + this.shipCompareData.repairAmount!.sailsPerk) * 100
            )}\u00A0${getDiff(
                this.shipCompareData.repairAmount!.sails + this.shipCompareData.repairAmount!.sailsPerk,
                this._shipBaseData.repairAmount!.sails + this._shipBaseData.repairAmount!.sailsPerk,
                3,
                true
            )}`,
            rigRepairsNeeded: `${formatInt(
                rigRepairsNeededCompare
            )} <span class="badge bg-white text-muted">${formatInt(rigRepairsNeededCompare * repairsSetSize)}</span>`,
            rumRepairsNeeded: `${formatInt(
                rumRepairsNeededCompare
            )} <span class="badge bg-white text-muted">${formatInt(rumRepairsNeededCompare * repairsSetSize)}</span>`,
            sailingCrew: `${formatInt(this.shipCompareData.crew.sailing)}`,
            sails: `${formatInt(this.shipCompareData.sails.armour)}\u00A0${getDiff(
                this.shipCompareData.sails.armour,
                this._shipBaseData.sails.armour
            )}`,
            shipRating: `${getOrdinal(this.shipCompareData.class)} rate`,
            sideArmor: `${formatInt(this.shipCompareData.sides.armour)}\u00A0${getDiff(
                this.shipCompareData.sides.armour,
                this._shipBaseData.sides.armour
            )}</br><span class="badge bg-white text-muted">${formatInt(
                this.shipCompareData.sides.thickness
            )}</span>${getDiff(this.shipCompareData.sides.thickness, this._shipBaseData.sides.thickness)}`,
            splinterResistance: `${formatSignInt(this.shipCompareData.resistance!.splinter * 100)}\u00A0${getDiff(
                this.shipCompareData.resistance!.splinter,
                this._shipBaseData.resistance!.splinter,
                2,
                true
            )}`,
            structure: `${formatInt(this.shipCompareData.structure.armour)}\u00A0${getDiff(
                this.shipCompareData.structure.armour,
                this._shipBaseData.structure.armour
            )}`,
            upgradeXP: `${formatInt(this.shipCompareData.upgradeXP)}\u00A0${getDiff(
                this._shipBaseData.upgradeXP,
                this.shipCompareData.upgradeXP
            )}`,
            waterlineHeight: `${formatFloat(this.shipCompareData.ship.waterlineHeight)}\u00A0${getDiff(
                this.shipCompareData.ship.waterlineHeight,
                this._shipBaseData.ship.waterlineHeight,
                2
            )}`,
            cannonWeight: `${formatInt(this.shipCompareData.guns.weight.cannons)}\u00A0${getDiff(
                this._shipBaseData.guns.weight.cannons,
                this.shipCompareData.guns.weight.cannons
            )}`,
            carroWeight: `${formatInt(this.shipCompareData.guns.weight.carronades)}\u00A0${getDiff(
                this._shipBaseData.guns.weight.carronades,
                this.shipCompareData.guns.weight.carronades
            )}`,
        } as ShipDisplayData

        ship.repairWeight = `${formatInt(
            (hullRepairsNeededCompare + rigRepairsNeededCompare + rumRepairsNeededCompare * 0.1) * repairsSetSize
        )}\u00A0${getDiff(
            (hullRepairsNeededBase + rigRepairsNeededBase + rumRepairsNeededBase * 0.1) * repairsSetSize,
            (hullRepairsNeededCompare + rigRepairsNeededCompare + rumRepairsNeededCompare * 0.1) * repairsSetSize
        )}`

        if (ship.gunsFront) {
            ship.gunsFront += `\u00A0${Column.pd(ship.limitFront)}`
        } else {
            ship.gunsFront = "\u2013"
        }

        if (ship.gunsBack) {
            ship.gunsBack += `\u00A0${Column.pd(ship.limitBack)}`
        } else {
            ship.gunsBack = "\u2013"
        }

        super.outputDivSel.select("div").html(Column.getText(ship))
    }
}
