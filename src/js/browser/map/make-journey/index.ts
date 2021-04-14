/*!
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    map-tools/make-journey
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { range as d3Range } from "d3-array"
import { drag as d3Drag, DragBehavior, SubjectPosition } from "d3-drag"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { Line, line as d3Line } from "d3-shape"

import { registerEvent } from "../../analytics"
import { degreesPerSecond, getIdFromBaseName, pluralise } from "common/common-browser"
import { formatF11 } from "common/common-format"
import {
    convertInvCoordX,
    convertInvCoordY,
    Coordinate,
    degreesFullCircle,
    degreesToCompass,
    getDistance,
    Point,
    speedFactor,
} from "common/common-math"
import { displayCompassAndDegrees, printCompassRose, rotationAngleInDegrees } from "../../util"

import { HtmlString } from "common/interface"

import MakeJourneyModal from "./modal"
import MakeJourneySummary from "./summary"
import MakeJourneyLabelPrinter from "./label"

export interface Journey {
    shipName: string
    startWindDegrees: number
    currentWindDegrees: number
    totalDistance: number
    totalMinutes: number
    segments: Segment[]
}

export interface Segment {
    position: Point
    label: string
    index: number
}

/**
 * MakeJourney
 */
export default class MakeJourney {
    #compass = {} as Selection<SVGSVGElement, unknown, HTMLElement, unknown>
    #drag = {} as DragBehavior<SVGCircleElement, DragEvent, Segment | SubjectPosition>
    #g = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gCompass = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gJourneyPath = {} as Selection<SVGPathElement, unknown, HTMLElement, unknown>
    #gLabels = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #journey = {} as Journey
    #label: MakeJourneyLabelPrinter
    #modal: MakeJourneyModal | undefined = undefined
    #summary: MakeJourneySummary

    readonly #arrowId = "journey-arrow"
    readonly #arrowWidth = 10
    readonly #baseId: HtmlString
    readonly #baseName = "Make journey"
    readonly #compassId: HtmlString
    readonly #compassRadius = 90
    readonly #defaultShipName = "None"
    readonly #defaultShipSpeed = 19
    readonly #defaultStartWindDegrees = 0
    readonly #degreesPerMinute = degreesPerSecond / 60
    readonly #degreesSegment = 15
    readonly #deleteLastLegButtonId: HtmlString
    readonly #line: Line<Point>
    readonly #menuId: HtmlString
    readonly #minOWSpeed = 2
    readonly #owSpeedFactor = 2
    readonly #shadowId: HtmlString
    readonly #speedScale: ScaleLinear<number, number>

    constructor(fontSize: number) {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`
        this.#compassId = `compass-${this.#baseId}`
        this.#shadowId = `filter-${this.#baseId}`
        this.#deleteLastLegButtonId = `button-delete-leg-${this.#baseId}`

        this.#line = d3Line<Point>()
            .x((d) => d[0])
            .y((d) => d[1])
        this.#speedScale = d3ScaleLinear().domain(d3Range(0, degreesFullCircle, this.#degreesSegment))

        this._setupDrag()
        this._setupSvg()
        this._initJourneyData()

        this.#label = new MakeJourneyLabelPrinter(this.#gLabels, this.#gJourneyPath, fontSize, this.#shadowId)
        this.#summary = new MakeJourneySummary(this.#deleteLastLegButtonId)
        this._setupListener()
    }

    static _getHumanisedDuration(duration: number): string {
        const durationHours = Math.floor(duration / 60)
        const durationMinutes = Math.round(duration % 60)

        let s = "in "
        if (duration < 1) {
            s += "less than a minute"
        } else {
            const hourString = durationHours === 0 ? "" : pluralise(durationHours, "hour")
            const minuteString = durationMinutes === 0 ? "" : pluralise(durationMinutes, "minute")
            s += hourString + (hourString === "" ? "" : " ") + minuteString
        }

        return s
    }

    _setupDrag(): void {
        const dragStart = (self: SVGCircleElement): void => {
            this._removeLabels()
            d3Select(self).classed("drag-active", true)
        }

        const dragged = (self: SVGCircleElement, event: DragEvent, d: Segment): void => {
            // Set compass position
            // @ts-expect-error
            const newX = d.position[0] + Number(event.dx)
            // @ts-expect-error
            const newY = d.position[1] + Number(event.dy)
            if (d.index === 0) {
                this.#compass.attr("x", newX).attr("y", newY)
            }

            d3Select(self).attr("cx", event.x).attr("cy", event.y)
            d.position = [newX, newY]
            this._printLines()
        }

        const dragEnd = (self: SVGCircleElement): void => {
            d3Select(self).classed("drag-active", false)
            this._printWholeJourney()
        }

        this.#drag = d3Drag<SVGCircleElement, DragEvent, Segment>()
            .on("start", function (this) {
                dragStart(this)
            })
            // @ts-expect-error
            .on("drag", function (this: SVGCircleElement, event: DragEvent, d: Segment) {
                dragged(this, event, d)
            })
            .on("end", function (this) {
                dragEnd(this)
            })
    }

    _setupSvg(): void {
        const width = this.#arrowWidth
        const doubleWidth = this.#arrowWidth * 2

        this.#g = d3Select("#ports").append("g").attr("id", "journey").attr("class", "svg-background-dark")
        this.#gJourneyPath = this.#g.append("path")
        this.#gLabels = this.#g.append("g").attr("class", "labels")

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", this.#arrowId)
            .attr("viewBox", `0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", width)
            .attr("refY", 0)
            .attr("markerWidth", width)
            .attr("markerHeight", width)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "svg-light")
            .attr("d", `M0,-${width}L${doubleWidth},0L0,${width}`)
    }

    _initJourneyData(): void {
        this.#journey = {
            shipName: this.#defaultShipName,
            startWindDegrees: this.#defaultStartWindDegrees,
            currentWindDegrees: this.#defaultStartWindDegrees,
            totalDistance: 0,
            totalMinutes: 0,
            segments: [{ position: [0, 0], label: "" }],
        } as Journey
    }

    _resetJourneyData(): void {
        this.#journey.startWindDegrees = this.#modal?.getWind() ?? this.#defaultStartWindDegrees
        this.#journey.currentWindDegrees = this.#journey.startWindDegrees
        this.#journey.totalDistance = 0
        this.#journey.totalMinutes = 0
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            this.#modal = new MakeJourneyModal(this.#baseName)
            await this.#modal.init()
            this.#modal.getModalNode().addEventListener("hidden.bs.modal", () => {
                this._useUserInput()
            })
        }
    }

    /**
     * Setup menu item listener
     */
    _setupListener(): void {
        ;(document.querySelector(`#${this.#menuId}`) as HTMLElement).addEventListener("click", () => {
            void this._menuClicked()
        })
        ;(document.querySelector(`#${this.#deleteLastLegButtonId}`) as HTMLElement).addEventListener("click", () => {
            this._deleteLastLeg()
        })
    }

