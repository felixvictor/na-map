/*!
 * This file is part of na-map.
 *
 * @file      List flags.
 * @module    game-tools/list-flags
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"

dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

import { registerEvent } from "../../analytics"
import { getIdFromBaseName, loadJsonFile } from "common/common-browser"

import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { ServerId } from "common/servers"
import { FlagsPerNation } from "common/types"

import Modal from "util/modal"

type tableRow = [string, string, number]

export default class ListFlags {
    readonly #baseId: HtmlString
    readonly #baseName = "List conquest flags"
    readonly #menuId: HtmlString
    readonly #serverId: ServerId
    #flagData = [] as FlagsPerNation[]
    #data = [] as tableRow[]
    #modal: Modal | undefined = undefined
    #rows = {} as Selection<HTMLTableRowElement, tableRow, HTMLTableSectionElement, unknown>
    #sortAscending = true
    #sortIndex = 0
    #table = {} as Selection<HTMLTableElement, unknown, HTMLElement, unknown>

    constructor(serverId: ServerId) {
        this.#serverId = serverId

        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        if (serverId === "eu1") {
            this._setupListener()
        } else {
            this._removeMenu()
        }
    }

    _removeMenu(): void {
        const menuSel = document.querySelector(`#${this.#menuId}`) as HTMLDivElement

        menuSel.remove()
    }

    async _loadData(): Promise<void> {
        this.#flagData = await loadJsonFile<FlagsPerNation[]>(`${this.#serverId}-flags.json`)
    }

    _setupData(): void {
        for (const flagsPerNation of this.#flagData) {
            for (const flag of flagsPerNation.flags) {
                this.#data.push([flagsPerNation.nation, flag.expire, flag.number])
            }
        }
    }

    async _loadAndSetupData(): Promise<void> {
        await this._loadData()
        this._setupData()
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "lg")
            this._listSelected()
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
            if (index === 2) {
                return (a[index] - b[index]) * sign
            }

            return (a[index] as string).localeCompare(b[index] as string) * sign
        })
    }

    _initTable(): void {
        this.#sortAscending = true
        this.#table
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(["Nation", "Expires in", "Number of flags"])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .classed("text-start", (d, i) => i <= 1)
            .attr("scope", "col")
            .text((d) => d.data)
            .on("click", (_event, d) => {
                this._sortRows(d.index)
            })
        this.#table.append("tbody")
    }

    _getTime(time: string): string {
        const timeLT = dayjs.utc(time).local()
        const timeST = dayjs.utc(time)
        const localTime = timeST === timeLT ? "" : ` (${timeLT.format("H.mm")} local)`

        return `${timeST.fromNow().replace("in", "")} on ${timeST.format("dddd, D MMM, H.mm")} ${localTime}`
    }

    _updateTable(): void {
        // Data join rows
        this.#rows = this.#table
            .select<HTMLTableSectionElement>("tbody")
            .selectAll<HTMLTableRowElement, tableRow>("tr")
            .data(this.#data)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this.#rows
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row): tableRow => [row[0], this._getTime(row[1]), row[2]])
            .join((enter) =>
                enter
                    .append("td")
                    .classed("text-start", (d, i) => i <= 1)
                    .text((d) => d)
            )
    }

    _listSelected(): void {
        this.#table = this.#modal!.outputSel.append("table").attr(
            "class",
            "table table-sm table-striped table-hover table-sort text-table"
        )

        this._initTable()
        this._updateTable()
        this._sortRows(1, false)
    }
}
