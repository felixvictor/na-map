/*!
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    map-tools/make-journey
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { layoutTextLabel, layoutAnnealing, layoutLabel } from "@d3fc/d3fc-label-layout"
import { range as d3Range } from "d3-array"
import { drag as d3Drag, DragBehavior, SubjectPosition } from "d3-drag"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { Line, line as d3Line } from "d3-shape"
import { zoomIdentity as d3ZoomIdentity, zoomTransform as d3ZoomTransform } from "d3-zoom"

import "round-slider/src/roundslider"
import "../../../scss/roundslider.scss"
import { RoundSliderPos } from "round-slider"

import { registerEvent } from "../analytics"
import { degreesPerSecond, insertBaseModal, pluralise } from "common/common-browser"
import { formatF11 } from "common/common-format"
import {
    compassDirections,
    convertInvCoordX,
    convertInvCoordY,
    Coordinate,
    degreesFullCircle,
    degreesToCompass,
    getDistance,
    Point,
    speedFactor,
} from "common/common-math"
import { displayCompass, displayCompassAndDegrees, printCompassRose, rotationAngleInDegrees } from "../util"

import { HtmlString } from "common/interface"

import { CompareShips } from "../game-tools/compare-ships"

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
    private readonly _fontSize: number
    private readonly _compassRadius: number
    private readonly _courseArrowWidth: number
    private readonly _line: Line<[number, number]>
    private readonly _labelPadding: number
    private readonly _degreesPerMinute: number
    private readonly _degreesSegment: number
    private readonly _minOWSpeed: number
    private readonly _owSpeedFactor: number
    private readonly _speedScale: ScaleLinear<number, number>
    private readonly _defaultShipName: string
    private readonly _defaultShipSpeed: number
    private readonly _defaultStartWindDegrees: number
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _compassId: HtmlString
    private readonly _deleteLastLegButtonId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _sliderId: HtmlString
    private readonly _shipId: string
    private _g!: Selection<SVGGElement, Segment, HTMLElement, unknown>
    private _journey!: Journey
    private _shipCompare!: CompareShips
    private _compass!: Selection<SVGGElement, Segment, HTMLElement, unknown>
    private _compassG!: Selection<SVGGElement, Segment, HTMLElement, unknown>
    private _divJourneySummary!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _journeySummaryShip!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _journeySummaryTextShip!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _journeySummaryWind!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _journeySummaryTextWind!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _gJourneyPath!: Selection<SVGPathElement, Segment, HTMLElement, unknown>
    private _drag!: DragBehavior<SVGCircleElement, DragEvent, Segment | SubjectPosition>

    constructor(fontSize: number) {
        this._fontSize = fontSize

        this._compassRadius = 90
        this._courseArrowWidth = 5
        this._line = d3Line()
            .x((d) => d[0])
            .y((d) => d[1])

        this._labelPadding = 20

        this._degreesPerMinute = degreesPerSecond / 60
        this._degreesSegment = 15
        this._minOWSpeed = 2
        this._owSpeedFactor = 2

        this._speedScale = d3ScaleLinear().domain(d3Range(0, degreesFullCircle, this._degreesSegment))

        this._defaultShipName = "None"
        this._defaultShipSpeed = 19
        this._defaultStartWindDegrees = 0

        this._baseName = "Make journey"
        this._baseId = "make-journey"
        this._buttonId = `button-${this._baseId}`
        this._compassId = `compass-${this._baseId}`
        this._deleteLastLegButtonId = `button-delete-leg-${this._baseId}`
        this._modalId = `modal-${this._baseId}`
        this._sliderId = `slider-${this._baseId}`
        this._shipId = "ship-journey"

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
                this._compass.attr("x", newX).attr("y", newY)
            }

            d3Select(self).attr("cx", event.x).attr("cy", event.y)
            d.position = [newX, newY]
            this._printLines()
        }

        const dragEnd = (self: SVGCircleElement): void => {
            d3Select(self).classed("drag-active", false)
            this._printJourney()
        }

        this._drag = d3Drag<SVGCircleElement, DragEvent, Segment>()
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
        const width = this._courseArrowWidth
        const doubleWidth = this._courseArrowWidth * 2

        this._g = d3Select<SVGGElement, Segment>("#ports").append("g").attr("class", "journey")

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "journey-arrow")
            .attr("viewBox", `0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", width)
            .attr("refY", 0)
            .attr("markerWidth", width)
            .attr("markerHeight", width)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "journey-arrow-head")
            .attr("d", `M0,-${width}L${doubleWidth},0L0,${width}`)
    }

    _initJourneyData(): void {
        this._journey = {
            shipName: this._defaultShipName,
            startWindDegrees: this._defaultStartWindDegrees,
            currentWindDegrees: this._defaultStartWindDegrees,
            totalDistance: 0,
            totalMinutes: 0,
            segments: [{ position: [0, 0], label: "" }],
        } as Journey
    }

    _resetJourneyData(): void {
        this._journey.startWindDegrees = this._getStartWind()
        this._journey.currentWindDegrees = this._journey.startWindDegrees
        this._journey.totalDistance = 0
        this._journey.totalMinutes = 0
    }

    _navbarClick(): void {
        registerEvent("Menu", "MakeJourney")

        this._journeySelected()
    }

    /**
     * Setup menu item listener
     */
    _setupListener(): void {
        document.querySelector(`#${this._buttonId}`)?.addEventListener("mouseup", () => {
            this._navbarClick()
        })
        document.querySelector(`#${this._deleteLastLegButtonId}`)?.addEventListener("mouseup", () => {
            this._deleteLastLeg()
        })
    }

    _setupWindInput(): void {
        // workaround from https://github.com/soundar24/roundSlider/issues/71
        // eslint-disable-next-line prefer-destructuring
        const _getTooltipPos: () => RoundSliderPos = $.fn.roundSlider.prototype._getTooltipPos
        $.fn.roundSlider.prototype._getTooltipPos = function (): RoundSliderPos {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip)
            }

            const pos = _getTooltipPos.call(this)
            this.container.append(this.tooltip)
            return pos
        }

        // @ts-expect-error
        window.tooltip = (arguments_) => `${displayCompass(arguments_.value)}<br>${String(arguments_.value)}°`

        $(`#${this._sliderId}`).roundSlider({
            sliderType: "default",
            handleSize: "+1",
            startAngle: 90,
            width: 20,
            radius: 110,
            min: 0,
            max: 359,
            step: 360 / compassDirections.length,
            editableTooltip: false,
            tooltipFormat: "tooltip",
            create() {
                // @ts-expect-error
                this.control.css("display", "block")
            },
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "modal-sm" })

        const body = d3Select(`#${this._modalId} .modal-body`)
        const formGroup = body.append("form").append("div").attr("class", "form-group")

        const slider = formGroup.append("div").attr("class", "alert alert-primary").attr("role", "alert")
        slider.append("label").attr("for", this._sliderId).text("Current in-game wind")
        slider.append("div").attr("id", this._sliderId).attr("class", "rslider")

        const shipId = `${this._shipId}-Base-select`
        const ship = formGroup.append("div").attr("class", "alert alert-primary").attr("role", "alert")
        const div = ship.append("div").attr("class", "d-flex flex-column")
        div.append("label").attr("for", shipId).text("Ship (optional)")
        div.append("select").attr("name", shipId).attr("id", shipId)
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._injectModal()
        this._setupWindInput()

        this._shipCompare = new CompareShips(this._shipId)
        void this._shipCompare.CompareShipsInit()
    }

    _useUserInput(): void {
        this._resetJourneyData()
        this._journey.startWindDegrees = this._getStartWind()
        this._setShipName()
        this._printSummary()
        this._printJourney()
    }

    /**
     * Action when selected
     */
    _journeySelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`)
            .modal("show")
            .one("hidden.bs.modal", () => {
                this._useUserInput()
            })
    }

    _printCompass(): void {
        const x = this._journey.segments[0].position[0]
        const y = this._journey.segments[0].position[1]

        this._compass = this._g
            .append<SVGGElement>("svg")
            .attr("id", this._compassId)
            .attr("class", "compass")
            .attr("x", x)
            .attr("y", y)

        this._compassG = this._compass.append("g")
        printCompassRose({ element: this._compassG, radius: this._compassRadius })
    }

    _removeCompass(): void {
        this._compass.remove()
    }

    _getSpeedAtDegrees(degrees: number): number {
        return Math.max(this._speedScale(degrees) ?? 0, this._minOWSpeed)
    }

    _calculateDistanceForSection(degreesCourse: number, degreesCurrentWind: number): number {
        const degreesForSpeedCalc = (degreesFullCircle - degreesCourse + degreesCurrentWind) % degreesFullCircle
        const speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this._owSpeedFactor
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

    _getStartWind(): number {
        const select$ = $(`#${this._sliderId}`)
        const currentUserWind = Number(select$.roundSlider("getValue"))
        // Current wind in correctionValueDegrees
        return select$.length > 0 ? currentUserWind : 0
    }

    _setShipSpeed(): void {
        let speedDegrees: number[]

        if (this._journey.shipName === this._defaultShipName) {
            // Dummy ship speed
            speedDegrees = [...new Array(24).fill(this._defaultShipSpeed / 2)]
        } else {
            ;({ speedDegrees } = this._shipCompare.singleShipData)
        }

        this._speedScale.range(speedDegrees)
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

            currentWindDegrees = (degreesFullCircle + currentWindDegrees - this._degreesPerMinute) % degreesFullCircle

            // console.log({ distanceCurrentSection }, { totalMinutesSegment });
        }

        this._journey.currentWindDegrees = currentWindDegrees

        return totalMinutesSegment
    }

    _setShipName(): void {
        if (this._shipCompare?.singleShipData?.name) {
            this._journey.shipName = `${this._shipCompare.singleShipData.name}`
        } else {
            this._journey.shipName = this._defaultShipName
        }
    }

    /**
     * Remove label text boxes
     */
    _removeLabels(): void {
        const label = this._g.selectAll("g.journey g.label")
        label.select("text").remove()
        label.select("rect").remove()
    }

    _correctJourney(): void {
        const defaultTranslate = 20
        const svg = d3Select<SVGSVGElement, unknown>("#na-svg")
        const currentTransform = d3ZoomTransform(svg.node()!)
        // Don't scale on higher zoom level
        const scale = Math.max(1, currentTransform.k)
        const fontSize = this._fontSize / scale
        const textTransform = d3ZoomIdentity.translate(defaultTranslate / scale, defaultTranslate / scale)
        const textPadding = this._labelPadding / scale
        const circleRadius = 10 / scale
        const pathWidth = 5 / scale

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
            const lineHeight = fontSize * 1.3
            text.text("").attr("dy", 0).attr("transform", textTransform.toString()).style("font-size", `${fontSize}px`)
            lines.forEach((line, j) => {
                const tspan = text.append("tspan").html(line)
                if (j > 0) {
                    tspan.attr("x", 0).attr("dy", lineHeight)
                }
            })

            // Correct box width
            const bbText = (text.node() as SVGTextElement).getBBox()
            const width = d.label ? bbText.width + textPadding * 2 : 0
            const height = d.label ? bbText.height + textPadding : 0
            node.select("rect").attr("width", width).attr("height", height)

            // Enlarge circles
            const circle = node.select("circle").attr("r", circleRadius).attr("class", "")

            // Move circles down and visually above text box
            node.append(() => circle.remove().node())

            // Enlarge and hide first circle
            if (i === 0) {
                circle.attr("r", circleRadius * 4).attr("class", "drag-hidden")
            }

            // Hide last circle
            if (i === this._journey.segments.length - 1) {
                circle.attr("r", circleRadius).attr("class", "drag-hidden")
            }
        }

        // Correct text boxes
        this._g.selectAll<SVGGElement, Segment>("g.journey g.label").each(function (this, d, i) {
            correctTextBox(this, d, i)
        })
        // Correct journey stroke width
        if (this._gJourneyPath) {
            this._gJourneyPath.style("stroke-width", `${pathWidth}px`)
        }

        if (this._compassG) {
            this._compassG.attr("transform", `scale(${1 / scale})`)
        }
    }

    /**
     * Print labels
     */
    _printLabels(): void {
        // Component used to render each label (take only single longest line)
        const textLabel = layoutTextLabel()
            .padding(this._labelPadding)
            .value((d: Segment): string => {
                const lines = d.label.split("|")
                // Find longest line (number of characters)
                // eslint-disable-next-line unicorn/no-reduce
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
                    return [bbText.width + this._labelPadding * 2, bbText.height * numberLines + this._labelPadding * 2]
                }
            )
            .position((d: Segment) => d.position)
            .component(textLabel)

        // Render
        // @ts-expect-error
        this._g.datum(this._journey.segments.map((segment) => segment)).call(labels)
    }

    _setupSummary(): void {
        // Main box
        this._divJourneySummary = d3Select("main #summary-column")
            .append("div")
            .attr("id", "journey-summary")
            .attr("class", "journey-summary d-none")

        // Selected ship
        this._journeySummaryShip = this._divJourneySummary.append("div").attr("class", "block small")
        this._journeySummaryTextShip = this._journeySummaryShip.append("div")
        this._journeySummaryShip.append("div").attr("class", "summary-des").text("ship")

        // Wind direction
        this._journeySummaryWind = this._divJourneySummary.append("div").attr("class", "block small")
        this._journeySummaryTextWind = this._journeySummaryWind.append("div")
        this._journeySummaryWind.append("div").attr("class", "summary-des").text("wind")

        this._divJourneySummary
            .append("div")
            .attr("class", "block")
            .append("button")
            .attr("id", this._deleteLastLegButtonId)
            .attr("class", "btn btn-outline-primary btn-sm")
            .attr("role", "button")
            .text("Clear last leg")
    }

    _displaySummary(showJourneySummary: boolean): void {
        this._divJourneySummary.classed("d-none", !showJourneySummary)
        d3Select("#port-summary").classed("d-none", showJourneySummary)
    }

    _showSummary(): void {
        this._displaySummary(true)
    }

    _hideSummary(): void {
        this._displaySummary(false)
    }

    _printSummaryShip(): void {
        this._journeySummaryTextShip.text(this._journey.shipName)
    }

    _printSummaryWind(): void {
        this._journeySummaryTextWind.html(`From ${displayCompassAndDegrees(this._journey.startWindDegrees)}`)
    }

    _printSummary(): void {
        this._printSummaryWind()
        this._printSummaryShip()
    }

    _printLines(): void {
        if (this._gJourneyPath) {
            this._gJourneyPath
                .datum(
                    this._journey.segments.length > 1
                        ? this._journey.segments.map((segment) => segment.position)
                        : [[0, 0]]
                )
                .attr("marker-end", "url(#journey-arrow)")
                // @ts-expect-error
                .attr("d", this._line)
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
                this._journey.totalDistance
            )}\u2009k ${MakeJourney._getHumanisedDuration(this._journey.totalMinutes)}`
        }

        return textDistance
    }

    _setSegmentLabel(index = this._journey.segments.length - 1): void {
        const pt1 = { x: this._journey.segments[index].position[0], y: this._journey.segments[index].position[1] }
        const pt2 = {
            x: this._journey.segments[index - 1].position[0],
            y: this._journey.segments[index - 1].position[1],
        }

        const courseDegrees = rotationAngleInDegrees(pt1, pt2)
        const distanceK = getDistance(pt1, pt2)
        const courseCompass = degreesToCompass(courseDegrees)

        const minutes = this._calculateMinutesForSegment(
            courseDegrees,
            this._journey.currentWindDegrees,
            distanceK * 1000
        )
        // console.log("*** start", this._journey.currentWindDegrees, { distanceK }, { courseCompass });
        this._journey.totalDistance += distanceK
        this._journey.totalMinutes += minutes
        const textDirection = this._getTextDirection(courseCompass, courseDegrees, pt1)
        const textDistance = this._getTextDistance(distanceK, minutes, index > 1)

        this._journey.segments[index].label = `${textDirection}|${textDistance}`
        // console.log("*** end", this._journey);
    }

    _printSegment(): void {
        this._printLines()
        this._setSegmentLabel()
        this._printLabels()
        this._correctJourney()
        // @ts-expect-error
        this._g.selectAll<SVGGElement, Segment>("g.journey g.label circle").call(this._drag)
    }

    _printJourney(): void {
        this._printLines()
        this._resetJourneyData()
        this._journey.segments.forEach((d, i) => {
            if (i < this._journey.segments.length - 1) {
                this._setSegmentLabel(i + 1)
            }
        })

        this._printLabels()
        this._correctJourney()
        // @ts-expect-error
        this._g.selectAll<SVGGElement, Segment>("g.journey g.label circle").call(this._drag)
    }

    _deleteLastLeg(): void {
        this._journey.segments.pop()
        if (this._journey.segments.length > 0) {
            this._printJourney()
        } else {
            this._g.selectAll("g.journey g.label").remove()
            this._gJourneyPath.remove()
            this._removeCompass()
            this._hideSummary()
            this._initJourneyData()
        }
    }

    _initJourney(): void {
        this._showSummary()
        this._printSummary()
        this._printCompass()
        this._gJourneyPath = this._g.append("path")
    }

    setSummaryPosition(topMargin: number, rightMargin: number): void {
        this._divJourneySummary.style("top", `${topMargin}px`).style("right", `${rightMargin}px`)
    }

    plotCourse(x: number, y: number): void {
        if (this._journey.segments[0].position[0] > 0) {
            this._journey.segments.push({ position: [x, y], label: "", index: this._journey.segments.length })
            this._printSegment()
        } else {
            this._journey.segments[0] = { position: [x, y], label: "", index: 0 }
            this._initJourney()
        }
    }
}
