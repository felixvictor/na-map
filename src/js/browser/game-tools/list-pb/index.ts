/*!
 * This file is part of na-map.
 *
 * @file      List port battles.
 * @module    game-tools/list-pb
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Selection } from "d3-selection"
import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"

import { registerEvent } from "../../analytics"
import { capitalizeFirstLetter, findNationByNationShortName } from "common/common"
import { getIdFromBaseName, insertBaseModal, loadJsonFile } from "common/common-browser"
import { displayClan } from "../../util"
import { PortBattlePerServer } from "common/gen-json"
import { HtmlString } from "common/interface"
import Modal from "util/modal"

dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

type RowData = string[]
interface RowSortData {
    sort: string
    data: RowData
}

/**
 *
 */
export default class ListPortBattles {
    #data = [] as RowSortData[]
    #modal: Modal | undefined = undefined
    #rows = {} as Selection<HTMLTableRowElement, RowSortData, HTMLTableSectionElement, unknown>
    #sortAscending = true
    #sortIndex = 0
    #table = {} as Selection<HTMLTableElement, unknown, HTMLElement, unknown>
    #tableId!: HtmlString
    readonly #baseId: HtmlString
    readonly #baseName = "List of port battles"
    readonly #menuId: HtmlString
    readonly #serverId!: string

    constructor(serverId: string) {
        this.#serverId = serverId

        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`
        this.#tableId = `${this.#baseId}-table`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        const data = await loadJsonFile<PortBattlePerServer[]>(`${this.#serverId}-pb.json`)
        this.#data = data
            .filter((port) => port.attackHostility === 1)
            .map((port) => {
                const portBattleLT = dayjs.utc(port.portBattle).local()
                const portBattleST = dayjs.utc(port.portBattle)
                const localTime = portBattleST === portBattleLT ? "" : ` (${portBattleLT.format("H.mm")} local)`
                const defenderNation = findNationByNationShortName(port.nation)?.name
                const defender = port.capturer
                    ? `${defenderNation ?? ""} (${displayClan(port.capturer)})`
                    : defenderNation ?? ""

                return {
                    sort: port.portBattle ?? "",
                    data: [
                        `${capitalizeFirstLetter(portBattleST.fromNow())} at ${portBattleST.format(
                            "H.mm"
                        )} ${localTime}`,
                        port.name,
                        `${port?.attackerNation ?? ""} (${displayClan(port?.attackerClan ?? "")})`,
                        defender,
                    ],
                }
            })
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "lg")
            this._pbListSelected()
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
            if (index === 0) {
                return a.sort.localeCompare(b.sort) * sign
            }

            return a.data[index].localeCompare(b.data[index]) * sign
        })
    }

    _initTable(): void {
        this.#table
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(["Time", "Port", "Attacker", "Defender"])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .attr("role", "columnheader")
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
            .selectAll<HTMLTableRowElement, RowSortData>("tr")
            .data(this.#data, (d: RowSortData): string => d.sort)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this.#rows
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row) => row.data)
            .join((enter) => enter.append("td").html((d) => d))
    }

    _pbListSelected(): void {
        this.#table = this.#modal!.outputSel.append("table").attr("class", "table table-sm small na-table text-table")
        this._initTable()
        this._updateTable()
        this._sortRows(0, false)
    }
}