    _useUserInput(): void {
        this._setShipName()
        this._printWholeJourney()
        this._printSummary()
    }

    _printCompass(): void {
        const x = this.#journey.segments[0].position[0]
        const y = this.#journey.segments[0].position[1]

        this.#compass = this.#g
            .insert("svg", "path")
            .attr("id", this.#compassId)
            .attr("class", "compass")
            .attr("x", x)
            .attr("y", y)

        this.#gCompass = this.#compass.append("g")
        printCompassRose({ element: this.#gCompass, radius: this.#compassRadius })
    }

    _removeCompass(): void {
        this.#compass.remove()
    }

    _getSpeedAtDegrees(degrees: number): number {
        return Math.max(this.#speedScale(degrees) ?? 0, this.#minOWSpeed)
    }

    _calculateDistanceForSection(degreesCourse: number, degreesCurrentWind: number): number {
        const degreesForSpeedCalc = (degreesFullCircle - degreesCourse + degreesCurrentWind) % degreesFullCircle
        const speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this.#owSpeedFactor
        /*
        console.log(
            { degreesCourse },
            { degreesCurrentWind },
            { degreesForSpeedCalc },
            { speedCurrentSection },
            { speedCurrentSection * speedFactor }
        );
        */
        return speedCurrentSection * speedFactor
    }

    _setShipSpeed(): void {
        const speedDegrees =
            this.#modal?.getSpeedDegrees() ?? Array.from({ length: 24 }, () => this.#defaultShipSpeed / 2)

        this.#speedScale.range(speedDegrees)
        // console.log(this._speedScale.range());
    }

    /**
     * Segregate each segment into sections, calculate per section speed and distance (each section takes one minute)
     * @param courseDegrees - Ship course in correctionValueDegrees
     * @param startWindDegrees - Wind at start of segment
     * @param distanceSegment - Distance of segment
     */
    _calculateMinutesForSegment(courseDegrees: number, startWindDegrees: number, distanceSegment: number): number {
        let distanceRemaining = distanceSegment
        let currentWindDegrees = startWindDegrees
        let totalMinutesSegment = 0

        this._setShipSpeed()
        while (distanceRemaining > 0) {
            const distanceCurrentSection = this._calculateDistanceForSection(courseDegrees, currentWindDegrees)
            if (distanceRemaining > distanceCurrentSection) {
                distanceRemaining -= distanceCurrentSection
                totalMinutesSegment += 1
            } else {
                totalMinutesSegment += distanceRemaining / distanceCurrentSection
                distanceRemaining = 0
            }

            currentWindDegrees = (degreesFullCircle + currentWindDegrees - this.#degreesPerMinute) % degreesFullCircle

            // console.log({ distanceCurrentSection }, { totalMinutesSegment });
        }

        this.#journey.currentWindDegrees = currentWindDegrees

        return totalMinutesSegment
    }

    _setShipName(): void {
        const shipName = this.#modal!.getShipName()

        this.#journey.shipName = shipName ? shipName : this.#defaultShipName
    }

    /**
     * Remove label text boxes
     */
    _removeLabels(): void {
        const label = this.#g.selectAll("#journey g.label")
        label.select("text").remove()
        label.select("rect").remove()
    }

    _printSummary(): void {
        this.#summary.print(this.#journey)
    }

    _printLines(): void {
        if (this.#gJourneyPath) {
            this.#gJourneyPath
                .datum(
                    this.#journey.segments.length > 1
                        ? this.#journey.segments.map((segment) => segment.position)
                        : [[0, 0] as Point]
                )
                .attr("marker-end", "url(#journey-arrow)")
                .attr("filter", `url(#${this.#shadowId})`)
                .attr("d", this.#line)
        }
    }

    _getTextDirection(courseCompass: string, courseDegrees: number, pt1: Coordinate): string {
        return `${displayCompassAndDegrees(courseCompass, true)} \u2056 F11: ${formatF11(
            convertInvCoordX(pt1.x, pt1.y)
        )}\u202F/\u202F${formatF11(convertInvCoordY(pt1.x, pt1.y))}`
    }

    _getTextDistance(distanceK: number, minutes: number, addTotal: boolean): string {
        let textDistance = `${Math.round(distanceK)}\u2009k ${MakeJourney._getHumanisedDuration(minutes)}`

        if (addTotal) {
            textDistance += `\u2056 total ${Math.round(
                this.#journey.totalDistance
            )}\u2009k ${MakeJourney._getHumanisedDuration(this.#journey.totalMinutes)}`
        }

        return textDistance
    }

    _calculateSegmentLabel(index: number): void {
        const pt1 = { x: this.#journey.segments[index].position[0], y: this.#journey.segments[index].position[1] }
        const pt2 = {
            x: this.#journey.segments[index - 1].position[0],
            y: this.#journey.segments[index - 1].position[1],
        }

        const courseDegrees = rotationAngleInDegrees(pt1, pt2)
        const distanceK = getDistance(pt1, pt2)
        const courseCompass = degreesToCompass(courseDegrees)

        const minutes = this._calculateMinutesForSegment(
            courseDegrees,
            this.#journey.currentWindDegrees,
            distanceK * 1000
        )
        // console.log("*** start", this.#journey.currentWindDegrees, { distanceK }, { courseCompass });
        this.#journey.totalDistance += distanceK
        this.#journey.totalMinutes += minutes
        const textDirection = this._getTextDirection(courseCompass, courseDegrees, pt1)
        const textDistance = this._getTextDistance(distanceK, minutes, index > 1)

        this.#journey.segments[index].label = `${textDirection}|${textDistance}`
        // console.log("*** end", this.#journey);
    }

    _setSegmentLabels(onlyLastSegment: boolean): void {
        if (onlyLastSegment) {
            this._calculateSegmentLabel(this.#journey.segments.length - 1)
        } else {
            for (const [index] of this.#journey.segments.entries()) {
                if (index < this.#journey.segments.length - 1) {
                    this._calculateSegmentLabel(index + 1)
                }
            }
        }
    }

    _print(onlyLastSegment: boolean): void {
        this._printLines()
        this._setSegmentLabels(onlyLastSegment)
        this.#label.print(this.#journey.segments)
        this.#g.selectAll<SVGCircleElement, DragEvent>("#journey g.labels g.label circle").call(this.#drag)
    }

    _printAdditionalSegment(): void {
        this._print(true)
    }

    _printWholeJourney(): void {
        this._resetJourneyData()
        this._print(false)
    }

    _deleteLastLeg(): void {
        this.#journey.segments.pop()
        if (this.#journey.segments.length > 0) {
            this._printWholeJourney()
        } else {
            this.#summary.hide()
            this.#g.selectAll("#journey g.labels g.label").remove()
            this.#gJourneyPath.remove()
            this._removeCompass()
            this._initJourneyData()
        }
    }

    _initJourney(): void {
        this.#summary.show()
        this._printSummary()
        this._printCompass()
    }

    setSummaryPosition(topMargin: number, rightMargin: number): void {
        this.#summary.setPosition(topMargin, rightMargin)
    }

    plotCourse(x: number, y: number): void {
        if (this.#journey.segments[0].position[0] > 0) {
            this.#journey.segments.push({ position: [x, y], label: "", index: this.#journey.segments.length })
            this._printAdditionalSegment()
        } else {
            this.#journey.segments[0] = { position: [x, y], label: "", index: 0 }
            this._initJourney()
        }
    }
}
