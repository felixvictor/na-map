import { Area, colourScaleCounty, countyPolygon } from "./map-data"
import { SVGGDatum, ZoomLevel } from "common/interface"
import { select as d3Select, Selection } from "d3-selection"
import { Point } from "common/common-math"

export default class Counties {
    #countyPolygon = countyPolygon
    #gCounty = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>

    constructor() {
        this.#setupSVG()
    }

    #setupSVG() {
        this.#gCounty = d3Select<SVGGElement, SVGGDatum>("#ports")
            .append<SVGGElement>("g")
            .attr("data-ui-component", "county")
            .attr("class", "sub-title")
    }

    #updateJoin(lowerBound: Point, upperBound: Point, showRadius: string) {
        const data = this.#countyPolygon.filter(
            (county) =>
                county.centroid[0] >= lowerBound[0] &&
                county.centroid[0] <= upperBound[0] &&
                county.centroid[1] >= lowerBound[1] &&
                county.centroid[1] <= upperBound[1]
        )

        this.#gCounty
            .selectAll<SVGTextElement, Area>("text")
            .data(data, (d) => d.name)
            .join(
                (enter) =>
                    enter
                        .append("text")
                        .attr("class", "svg-text-center")
                        .attr("transform", (d) => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                        .text((d) => d.name),
                (update) =>
                    update.attr("fill", (d: Area): string => (showRadius === "county" ? colourScaleCounty(d.name) : ""))
            )

        /*
        const curve = d3CurveCatmullRomClosed;
        const line = d3Line().curve(curve);
        this._gCounty
            .selectAll("path")
            .data(data, d => d.name)
            .join(enter =>
                enter
                    .append("path")
                    .attr("d", d => line(d.polygon))
                    .attr("fill", "#373")
            );
        */
    }

    update(zoomLevel: ZoomLevel, lowerBound: Point, upperBound: Point, showRadius: string) {
        if (zoomLevel === "portLabel") {
            this.#updateJoin(lowerBound, upperBound, showRadius)
            this.#gCounty.classed("d-none", false)
        } else {
            this.#gCounty.classed("d-none", true)
        }
    }
}
