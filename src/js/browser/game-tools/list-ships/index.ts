/*!
 * This file is part of na-map.
 *
 * @file      ship list.
 * @module    ship-list
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { sortBy } from "common/common"
import { getIdFromBaseName } from "common/common-browser"
import { formatFloatFixed, formatInt } from "common/common-format"
import { beautifyShipName } from "common/common-game-tools"

import { Selection } from "d3-selection"
import { ShipData } from "common/gen-json"
import { HeaderMap, HtmlString } from "common/interface"
import Modal from "util/modal"

type ShipListData = Array<[number | string, string]>

/**
 *
 */
export default class ShipList {
    #modal: Modal | undefined = undefined
    #rows = {} as Selection<HTMLTableRowElement, ShipListData, HTMLTableSectionElement, unknown>
    #shipListData = [] as ShipListData[]
    #sortAscending = true
    #sortIndex = 0
    #table = {} as Selection<HTMLTableElement, unknown, HTMLElement, unknown>
    readonly #baseId: HtmlString
    readonly #baseName = "List ships"
    readonly #menuId: HtmlString

    constructor() {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        const shipData = (
            await import(/* webpackChunkName: "data-ships" */ "../../../../../lib/gen-generic/ships.json")
        ).default.sort(
            // @ts-expect-error
            sortBy(["class", "-battleRating", "name"])
        ) as ShipData[]

        this.#shipListData = shipData.map(
            (ship: ShipData): ShipListData => [
                [ship.class, String(ship.class)],
                [ship.name, beautifyShipName(ship.name)],
                [ship.guns.total, String(ship.guns.total)],
                [ship.battleRating, formatInt(ship.battleRating)],
                [ship.crew.max, formatInt(ship.crew.max)],
                [ship.ship.maxSpeed, formatFloatFixed(ship.ship.maxSpeed)],
                [ship.ship.turnSpeed, formatFloatFixed(ship.ship.turnSpeed)],
                [ship.guns.broadside.cannons, formatInt(ship.guns.broadside.cannons)],
                [
                    ship.guns.gunsPerDeck[4].amount,
                    ship.guns.gunsPerDeck[4].amount ? String(ship.guns.gunsPerDeck[4].amount) : "",
                ],
                [
                    ship.guns.gunsPerDeck[5].amount,
                    ship.guns.gunsPerDeck[5].amount ? String(ship.guns.gunsPerDeck[5].amount) : "",
                ],
                [ship.sides.armour, `${formatInt(ship.sides.armour)} (${ship.sides.thickness})`],
            ]
        )

        console.log(shipData, this.#shipListData)
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "lg")
            this._shipListSelected()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _sortRows(index: number, changeOrder = true): void {
        if (changeOrder && this.#sortIndex === index) {
            this.#sortAscending = !this.#sortAscending
        }

        this.#sortIndex = index
        const sign = this.#sortAscending ? 1 : -1
        this.#rows.sort((a, b): number => {
            if (index === 1) {
                return (a[index][0] as string).localeCompare(b[index][0] as string) * sign
            }

            return ((a[index][0] as number) - (b[index][0] as number)) * sign
        })
    }

    _initTable(): void {
        const header: HeaderMap = {
            group: new Map([
                ["dummy1", 5],
                ["Speed", 2],
                ["dummy2", 1],
                ["Chasers", 2],
                ["dummy3", 1],
            ]),
            element: new Set([
                "Class",
                "Name",
                "Guns",
                "Battle rating",
                "Crew",
                "Maximum",
                "Turn",
                "Broadside",
                "Bow",
                "Stern",
                "Sides",
            ]),
        }

        const head = this.#table.append("thead")
        head.append("tr")
            .attr("class", "thead-group")
            .selectAll("th")
            .data([...header.group])
            .join("th")
            .classed("border-bottom-0", (d) => d[0].startsWith("dummy"))
            .classed("text-center", true)
            .attr("colspan", (d) => d[1])
            .attr("scope", "col")
            .text((d) => (d[0].startsWith("dummy") ? "" : d[0]))
        head.append("tr")
            .selectAll("th")
            .data([...header.element])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .classed("border-top-0", true)
            .classed("text-end", (d, i) => i !== 1)
            .text((d) => d.data)
            .on("click", (_event, d) => {
                this._sortRows(d.index)
            })

        this.#table.append("tbody")
    }

    _updateTable(): void {
        // Data join rows
        this.#rows = this.#table
            .select<HTMLTableSectionElement>("tbody")
            .selectAll<HTMLTableRowElement, ShipListData>("tr")
            .data(this.#shipListData, (d: ShipListData): string => d[1][0] as string)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this.#rows
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row) => row)
            .join((enter) =>
                enter
                    .append("td")
                    .classed("text-end", (d, i) => i !== 1)
                    .html((d) => d[1])
            )
    }

    _shipListSelected(): void {
        this.#table = this.#modal!.outputSel.append("table").attr("class", "table table-sm small na-table")

        this._initTable()
        this._updateTable()
        this._sortRows(0, false)
    }
}
