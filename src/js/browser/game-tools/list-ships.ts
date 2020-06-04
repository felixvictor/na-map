/*!
 * This file is part of na-map.
 *
 * @file      ship list.
 * @module    ship-list
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"
import { select as d3Select } from "d3-selection"
import { repeat } from "lit-html/directives/repeat"
import { html, render, TemplateResult } from "lit-html"

import { registerEvent } from "../analytics"
import { putImportError } from "../../common/common"
import { HtmlString, initTablesort, insertBaseModal } from "../../common/common-browser"
import { formatFloatFixedHTML, formatInt } from "../../common/common-format"

import { sortBy } from "../../common/common-node"
import { ShipData } from "../../common/gen-json"

interface ShipListData {
    id: number
    class: number
    name: string
    guns: number
    battleRating: number
    crew: string
    maxSpeed: TemplateResult
    turnSpeed: TemplateResult
    broadside: string
    bowChaser: string
    sternChaser: string
    sides: string
}

/**
 *
 */
export default class ShipList {
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _shipListData: ShipListData[] = {} as ShipListData[]

    constructor() {
        this._baseName = "List ships"
        this._baseId = "ship-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            const shipData = (await import(/* webpackChunkName: "data-ships" */ "Lib/gen-generic/ships.json"))
                .default as ShipData[]

            this._shipListData = shipData.map(
                (ship: ShipData): ShipListData => ({
                    id: ship.id,
                    class: ship.class,
                    name: ship.name,
                    guns: ship.guns,
                    battleRating: ship.battleRating,
                    crew: formatInt(ship.crew.max),
                    maxSpeed: formatFloatFixedHTML(ship.ship.maxSpeed),
                    turnSpeed: formatFloatFixedHTML(ship.rudder.turnSpeed),
                    broadside: formatInt(ship.broadside.cannons),
                    bowChaser: ship.gunsPerDeck[4] ? String(ship.gunsPerDeck[4]) : "",
                    sternChaser: ship.gunsPerDeck[5] ? String(ship.gunsPerDeck[5]) : "",
                    sides: `${formatInt(ship.sides.armour)} (${ship.sides.thickness})`,
                })
            )
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._shipListSelected()
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "modal-lg" })

        d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid")
    }

    _initModal(): void {
        initTablesort()
        this._injectModal()

        this._injectList()
    }

    _shipListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    /**
     * Show ships
     */
    _injectList(): void {
        d3Select(`#${this._baseId} div`).remove()

        // Add new ship list
        const div = d3Select(`#${this._baseId}`).append("div").attr("class", "row")
        render(this._getList(), div.node() as HTMLDivElement)
    }

    _getHead(): TemplateResult {
        return html`
            <thead>
                <tr class="thead-group">
                    <th scope="col" class="border-bottom-0"></th>
                    <th scope="col" class="border-bottom-0"></th>
                    <th scope="col" class="text-right border-bottom-0"></th>
                    <th scope="col" class="text-right border-bottom-0"></th>
                    <th scope="col" class="text-right border-bottom-0"></th>
                    <th scope="col" class="text-center" colspan="2">Speed</th>
                    <th scope="col" class="text-right border-bottom-0"></th>
                    <th scope="col" class="text-center" colspan="2">Chasers</th>
                    <th scope="col" class="text-right border-bottom-0"></th>
                </tr>

                <tr>
                    <th scope="col" class="text-right border-top-0">Class</th>
                    <th scope="col" class="border-top-0">Name</th>
                    <th scope="col" class="text-right border-top-0">Guns</th>
                    <th scope="col" class="text-right border-top-0">Battle rating</th>
                    <th scope="col" class="text-right border-top-0">Crew</th>
                    <th scope="col" class="text-right">Maximum</th>
                    <th scope="col" class="text-right">Turn</th>
                    <th scope="col" class="text-right border-top-0">Broadside</th>
                    <th scope="col" class="text-right border-top-0">Bow</th>
                    <th scope="col" class="text-right">Stern</th>
                    <th scope="col" class="text-right border-top-0">Sides</th>
                </tr>
            </thead>
        `
    }

    _getBody(sortCols = ["class", "-battleRating", "name"]): TemplateResult {
        const ships = this._shipListData
            // @ts-expect-error
            .sort(sortBy(sortCols))

        return html`
            <tbody>
                ${repeat(
                    ships,
                    (ship: ShipListData) => ship.id,
                    (ship: ShipListData) => html`<tr>
                        <td class="text-right">${ship.class}</td>
                        <td>${ship.name}</td>
                        <td class="text-right">${ship.guns}</td>
                        <td class="text-right">${ship.battleRating}</td>
                        <td class="text-right">${ship.crew}</td>
                        <td class="text-right">${ship.maxSpeed}</td>
                        <td class="text-right">${ship.turnSpeed}</td>
                        <td class="text-right">${ship.broadside}</td>
                        <td class="text-right">${ship.bowChaser}</td>
                        <td class="text-right">${ship.sternChaser}</td>
                        <td class="text-right">${ship.sides}</td>
                    </tr>`
                )}
            </tbody>
        `
    }

    _getList(): TemplateResult {
        return html`
            <table id="table-${this._baseId}" class="table table-sm small na-table">
                ${this._getHead()} ${this._getBody()}
            </table>
        `
    }
}
