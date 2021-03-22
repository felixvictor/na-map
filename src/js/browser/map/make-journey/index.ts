/*!
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    map-tools/make-journey
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { layoutTextLabel, layoutAnnealing, layoutLabel } from "@d3fc/d3fc-label-layout"
import { range as d3Range } from "d3-array"
import { drag as d3Drag, DragBehavior, SubjectPosition } from "d3-drag"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { Line, line as d3Line } from "d3-shape"
import { zoomIdentity as d3ZoomIdentity } from "d3-zoom"

import { registerEvent } from "../../analytics"
import { degreesPerSecond, pluralise } from "common/common-browser"
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

interface Journey {
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
    #divJourneySummary = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #drag = {} as DragBehavior<SVGCircleElement, DragEvent, Segment | SubjectPosition>
    #g = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gCompass = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gJourneyPath = {} as Selection<SVGPathElement, unknown, HTMLElement, unknown>
    #journey = {} as Journey
    #journeySummaryShip = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryTextShip = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryTextWind = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryWind = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #modal: MakeJourneyModal | undefined = undefined

    readonly #arrowId = "journey-arrow"
    readonly #arrowWidth = 5
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
    readonly #fontSize: number
    readonly #labelPadding = 20
    readonly #line: Line<Point>
    readonly #menuId: HtmlString
    readonly #minOWSpeed = 2
    readonly #owSpeedFactor = 2
    readonly #speedScale: ScaleLinear<number, number>

    constructor(fontSize: number) {
        this.#fontSize = fontSize

        this.#baseId = this.#baseName.toLocaleLowerCase().replaceAll(" ", "-")
        this.#menuId = `menu-${this.#baseId}`
        this.#compassId = `compass-${this.#baseId}`
        this.#deleteLastLegButtonId = `button-delete-leg-${this.#baseId}`

        this.#line = d3Line<Point>()
            .x((d) => d[0])
            .y((d) => d[1])
        this.#speedScale = d3ScaleLinear().domain(d3Range(0, degreesFullCircle, this.#degreesSegment))

        this._setupSummary()
        this._setupDrag()
        this._setupSvg()
        this._initJourneyData()
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
            this._printJourney()
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

    _menuClicked(): void {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            this.#modal = new MakeJourneyModal(this.#baseName)
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
            this._menuClicked()
        })
        ;(document.querySelector(`#${this.#deleteLastLegButtonId}`) as HTMLElement).addEventListener("click", () => {
            this._deleteLastLeg()
        })
    }

    _useUserInput(): void {
        console.log("_useUserInput", this.#modal?.getWind() ?? this.#defaultStartWindDegrees)
        this._resetJourneyData()
        this.#journey.startWindDegrees = this.#modal?.getWind() ?? this.#defaultStartWindDegrees
        this._setShipName()
        this._printSummary()
        this._printJourney()
    }

    _printCompass(): void {
        const x = this.#journey.segments[0].position[0]
        const y = this.#journey.segments[0].position[1]

        this.#compass = this.#g
            .append("svg")
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

    _correctJourney(): void {
        const defaultTranslate = this.#labelPadding
        const fontSize = this.#fontSize
        const textTransform = d3ZoomIdentity.translate(defaultTranslate, defaultTranslate)
        const textPadding = this.#labelPadding * 1.3
        const circleRadius = 10
        const pathWidth = 5

        /** Correct Text Box
         *  - split text into lines
         *  - correct box width
         *  - enlarge circles
         *  - remove last circle
         * {@link https://stackoverflow.com/a/13275930}
         */
        const correctTextBox = (self: SVGGElement, d: Segment, i: number): void => {
            // Split text into lines
            const node = d3Select(self)
            const text = node.select("text")
            const lines = d.label.split("|")
            const lineHeight = fontSize * 1.4
            text.text("").attr("dy", 0).attr("transform", textTransform.toString()).style("font-size", `${fontSize}px`)
            for (const [j, line] of lines.entries()) {
                const tspan = text.append("tspan").html(line)
                if (j > 0) {
                    tspan.attr("x", 0).attr("dy", lineHeight)
                }
            }

            // Correct box width
            const bbText = (text.node() as SVGTextElement).getBBox()
            const width = d.label ? bbText.width + textPadding * 2 : 0
            const height = d.label ? bbText.height + textPadding : 0
            node.select("rect").attr("width", width).attr("height", height)

            // Enlarge circles
            const circle = node.select("circle").attr("r", circleRadius).attr("class", "click-circle drag-circle")

            // Move circles down and visually above text box
            node.append(() => circle.remove().node())

            // Enlarge and hide first circle
            if (i === 0) {
                circle.attr("r", circleRadius * 4).attr("class", "drag-hidden")
            }

            // Hide last circle
            if (i === this.#journey.segments.length - 1) {
                circle.attr("r", circleRadius).attr("class", "drag-hidden")
            }
        }

        // Correct text boxes
        this.#g.selectAll<SVGGElement, Segment>("#journey g.label").each(function (this, d, i) {
            correctTextBox(this, d, i)
        })
        // Correct journey stroke width
        if (this.#gJourneyPath) {
            this.#gJourneyPath.style("stroke-width", `${pathWidth}px`)
        }
    }

    /**
     * Print labels
     */
    _printLabels(): void {
        // Component used to render each label (take only single longest line)
        const textLabel = layoutTextLabel()
            .padding(this.#labelPadding)
            .value((d: Segment): string => {
                const lines = d.label.split("|")
                // Find longest line (number of characters)
                // eslint-disable-next-line unicorn/no-array-reduce
                const index = lines.reduce((p, c, i, a) => (a[p].length > c.length ? p : i), 0)
                return lines[index]
            })

        // Strategy that combines simulated annealing with removal of overlapping labels
        const strategy = layoutAnnealing()

        // Create the layout that positions the labels
        const labels = layoutLabel(strategy)
            .size(
                (
                    d: Segment,
                    i: number,
                    nodes: Array<SVGSVGElement | SVGGElement> | ArrayLike<SVGSVGElement | SVGGElement>
                ): Point => {
                    // measure the label and add the required padding
                    const numberLines = d.label.split("|").length
                    const bbText = nodes[i].querySelectorAll("text")[0].getBBox()
                    return [bbText.width + this.#labelPadding * 2, bbText.height * numberLines + this.#labelPadding * 2]
                }
            )
            .position((d: Segment) => d.position)
            .component(textLabel)

        // Render
        // @ts-expect-error
        this.#g.datum(this.#journey.segments.map((segment) => segment)).call(labels)
    }

    _setupSummary(): void {
        // Main box
        this.#divJourneySummary = d3Select("main #summary-column")
            .append("div")
            .attr("id", "journey-summary")
            .attr("class", "journey-summary d-none")

        // Selected ship
        this.#journeySummaryShip = this.#divJourneySummary.append("div").attr("class", "block small")
        this.#journeySummaryTextShip = this.#journeySummaryShip.append("div")
        this.#journeySummaryShip.append("div").attr("class", "overlay-des").text("ship")

        // Wind direction
        this.#journeySummaryWind = this.#divJourneySummary.append("div").attr("class", "block small")
        this.#journeySummaryTextWind = this.#journeySummaryWind.append("div")
        this.#journeySummaryWind.append("div").attr("class", "overlay-des").text("wind")

        this.#divJourneySummary
            .append("div")
            .attr("class", "block")
            .append("button")
            .attr("id", this.#deleteLastLegButtonId)
            .attr("class", "btn btn-outline-primary btn-sm")
            .attr("role", "button")
            .text("Clear last leg")
    }

    _displaySummary(showJourneySummary: boolean): void {
        this.#divJourneySummary.classed("d-none", !showJourneySummary)
        d3Select("#port-summary").classed("d-none", showJourneySummary)
    }

    _showSummary(): void {
        this._displaySummary(true)
    }

    _hideSummary(): void {
        this._displaySummary(false)
    }

    _printSummaryShip(): void {
        this.#journeySummaryTextShip.text(this.#journey.shipName)
    }

    _printSummaryWind(): void {
        this.#journeySummaryTextWind.html(`From ${displayCompassAndDegrees(this.#journey.startWindDegrees)}`)
    }

    _printSummary(): void {
        this._printSummaryWind()
        this._printSummaryShip()
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

    _setSegmentLabel(index = this.#journey.segments.length - 1): void {
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

    _printSegment(): void {
        this._printLines()
        this._setSegmentLabel()
        this._printLabels()
        this._correctJourney()
        this.#g.selectAll<SVGCircleElement, DragEvent>("#journey g.label circle").call(this.#drag)
    }

    _printJourney(): void {
        this._printLines()
        this._resetJourneyData()
        for (const [i] of this.#journey.segments.entries()) {
            if (i < this.#journey.segments.length - 1) {
                this._setSegmentLabel(i + 1)
            }
        }

        this._printLabels()
        this._correctJourney()
        this.#g.selectAll<SVGCircleElement, DragEvent>("#journey g.label circle").call(this.#drag)
    }

    _deleteLastLeg(): void {
        this.#journey.segments.pop()
        if (this.#journey.segments.length > 0) {
            this._printJourney()
        } else {
            this.#g.selectAll("#journey g.label").remove()
            this.#gJourneyPath.remove()
            this._removeCompass()
            this._hideSummary()
            this._initJourneyData()
        }
    }

    _initJourney(): void {
        this._showSummary()
        this._printSummary()
        this._printCompass()
        this.#gJourneyPath = this.#g.append("path")
    }

    setSummaryPosition(topMargin: number, rightMargin: number): void {
        this.#divJourneySummary.style("top", `${topMargin}px`).style("right", `${rightMargin}px`)
    }

    plotCourse(x: number, y: number): void {
        if (this.#journey.segments[0].position[0] > 0) {
            this.#journey.segments.push({ position: [x, y], label: "", index: this.#journey.segments.length })
            this._printSegment()
        } else {
            this.#journey.segments[0] = { position: [x, y], label: "", index: 0 }
            this._initJourney()
        }
    }
}
