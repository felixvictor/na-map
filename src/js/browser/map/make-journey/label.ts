/*!
 * This file is part of na-map.
 *
 * @file      Journey labels.
 * @module    map-tools/make-journey/labels
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { layoutAnnealing, layoutLabel, layoutTextLabel } from "@d3fc/d3fc-label-layout"
import { zoomIdentity as d3ZoomIdentity } from "d3-zoom"
import { select as d3Select, Selection } from "d3-selection"

import { Point } from "common/common-math"
import { Segment } from "./index"

export default class MakeJourneyLabel {
    #numberSegments = 0

    readonly #circleRadius = 10
    readonly #fontSize: number
    readonly #g: Selection<SVGGElement, unknown, HTMLElement, unknown>
    readonly #labelPadding = 20
    readonly #lineHeight: number
    readonly #pathWidth = 6
    readonly #textPadding = this.#labelPadding * 1.3
    readonly #textTransform = d3ZoomIdentity.translate(this.#labelPadding, this.#labelPadding)
    readonly #gJourneyPath: Selection<SVGPathElement, unknown, HTMLElement, unknown>

    constructor(
        g: Selection<SVGGElement, unknown, HTMLElement, unknown>,
        gJourneyPath: Selection<SVGPathElement, unknown, HTMLElement, unknown>,
        fontSize: number
    ) {
        this.#g = g
        this.#gJourneyPath = gJourneyPath
        this.#fontSize = fontSize
        this.#lineHeight = this.#fontSize * 1.4
    }

    /** Correct Text Box
     *  - split text into lines
     *  - correct box width
     *  - enlarge circles
     *  - remove last circle
     * {@link https://stackoverflow.com/a/13275930}
     */
    _correctTextBox(d: Segment, i: number, self: SVGGElement): void {
        // Split text into lines
        const node = d3Select(self)
        const text = node.select("text")
        const lines = d.label.split("|")

        text.text("")
            .attr("dy", 0)
            .attr("transform", this.#textTransform.toString())
            .style("font-size", `${this.#fontSize}px`)
        for (const [j, line] of lines.entries()) {
            const tspan = text.append("tspan").html(line)
            if (j > 0) {
                tspan.attr("x", 0).attr("dy", this.#lineHeight)
            }
        }

        // Correct box width
        const bbText = (text.node() as SVGTextElement).getBBox()
        const width = d.label ? bbText.width + this.#textPadding * 2 : 0
        const height = d.label ? bbText.height + this.#textPadding : 0
        node.select("rect").attr("width", width).attr("height", height).attr("class", "svg-shadow")

        // Enlarge circles
        const circle = node
            .select("circle")
            .attr("r", i === 0 || i === this.#numberSegments ? this.#circleRadius * 4 : this.#circleRadius)
            .attr(
                "class",
                `click-circle svg-shadow ${i === 0 || i === this.#numberSegments ? "drag-hidden" : "drag-circle"}`
            )

        // Move circles down and visually above text box
        node.append(() => circle.remove().node())
    }

    _correctJourney(): void {
        // Correct text boxes
        this.#g.selectAll<SVGGElement, Segment>("#journey g.labels g.label").each((d, i, nodes) => {
            this._correctTextBox(d, i, nodes[i])
        })
        // Correct journey stroke width
        if (this.#gJourneyPath) {
            this.#gJourneyPath.style("stroke-width", `${this.#pathWidth}px`)
        }
    }

    /**
     * Print labels
     */
    print(segments: Segment[]): void {
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
        this.#g.datum(segments).call(labels)
        this.#numberSegments = segments.length - 1
        this._correctJourney()
    }
}
