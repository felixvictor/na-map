/*!
 * This file is part of na-map.
 *
 * @file      Compare ships ship file.
 * @module    game-tools/compare-ships/ship
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection"
import { arc as d3Arc, pie as d3Pie } from "d3-shape"
import * as d3Selection from "d3-selection"

import { HtmlString, numberSegments } from "../../../common/common-browser"

import { CompareShips, ShipDisplayData } from "."

export class Ship {
    readonly ticksSpeed: number[]
    readonly ticksSpeedLabels: string[]
    // Class instance of the ship to be compared to
    readonly _shipCompare: CompareShips
    readonly select!: HtmlString
    _mainG!: d3Selection.Selection<SVGGElement, unknown, HTMLElement, any>
    // Column id
    private readonly _id: string
    private _svg!: d3Selection.Selection<SVGSVGElement, unknown, HTMLElement, any>
    constructor(id: string, shipCompare: CompareShips) {
        this._id = id
        this._shipCompare = shipCompare

        // Speed ticks
        // noinspection MagicNumberJS
        this.ticksSpeed = [12, 8, 4, 0]
        this.ticksSpeedLabels = this.ticksSpeed.map((speed: number) => `${speed} knots`)

        this.select = `#ship-compare-${this._id}`

        this._setupSvg()
        this._setCompass()
    }

    /**
     * Format cannon pound value
     * @param limit - Upper limit for [0] cannon and [1] carronades
     */
    static pd(limit: number[]): HtmlString {
        let s = `<span class="badge badge-white">${limit[0]}\u202F/\u202F`
        if (limit[1]) {
            s += `${limit[1]}`
        } else {
            s += "\u2013"
        }

        s += "\u202Flb</span>"
        return s
    }

    /**
     * Format cannon/carronade upper limit classes
     * @param deckClassLimit - Limit per deck
     * @param gunsPerDeck - Guns per deck
     * @returns Formatted string [0] limits and [1] possibly empty lines at the bottom
     */
    static getCannonsPerDeck(deckClassLimit: number[][], gunsPerDeck: number[]): [string, string] {
        let s = `${gunsPerDeck[0]}\u00A0${Ship.pd(deckClassLimit[0])}`
        let br = ""
        for (let i = 1; i < 4; i += 1) {
            if (gunsPerDeck[i]) {
                s = `${gunsPerDeck[i]}\u00A0${Ship.pd(deckClassLimit[i])}\u202F<br>${s}`
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
        return '<div class="col-9"><div class="row no-gutters">'
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
         * @param element - Ship element
         * @returns HTML formatted column
         */
        function displayFirstColumn(element: string): HtmlString {
            row += 1
            return `<div class="row row-small ${row % 2 ? "row-light" : ""}"><div class="col-3">${element}</div>`
        }

        /**
         * HTML format a single column
         * @param element - Ship element
         * @param description - Element description
         * @param col - Number of columns
         * @returns HTML formatted column
         */
        function displayColumn(element: keyof ShipDisplayData, description: string, col = 6): HtmlString {
            let elementText = ""
            let br = ""

            if (element === "cannonsPerDeck") {
                ;[elementText, br] = ship[element]
                br = `<br>${br}`
            } else {
                elementText = element === "" ? "" : String(ship[element])
            }

            return `<div class="col-${col}">${elementText}<br><span class="des">${description}</span>${br}</div>`
        }

        let text = ""

        text += displayFirstColumn(ship.shipRating)
        text += Ship.displaySecondBlock()
        text += displayColumn("battleRating", "Battle rating")
        text += displayColumn("guns", "Cannons")
        text += displayColumn("upgradeXP", "Knowledge XP")
        text += displayColumn("waterlineHeight", "Water line")
        text += "</div></div></div>"

        text += displayFirstColumn(ship.decks)
        text += Ship.displaySecondBlock()
        text += displayColumn("cannonsPerDeck", "Gun decks")
        text += displayColumn("firezoneHorizontalWidth", "Firezone horizontal width")
        text += "</div></div></div>"

        text += displayFirstColumn("Broadside (lb)")
        text += Ship.displaySecondBlock()
        text += displayColumn("cannonBroadside", "Cannons")
        text += displayColumn("carroBroadside", "Carronades")
        text += "</div></div></div>"

        text += displayFirstColumn("Chasers")
        text += Ship.displaySecondBlock()
        text += displayColumn("gunsFront", "Bow")
        text += displayColumn("gunsBack", "Stern")
        text += "</div></div></div>"

        text += displayFirstColumn("Speed")
        text += Ship.displaySecondBlock()
        text += displayColumn("maxSpeed", "Maximum")
        text += displayColumn("", "")
        text += displayColumn("acceleration", "Acceleration")
        text += displayColumn("deceleration", "Deceleration")
        text += displayColumn("maxTurningSpeed", "Turn speed")
        text += displayColumn("halfturnTime", "Rudder half time")
        text += "</div></div></div>"

        text += displayFirstColumn('Hit points <span class="badge badge-white">Thickness</span>')
        text += Ship.displaySecondBlock()
        text += displayColumn("sideArmor", "Sides")
        text += displayColumn("structure", "Hull")
        text += displayColumn("frontArmor", "Bow")
        text += displayColumn("backArmor", "Stern")
        text += displayColumn("pump", "Pump")
        text += displayColumn("rudder", "Rudder")
        text += "</div></div></div>"

        text += displayFirstColumn('Masts <span class="badge badge-white">Thickness</span>')
        text += Ship.displaySecondBlock()
        text += displayColumn("sails", "Sails")
        text += displayColumn("mastBottomArmor", "Bottom")
        text += displayColumn("mastMiddleArmor", "Middle")
        text += displayColumn("mastTopArmor", "Top")
        text += "</div></div></div>"

        text += displayFirstColumn("Crew")
        text += Ship.displaySecondBlock()
        text += displayColumn("minCrew", "Minimum", 4)
        text += displayColumn("sailingCrew", "Sailing", 4)
        text += displayColumn("maxCrew", "Maximum", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Resistance")
        text += Ship.displaySecondBlock()
        text += displayColumn("fireResistance", "Fire", 4)
        text += displayColumn("leakResistance", "Leak", 4)
        text += displayColumn("splinterResistance", "Splinter", 4)
        text += "</div></div></div>"

        text += displayFirstColumn('Repairs needed <span class="badge badge-white">Set of 5</span>')
        text += Ship.displaySecondBlock()
        text += displayColumn("hullRepairsNeeded", "Hull", 4)
        text += displayColumn("rigRepairsNeeded", "Rig", 4)
        text += displayColumn("rumRepairsNeeded", "Rum", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Repair")
        text += Ship.displaySecondBlock()
        text += displayColumn("hullRepairAmount", "Hull %", 4)
        text += displayColumn("rigRepairAmount", "Rig %", 4)
        text += displayColumn("repairTime", "Time (sec)", 4)
        text += "</div></div></div>"

        text += displayFirstColumn("Hold")
        text += Ship.displaySecondBlock()
        text += displayColumn("maxWeight", "Tons")
        text += displayColumn("holdSize", "Cargo slots")
        text += "</div></div></div>"

        text += "</div>"
        return text
    }

    /**
     * Setup svg
     */
    _setupSvg(): void {
        const element = d3Select(this.select)

        d3Select(`${this.select} svg`).remove()

        this._svg = element
            .append("svg")
            .attr("width", this._shipCompare.svgWidth)
            .attr("height", this._shipCompare.svgHeight)
            .attr("data-ui-component", "sailing-profile")
            .attr("fill", "none")
        this._mainG = this._svg
            .append("g")
            .attr("transform", `translate(${this._shipCompare.svgWidth / 2},${this._shipCompare.svgHeight / 2})`)
        d3Select(`${this.select} div`).remove()

        element.append("div")
    }

    /**
     * Set compass
     */
    _setCompass(): void {
        // Compass
        const data = new Array(numberSegments / 2)
        data.fill(1, 0)
        const pie = d3Pie().sort(null).value(1)(data)

        const arc = d3Arc<number, number>()
            .outerRadius(this._shipCompare.radiusSpeedScale(12))
            .innerRadius(this._shipCompare.innerRadius)

        // Add compass arcs
        this._mainG
            .append("g")
            .attr("class", "compass-arc")
            .selectAll("path")
            .data(pie)
            // @ts-ignore
            .join((enter) => enter.append("path").attr("d", arc))

        // Add the circles for each speed tick
        this._mainG
            .append("g")
            .attr("class", "speed-circle")
            .selectAll("circle")
            .data(this.ticksSpeed)
            .join((enter) => enter.append("circle").attr("r", (d) => this._shipCompare.radiusSpeedScale(d)))
    }
}
