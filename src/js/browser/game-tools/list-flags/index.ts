/*!
 * This file is part of na-map.
 *
 * @file      List conquest flags.
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
import { nations } from "common/common"
import { getIdFromBaseName, loadJsonFile } from "common/common-browser"

import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { ServerId } from "common/servers"
import { FlagsPerNation } from "common/types"

import Modal from "util/modal"
import RadioButton from "util/radio-button"
import Cookie from "util/cookie"

type TableRow = [string, number, string, string, string, number]
type TableRowDisplay = [string, string, string, number]

export default class ListFlags {
    readonly #baseId: HtmlString
    readonly #baseName = "List of conquest flags"
    readonly #inputId: HtmlString
    readonly #menuId: HtmlString
    readonly #serverId: ServerId
    #activeNationIds = [] as string[]
    #cookie = {} as Cookie
    #data = [] as TableRow[]
    #dataDefault = [] as TableRow[]
    #flagData = [] as FlagsPerNation[]
    #modal: Modal | undefined = undefined
    #rows = {} as Selection<HTMLTableRowElement, TableRow, HTMLTableSectionElement, unknown>
    #sortAscending = true
    #dataIndexSorted = 0
    #table = {} as Selection<HTMLTableElement, unknown, HTMLElement, unknown>
    #toggleButtons = {} as RadioButton

    constructor(serverId: ServerId) {
        this.#serverId = serverId

        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`
        this.#inputId = `${this.#baseId}-input`

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
                this.#dataDefault.push([
                    flag.expire,
                    flagsPerNation.nation,
                    this._fromNow(flag.expire),
                    this._getDate(flag.expire),
                    this._getTime(flag.expire),
                    flag.number,
                ])
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

    _sortRows(columnIndex: number, changeOrder = true): void {
        let dataIndex = 0

        if (columnIndex === 3) {
            dataIndex = 5
        }

        if (changeOrder && this.#dataIndexSorted === dataIndex) {
            this.#sortAscending = !this.#sortAscending
        }

        this.#dataIndexSorted = dataIndex
        const sign = this.#sortAscending ? 1 : -1
        this.#rows.sort((a, b): number => {
            console.log("sort", columnIndex, dataIndex, a[dataIndex], b[dataIndex])
            // Sort by number of flags
            if (columnIndex === 3) {
                return ((a[dataIndex] as number) - (b[dataIndex] as number)) * sign
            }

            // Sort by date
            return (a[dataIndex] as string).localeCompare(b[dataIndex] as string) * sign
        })
    }

    _initTable(): void {
        const columnHeads = ["Expires in", "Date", "Time", "Flags"]

        this.#sortAscending = true
        this.#table
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(columnHeads)
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

    _fromNow(time: string): string {
        const timeST = dayjs.utc(time)

        return `${timeST.fromNow().replace("in ", "").replace("a ", "1 ")}`
    }

    _getDate(time: string): string {
        const timeST = dayjs.utc(time)

        return `${timeST.format("dddd, D MMM")}`
    }

    _getTime(time: string): string {
        const timeLT = dayjs.utc(time).local()
        const timeST = dayjs.utc(time)
        const localTime = timeST === timeLT ? "" : ` (${timeLT.format("H.mm")} local)`

        return `${timeST.format("H.mm")} ${localTime}`
    }

    _updateTable(): void {
        // Data join rows
        this.#rows = this.#table
            .select<HTMLTableSectionElement>("tbody")
            .selectAll<HTMLTableRowElement, TableRow>("tr")
            .data(this.#data, (d) => d[0])
            .join((enter) => enter.append("tr"))

        // Data join cells
        this.#rows
            .selectAll<HTMLTableCellElement, number | string>("td")
            .data((row): TableRowDisplay => row.slice(2) as TableRowDisplay)
            .join((enter) =>
                enter
                    .append("td")
                    .classed("text-start", (d, i) => i <= 1)
                    .text((d) => d)
            )
    }

    _getActiveNation(): number {
        return Number(this.#toggleButtons.get())
    }

    _injectToggleButtons(): void {
        const activeNations = nations
            .filter((nation) => !(nation.short === "NT" || nation.short === "FT"))
            .sort((a, b) => a.sortName.localeCompare(b.sortName))
        this.#activeNationIds = activeNations.map((nation) => String(nation.id))

        const div = this.#modal!.selectsSel.append("div")
            .attr("id", this.#inputId)
            .attr("class", "d-flex flex-wrap justify-content-between mb-3")

        for (const nation of activeNations) {
            div.append("input")
                .attr("type", "radio")
                .attr("class", "btn-check")
                .attr("name", this.#inputId)
                .attr("id", `${this.#inputId}-${nation.id}`)
                .attr("value", nation.id)
                .attr("autocomplete", "off")

            div.append("label")
                .attr("for", `${this.#inputId}-${nation.id}`)
                .attr("class", "btn btn-toggle")
                .attr("title", nation.name)
                .append("i")
                .attr("class", `flag-icon-${nation.short} flag-icon-button`)
                .attr("role", "img")
        }
    }

    _showSelected(): void {
        const activeNation = this._getActiveNation()

        this.#data = this.#dataDefault.filter((data) => data[1] === activeNation)
        this.#cookie.set(String(activeNation))

        this._updateTable()
        this._sortRows(0, false)
    }

    _setupButtonListener(): void {
        document.querySelector(`#${this.#inputId}`)?.addEventListener("change", async () => {
            this._showSelected()
        })
    }

    _listSelected(): void {
        this.#table = this.#modal!.outputSel.append("table").attr(
            "class",
            "table table-sm table-striped table-hover table-sort text-table mt-3"
        )

        this._initTable()
        this._injectToggleButtons()
        this.#toggleButtons = new RadioButton(this.#inputId, this.#activeNationIds)
        this.#cookie = new Cookie({ id: this.#inputId, values: this.#activeNationIds })
        this.#toggleButtons.set(this.#cookie.get())
        this._setupButtonListener()
        this._showSelected()
    }
}
