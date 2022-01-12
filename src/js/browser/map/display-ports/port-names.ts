import { select as d3Select, Selection } from "d3-selection"
import {
    Coordinate,
    defaultCircleSize,
    defaultFontSize,
    degreesHalfCircle,
    degreesToRadians,
    roundToThousands,
} from "common/common-math"
import { PortWithTrades } from "common/gen-json"
import { SVGGDatum, ZoomLevel } from "common/interface"

export interface CurrentPort {
    id: number
    coord: Coordinate
}

export default class PortNames {
    #currentPort: CurrentPort = { id: 366, coord: { x: 4396, y: 2494 } } // Shroud Cay
    #gPortNames = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #scale = 1
    #zoomLevel!: ZoomLevel
    readonly #circleSize = defaultCircleSize
    readonly #fontSize = defaultFontSize
    readonly #showPBZones = "all"

    constructor() {
        this.#setupSVG()
    }

    get currentPort(): CurrentPort {
        return this.#currentPort
    }

    set currentPort(newCurrentPort: CurrentPort) {
        this.#currentPort = newCurrentPort
    }

    #setupSVG() {
        this.#gPortNames = d3Select<SVGGElement, SVGGDatum>("#ports")
            .append<SVGGElement>("g")
            .attr("data-ui-component", "port-names")
            .attr("class", "fill-white")
    }

    #updateTextsX(d: PortWithTrades, circleSize: number): number {
        return this.#zoomLevel === "pbZone" &&
            (this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id))
            ? d.coordinates[0] + Math.round(circleSize * 1.3 * Math.cos(degreesToRadians(d.angle)))
            : d.coordinates[0]
    }

    #updateTextsY(d: PortWithTrades, circleSize: number, fontSize: number): number {
        const deltaY = circleSize + fontSize * 1.2

        if (this.#zoomLevel !== "pbZone") {
            return d.coordinates[1] + deltaY
        }

        const dy = d.angle > 90 && d.angle < 270 ? fontSize : 0
        return this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id)
            ? d.coordinates[1] + Math.round(circleSize * 1.3 * Math.sin(degreesToRadians(d.angle))) + dy
            : d.coordinates[1] + deltaY
    }

    #updateTextsAnchor(d: PortWithTrades): string {
        if (
            this.#zoomLevel === "pbZone" &&
            (this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id))
        ) {
            return d.angle > 0 && d.angle < degreesHalfCircle ? "start" : "end"
        }

        return "middle"
    }

    #updateJoin(data: PortWithTrades[]) {
        const circleSize = roundToThousands(this.#circleSize / this.#scale)
        const fontSize = roundToThousands(this.#fontSize / this.#scale)

        this.#gPortNames
            .selectAll<SVGTextElement, PortWithTrades>("text")
            .data(data, (d) => String(d.id))
            .join((enter) => enter.append("text").text((d) => d.name))
            .attr("x", (d) => this.#updateTextsX(d, circleSize))
            .attr("y", (d) => this.#updateTextsY(d, circleSize, fontSize))
            .style("text-anchor", (d) => this.#updateTextsAnchor(d))
            .style("dominant-baseline", "auto")

        this.#gPortNames.attr("font-size", `${fontSize}px`).classed("d-none", false)
    }

    update(zoomLevel: ZoomLevel, scale: number, portData: PortWithTrades[]) {
        this.#zoomLevel = zoomLevel
        this.#scale = scale

        if (this.#zoomLevel === "initial") {
            this.#gPortNames.classed("d-none", true)
        } else {
            this.#updateJoin(portData)
        }
    }
}
