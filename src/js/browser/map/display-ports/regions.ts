import { Area, regionPolygon } from "./map-data"
import { SVGGDatum, ZoomLevel } from "common/interface"
import { select as d3Select, Selection } from "d3-selection"
import { Point } from "common/common-math"

export default class Regions {
    #gRegion = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #regionPolygon = regionPolygon

    constructor() {
        this.#setupSVG()
    }

    #setupSVG() {
        this.#gRegion = d3Select<SVGGElement, SVGGDatum>("#ports")
            .append<SVGGElement>("g")
            .attr("data-ui-component", "region")
            .attr("class", "title")
    }

    #updateJoin(lowerBound: Point, upperBound: Point) {
        const data = this.#regionPolygon.filter(
            (region) =>
                region.centroid[0] >= lowerBound[0] &&
                region.centroid[0] <= upperBound[0] &&
                region.centroid[1] >= lowerBound[1] &&
                region.centroid[1] <= upperBound[1]
        )

        this.#gRegion
            .selectAll<SVGTextElement, Area>("text")
            .data(data, (d) => d.name)
            .join((enter) =>
                enter
                    .append("text")
                    .attr("class", "svg-text-center")
                    .attr("transform", (d) => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                    .text((d) => d.name)
            )

        /* Show polygon for test purposes
        const d3line2 = d3
            .line()
            .x(d => d[0])
            .y(d => d[1]);

        this._gRegion
            .selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", d => d3line2(d.polygon))
            .attr("fill", "#999");
            */
    }

    update(zoomLevel: ZoomLevel, lowerBound: Point, upperBound: Point) {
        if (zoomLevel === "initial") {
            this.#updateJoin(lowerBound, upperBound)
            this.#gRegion.classed("d-none", false)
        } else {
            this.#gRegion.classed("d-none", true)
        }
    }
}
