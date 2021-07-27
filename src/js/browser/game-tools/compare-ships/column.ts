/*!
 * This file is part of na-map.
 *
 * @file      Compare ships ship file.
 * @module    game-tools/compare-ships/ship
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select, Selection } from "d3-selection"
import { arc as d3Arc, pie as d3Pie } from "d3-shape"

import { numberSegments } from "common/common-browser"
import { CompareShips } from "./compare-ships"
import { ShipGunDeck, ShipGuns } from "common/gen-json"
import { HtmlString } from "common/interface"
import { ShipDisplayData } from "compare-ships"

type TextColumnSize = 4 | 6

export class Column {
    readonly #outputDivSel: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #mainDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #mainG = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>

    readonly ticksSpeed: number[]
    readonly ticksSpeedLabels: string[]
    // Class instance of the ship to be compared to
    readonly _shipCompare: CompareShips

    constructor(outputDivId: HtmlString, shipCompare: CompareShips) {
        this.#outputDivSel = d3Select(`#${outputDivId}`)
        this._shipCompare = shipCompare

        // Speed ticks
        // noinspection MagicNumberJS
        this.ticksSpeed = [12, 8, 4, 0]
        this.ticksSpeedLabels = this.ticksSpeed.map((speed: number) => `${speed} knots`)

        this._setupSvg()
        this._setCompass()
    }

    get mainDiv(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#mainDiv
    }

    get mainG(): Selection<SVGGElement, unknown, HTMLElement, unknown> {
        return this.#mainG
    }

    get outputDivSel(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#outputDivSel
    }

    /**
     * Format cannon pound value
     * @param gunsPerDeck - ShipGunDeck
     */
    static pd(gunsPerDeck: ShipGunDeck): HtmlString {
        let s = `<span class="badge badge-highlight">${gunsPerDeck.maxCannonLb}\u202F/\u202F`
        // eslint-disable-next-line unicorn/prefer-ternary
        if (gunsPerDeck.maxCarroLb) {
            s += `${gunsPerDeck.maxCarroLb}`
        } else {
            s += "\u2013"
        }

        s += "\u202Flb</span>"
        return s
    }

    /**
     * Format cannon/carronade upper limit classes
     * @param guns - Guns
     * @returns Formatted string [0] limits and [1] possibly empty lines at the bottom
     */
    static getCannonsPerDeck(guns: ShipGuns): [string, string] {
        let s = `${guns.gunsPerDeck[0].amount}\u00A0${Column.pd(guns.gunsPerDeck[0])}`
        let br = ""
        for (let i = 1; i < 4; i += 1) {
            if (guns.gunsPerDeck[i].amount) {
                s = `${guns.gunsPerDeck[i].amount}\u00A0${Column.pd(guns.gunsPerDeck[i])}\u202F<br>${s}`
            } else {
                br = `${br}<br>`
            }
        }

        return [s, br]
    }

    /**
     * HTML format head of second block
     * @returns HTML formatted block head
     */
    static displaySecondBlock(): HtmlString {
        return '<div class="col-9 row">'
    }

    // noinspection FunctionTooLongJS
    /**
     * Get HTML formatted data for a single ship
     * @param ship - Ship data
     * @returns HTML formatted column
     */
    static getText(ship: ShipDisplayData): HtmlString {
        let row = 0

        /**
         * HTML format the first column
         */
        function displayFirstColumn(element: string): HtmlString {
            row += 1
            return `<div class="row py-1 ${row % 2 ? " row-light" : ""}"><div class="col-3">${element}</div>`
        }

        /**
         * HTML format a single column
         */
        function displayColumn(
            element: keyof ShipDisplayData,
            description: string,
            col: TextColumnSize = 6
        ): HtmlString {
            let elementText: string
            let br = ""

            if (element === "cannonsPerDeck") {
                ;[elementText, br] = ship[element]
                br = `<br>${br}`
            } else {
                elementText = element === "" ? "" : String(ship[element])
            }

            let textColumnIndicator = "col-6"
            if (col === 4) {
                textColumnIndicator = "col-4"
            }

            return `<div class="${textColumnIndicator}">${elementText}<br><span class="des">${description}</span>${br}</div>`
        }

        let text = ""

        text += displayFirstColumn(ship.shipRating)
        text += Column.displaySecondBlock()
        text += displayColumn("battleRating", "Battle rating")
        text += displayColumn("guns", "Cannons")
        text += displayColumn("upgradeXP", "Knowledge XP")
        text += displayColumn("rollAngle", "Roll angle")
        text += "</div></div></div>"

        text += displayFirstColumn(ship.decks)
        text += Column.displaySecondBlock()
        text += displayColumn("cannonsPerDeck", "Gun decks")
        text += displayColumn("firezoneHorizontalWidth", "Firezone horizontal width")
        text += "</div></div></div>"

        text += displayFirstColumn("Broadside damage")
        text += Column.displaySecondBlock()
        text += displayColumn("cannonBroadsideDamage", "Cannons")
        text += displayColumn("carroBroadsideDamage", "Carronades")
        text += "</div></div></div>"

        text += displayFirstColumn("Chasers")
        text += Column.displaySecondBlock()
        text += displayColumn("gunsFront", "Bow")
        text += displayColumn("gunsBack", "Stern")
        text += "</div></div></div>"

        text += displayFirstColumn("Speed")
        text += Column.displaySecondBlock()
        text += displayColumn("maxSpeed", "Maximum")
        text += displayColumn("halfturnTime", "Rudder half time")
        text += displayColumn("acceleration", "Acceleration")
        text += displayColumn("deceleration", "Deceleration")
        text += displayColumn("turnSpeed", "Turn speed")
        text += displayColumn("turnAcceleration", "Turn acceleration")
        text += "</div></div></div>"

        text += displayFirstColumn('Hit points <span class="badge badge-highlight">Thickness</span>')
        text += Column.displaySecondBlock()
        text += displayColumn("sideArmor", "Sides")
        text += displayColumn("structure", "Hull")
        text += displayColumn("frontArmor", "Bow")
        text += displayColumn("backArmor", "Stern")
        text += "</div></div></div>"

        text += displayFirstColumn('Masts <span class="badge badge-highlight">Thickness</span>')
        text += Column.displaySecondBlock()
        text += displayColumn("sails", "Sails")
        text += displayColumn("mastBottomArmor", "Bottom")
        text += displayColumn("mastMiddleArmor", "Middle")
        text += displayColumn("mastTopArmor", "Top")
        text += "</div></div></div>"

        text += displayFirstColumn("Crew")
        text += Column.displaySecondBlock()
        text += displayColumn("minCrew", "Minimum", 4)
        text += displayColumn("sailingCrew", "Sailing", 4)
        text += displayColumn("maxCrew", "Maximum", 4)
        text += displayColumn("cannonCrew", "Cannon", 4)
        text += displayColumn("carroCrew", "Carronades", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Gunnery")
        text += Column.displaySecondBlock()
        text += displayColumn("reload", "Reload %", 4)
        text += displayColumn("dispersionHorizontal", "Horizontal dispersion %", 4)
        text += displayColumn("dispersionVertical", "Vertical dispersion %", 4)
        text += displayColumn("penetration", "Ball penetration %", 4)
        text += displayColumn("traverseUpDown", "Up/down traverse %", 4)
        text += displayColumn("traverseSide", "Side traverse %", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Boarding")
        text += Column.displaySecondBlock()
        text += displayColumn("morale", "Morale", 4)
        text += displayColumn("attack", "Attack", 4)
        text += displayColumn("defense", "Defense", 4)
        text += displayColumn("musketsCrew", "Crew with muskets", 4)
        text += displayColumn("musketsAccuracy", "Musket accuracy %", 4)
        text += displayColumn("cannonsAccuracy", "Cannon accuracy %", 4)
        text += displayColumn("prepPerRound", "Preparation per round", 4)
        text += displayColumn("prepInitial", "Initial preparation", 4)
        text += displayColumn("disengageTime", "Rounds to disengage", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Resistance")
        text += Column.displaySecondBlock()
        text += displayColumn("leakResistance", "Leak %")
        text += displayColumn("splinterResistance", "Splinter %")
        text += "</div></div></div>"

        text += displayFirstColumn('Repairs needed <span class="badge badge-highlight">Set of 5</span>')
        text += Column.displaySecondBlock()
        text += displayColumn("hullRepairsNeeded", "Hull", 4)
        text += displayColumn("rigRepairsNeeded", "Rig", 4)
        text += displayColumn("rumRepairsNeeded", "Rum", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Repair")
        text += Column.displaySecondBlock()
        text += displayColumn("hullRepairAmount", "Hull %", 4)
        text += displayColumn("rigRepairAmount", "Rig %", 4)
        text += displayColumn("repairTime", "Time (sec)", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Hold")
        text += Column.displaySecondBlock()
        text += displayColumn("holdSize", "Cargo slots")
        text += displayColumn("maxWeight", "Tons")
        text += "</div></div></div>"

        text += displayFirstColumn("Weight")
        text += Column.displaySecondBlock()
        text += displayColumn("cannonWeight", "Cannons", 4)
        text += displayColumn("carroWeight", "Carronades", 4)
        text += displayColumn("repairWeight", "Repair Set", 4)
        text += "</div></div></div>"

        text += "</div>"
        return text
    }

    /**
     * Setup svg
     */
    _setupSvg(): void {
        this.#outputDivSel.selectAll("*").remove()

        const svg = this.#outputDivSel
            .append("div")
            .attr("class", "")
            .append("svg")
            .attr("width", this._shipCompare.svgWidth)
            .attr("height", this._shipCompare.svgHeight)
            .attr("data-ui-component", "sailing-profile")
            .attr("fill", "none")
        this.#mainG = svg
            .append("g")
            .attr("transform", `translate(${this._shipCompare.svgWidth / 2},${this._shipCompare.svgHeight / 2})`)

        this.#mainDiv = this.#outputDivSel.append("div").attr("class", "compress")
    }

    /**
     * Set compass
     */
    _setCompass(): void {
        // Compass
        const data = Array.from({ length: numberSegments / 2 }, () => 1)
        // eslint-disable-next-line unicorn/no-null
        const pie = d3Pie().sort(null).value(1)(data)

        const arc = d3Arc<number, number>()
            .outerRadius(this._shipCompare.radiusSpeedScale(12) ?? 0)
            .innerRadius(this._shipCompare.innerRadius)

        // Add compass arcs
        this.#mainG
            .append("g")
            .attr("class", "compass-arc")
            .selectAll("path")
            .data(pie)
            // @ts-expect-error
            .join((enter) => enter.append("path").attr("d", arc))

        // Add the circles for each speed tick
        this.#mainG
            .append("g")
            .attr("class", "speed-circle")
            .selectAll("circle")
            .data(this.ticksSpeed)
            .join((enter) => enter.append("circle").attr("r", (d) => this._shipCompare.radiusSpeedScale(d) ?? 0))
    }
}
