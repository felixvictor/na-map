/*!
 * This file is part of na-map.
 *
 * @file      List port battles.
 * @module    game-tools/list-pb
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { select as d3Select, Selection } from "d3-selection"
import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"

import { registerEvent } from "../analytics"
import { capitalizeFirstLetter, findNationByNationShortName, putImportError } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { displayClan } from "../util"
import { PortBattlePerServer } from "../../common/gen-json"
import { HtmlString } from "../../common/interface"

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
    #tableId!: HtmlString
    #data!: RowSortData[]
    #serverId!: string
    readonly #baseName: string
    readonly #baseId: HtmlString
    readonly #buttonId: HtmlString
    readonly #modalId: HtmlString
    #rows = {} as Selection<HTMLTableRowElement, RowSortData, HTMLTableSectionElement, unknown>
    #sortAscending = true
    #sortIndex = 0
    #table = {} as Selection<HTMLTableElement, unknown, HTMLElement, unknown>

    constructor(serverId: string) {
        this.#serverId = serverId
        this.#baseName = "List of port battles"
        this.#baseId = "pb-list"
        this.#buttonId = `button-${this.#baseId}`
        this.#tableId = `table-${this.#baseId}`
        this.#modalId = `modal-${this.#baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        const dataDirectory = "data"

        try {
            const data = (await (
                await fetch(`${dataDirectory}/${this.#serverId}-pb.json`)
            ).json()) as PortBattlePerServer[]
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
        } catch (error: unknown) {
            putImportError(error as string)
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this.#baseName)

            this._pbListSelected()
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

            .enter()
            .append("th")
            .attr("role", "columnheader")
            .text((d) => d)
            .on("click", (d, i) => {
                this._sortRows(i)
            })
        this.#table.append("tbody")
    }

    _injectModal(): void {
        insertBaseModal({ id: this.#modalId, title: this.#baseName, size: "modal-lg" })

        const body = d3Select(`#${this.#modalId} .modal-body`)

        this.#table = body.append("table").attr("class", "table table-sm small na-table")
        this._initTable()
        this._updateTable()
        this._sortRows(0, false)
    }

    _initModal(): void {
        this._injectModal()
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
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this.#modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this.#modalId}`).modal("show")
    }
}
