/*!
 * This file is part of na-map.
 *
 * @file      Journey summary.
 * @module    map-tools/make-journey/summary
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select, Selection } from "d3-selection"
import { displayCompassAndDegrees } from "../../util"

import { Journey } from "./index"
import { HtmlString } from "common/interface"

export default class MakeJourneySummary {
    #divJourneySummary = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryShip = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryTextShip = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryTextWind = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #journeySummaryWind = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>

    readonly #deleteLastLegButtonId: HtmlString

    constructor(deleteLastLegButtonId: HtmlString) {
        this.#deleteLastLegButtonId = deleteLastLegButtonId

        this._setupSummary()
    }

    _setupSummary(): void {
        // Main box
        this.#divJourneySummary = d3Select("main #summary-column")
            .append("div")
            .attr("id", "journey-summary")
            .attr("class", "journey-summary shadow-lg d-none")

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

    _printSummaryShip(shipName: string): void {
        this.#journeySummaryTextShip.text(shipName)
    }

    _printSummaryWind(startWindDegrees: number): void {
        this.#journeySummaryTextWind.html(`From ${displayCompassAndDegrees(startWindDegrees)}`)
    }

    show(): void {
        this._displaySummary(true)
    }

    hide(): void {
        this._displaySummary(false)
    }

    setPosition(topMargin: number, rightMargin: number): void {
        this.#divJourneySummary.style("top", `${topMargin}px`).style("right", `${rightMargin}px`)
    }

    print({ startWindDegrees, shipName }: Journey): void {
        this._printSummaryWind(startWindDegrees)
        this._printSummaryShip(shipName)
    }
}
