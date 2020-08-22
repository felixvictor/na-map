/*!
 * This file is part of na-map.
 *
 * @file      List port bonus.
 * @module    game-tools/list-port-bonus
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { select as d3Select, Selection } from "d3-selection"

import { registerEvent } from "../analytics"
import { capitalizeFirstLetter, findNationByNationShortName, putImportError } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"

import { PortBasic, PortBattlePerServer, PortPerServer } from "../../common/gen-json"
import { HtmlString } from "../../common/interface"
import { PortBonus, portBonusType, PortBonusValue } from "../../common/types"

interface PortData {
    id: number
    name: string
    nation: string
    portBonusLevel: PortBonusValue[]
}

/**
 *
 */
export default class ListPortBonus {
    #baseId: HtmlString
    #baseName: string
    #buttonId: HtmlString
    #modalId: HtmlString
    #serverId: string
    #portPerServer = {} as PortPerServer[]
    #portBasicData = {} as PortBasic[]
    #pbPerServer = {} as PortBattlePerServer[]
    #portData = {} as PortData[]
    #rows = {} as Selection<HTMLTableRowElement, PortData, HTMLTableSectionElement, unknown>
    #sortAscending = true
    #sortIndex = 0
    #table = {} as Selection<HTMLTableElement, unknown, HTMLElement, unknown>

    constructor(serverId: string) {
        this.#serverId = serverId
        this.#baseName = "List port bonuses"
        this.#baseId = "port-bonus-list"
        this.#buttonId = `button-${this.#baseId}`
        this.#modalId = `modal-${this.#baseId}`

        this._setupListener()
    }

    async _loadData(): Promise<void> {
        const dataDirectory = "data"

        try {
            this.#portPerServer = (await (
                await fetch(`${dataDirectory}/${this.#serverId}-ports.json`)
            ).json()) as PortPerServer[]
            this.#pbPerServer = (await (
                await fetch(`${dataDirectory}/${this.#serverId}-pb.json`)
            ).json()) as PortBattlePerServer[]
            this.#portBasicData = (await import(/* webpackChunkName: "data-ports" */ "Lib/gen-generic/ports.json"))
                .default as PortBasic[]
        } catch (error) {
            putImportError(error)
        }
    }

    _setupData(): void {
        const portBonusDefault = {} as PortBonus
        for (const type of portBonusType) {
            portBonusDefault[type] = 0
        }

        const portNames = new Map(this.#portBasicData.map((port) => [port.id, port.name]))
        const portNation = new Map(this.#pbPerServer.map((port) => [port.id, port.nation]))
        this.#portData = this.#portPerServer
            .filter((port) => port.portBonus)
            .map(
                (port): PortData => ({
                    id: port.id,
                    name: portNames.get(port.id) ?? "",
                    nation: findNationByNationShortName(portNation.get(port.id) ?? "")?.name ?? "",
                    portBonusLevel: Object.values({ ...portBonusDefault, ...port.portBonus }),
                })
            )

        console.log(this.#portData)
    }

    async _loadAndSetupData(): Promise<void> {
        await this._loadData()
        this._setupData()
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this.#baseName)

            this._listSelected()
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
                return a.name.localeCompare(b.name) * sign
            }

            if (index === 1) {
                return a.nation.localeCompare(b.nation) * sign
            }

            return (a.portBonusLevel[index - 2] - b.portBonusLevel[index - 2]) * sign
        })
        console.log(index, this.#sortAscending)
    }

    _initTable(): void {
        this.#sortAscending = true
        this.#table
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(["Port", "Nation", ...portBonusType])

            .enter()
            .append("th")
            .classed("text-right", (d, i) => i > 1)
            .attr("role", "columnheader")
            .text((d) => capitalizeFirstLetter(d))
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
            .selectAll<HTMLTableRowElement, PortData>("tr")
            .data(this.#portData, (d: PortData): number => d.id)
            .join((enter) => enter.append("tr"))

        // Data join cells
        this.#rows
            .selectAll<HTMLTableCellElement, string>("td")
            .data((row): Array<string | PortBonusValue> => [row.name, row.nation, ...row.portBonusLevel])
            .join((enter) =>
                enter
                    .append("td")
                    .classed("text-right", (d, i) => i > 1)
                    .text((d) => (d === 0 ? "" : String(d)))
            )
    }

    _listSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this.#modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this.#modalId}`).modal("show")
    }
}
