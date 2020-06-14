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
import { h, render } from "preact"
import htm from "htm"
import Tablesort from "tablesort"

import { registerEvent } from "../analytics"
import { putImportError } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { formatInt } from "../../common/common-format"
import { beautifyShipNameHTML, formatFloatFixedHTML, initTablesort } from "../../common/common-game-tools"
import { sortBy } from "../../common/common-node"

import { ShipData } from "../../common/gen-json"
import { HtmlResult, HtmlString } from "../../common/interface"
import * as d3Selection from "d3-selection"

const html = htm.bind(h)

interface ShipListData {
    class: [number, number]
    name: [string, HtmlResult]
    guns: [number, number]
    battleRating: [number, string]
    crew: [number, string]
    maxSpeed: [number, HtmlResult]
    turnSpeed: [number, HtmlResult]
    broadside: [number, string]
    bowChaser: [number, string]
    sternChaser: [number, string]
    sides: [number, string]
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
    private _mainDiv!: d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, unknown>

    constructor() {
        this._baseName = "List ships"
        this._baseId = "ship-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            const shipData = (await import(/* webpackChunkName: "data-ships" */ "Lib/gen-generic/ships.json")).default // @ts-expect-error
                .sort(sortBy(["class", "-battleRating", "name"])) as ShipData[]

            this._shipListData = shipData.map(
                (ship: ShipData): ShipListData => ({
                    class: [ship.class, ship.class],
                    name: [ship.name, beautifyShipNameHTML(ship.name)],
                    guns: [ship.guns.total, ship.guns.total],
                    battleRating: [ship.battleRating, formatInt(ship.battleRating)],
                    crew: [ship.crew.max, formatInt(ship.crew.max)],
                    maxSpeed: [ship.ship.maxSpeed, formatFloatFixedHTML(ship.ship.maxSpeed)],
                    turnSpeed: [ship.rudder.turnSpeed, formatFloatFixedHTML(ship.rudder.turnSpeed)],
                    broadside: [ship.guns.broadside.cannons, formatInt(ship.guns.broadside.cannons)],
                    bowChaser: [
                        ship.guns.gunsPerDeck[4].amount,
                        ship.guns.gunsPerDeck[4] ? String(ship.guns.gunsPerDeck[4].amount) : "",
                    ],
                    sternChaser: [
                        ship.guns.gunsPerDeck[5].amount,
                        ship.guns.gunsPerDeck[5] ? String(ship.guns.gunsPerDeck[5].amount) : "",
                    ],
                    sides: [ship.sides.armour, `${formatInt(ship.sides.armour)} (${ship.sides.thickness})`],
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

        this._mainDiv = d3Select(`#${this._modalId} .modal-body`).append("div").attr("id", `${this._baseId}`)
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

    _getHead(): HtmlResult {
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

                <tr data-sort-method="thead">
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

    _getBody(): HtmlResult {
        return html`
            <tbody>
                ${this._shipListData.map(
                    (ship) => html`<tr>
                        ${Object.entries(ship).map(
                            (item) =>
                                html`<td class="${item[0] === "name" ? "" : "text-right"}" data-sort="${item[1][0]}">
                                    ${item[1][1]}
                                </td>`
                        )}
                    </tr>`
                )}
            </tbody>
        `
    }

    _getList(): HtmlResult {
        return html`
            <table id="table-${this._baseId}" class="table table-sm small tablesort na-table">
                ${this._getHead()} ${this._getBody()}
            </table>
        `
    }

    /**
     * Show ships
     */
    _injectList(): void {
        // Add new ship list
        render(this._getList(), this._mainDiv.node() as HTMLDivElement)

        const table = document.querySelector(`#table-${this._baseId}`) as HTMLTableElement
        // @ts-expect-error
        void new Tablesort(table)
    }
}
