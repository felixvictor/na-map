/*!
 * This file is part of na-map.
 *
 * @file      List port bonus.
 * @module    game-tools/list-port-bonus
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { sum as d3Sum } from "d3-array"
import { select as d3Select, Selection } from "d3-selection"

import { registerEvent } from "../analytics"
import { capitalizeFirstLetter, findNationByNationShortName } from "common/common"
import { insertBaseModal, loadJsonFile } from "common/common-browser"

import { PortBasic, PortBattlePerServer, PortPerServer } from "common/gen-json"
import { HtmlString } from "common/interface"
import { PortBonus, portBonusType, PortBonusValue } from "common/types"

interface PortData {
    id: number
    name: string
    nation: string
    portBonusLevel: PortBonusValue[]
    points: number
    pointsInvested: number
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
        this.#portPerServer = await loadJsonFile<PortPerServer[]>(`${this.#serverId}-ports.json`)
        this.#pbPerServer = await loadJsonFile<PortBattlePerServer[]>(`${this.#serverId}-pb.json`)
        this.#portBasicData = (await import(/* webpackChunkName: "data-ports" */ "../../../lib/gen-generic/ports.json"))
            .default as PortBasic[]
    }

    _setupData(): void {
        const pointsNeeded = [0, 1, 3, 7, 15]
        const portBonusDefault = {} as PortBonus
        for (const type of portBonusType) {
            portBonusDefault[type] = 0
        }

        const portNames = new Map(
            this.#portBasicData.map((port) => [port.id, { name: port.name, points: port.portPoints }])
        )
        const portNation = new Map(this.#pbPerServer.map((port) => [port.id, port.nation]))
        this.#portData = this.#portPerServer
            .filter((port) => port.portBonus)
            .map(
                (port): PortData => ({
                    id: port.id,
                    name: portNames.get(port.id)?.name ?? "",
                    nation: findNationByNationShortName(portNation.get(port.id) ?? "")?.name ?? "",
                    portBonusLevel: Object.values({ ...portBonusDefault, ...port.portBonus }),
                    points: portNames.get(port.id)?.points ?? 0,
                    pointsInvested: d3Sum(Object.values(port.portBonus!).map((bonusLevel) => pointsNeeded[bonusLevel])),
                })
            )
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

            if (index === 7) {
                return (a.points - b.points) * sign
            }

            if (index === 8) {
                return (a.pointsInvested - b.pointsInvested) * sign
            }

            return (a.portBonusLevel[index - 2] - b.portBonusLevel[index - 2]) * sign
        })
    }

    _initTable(): void {
        this.#sortAscending = true
        this.#table
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(["Port", "Nation", ...portBonusType, "Port points", "Points invested"])
            .join("th")
            .datum((d, i) => ({ data: d, index: i }))
            .classed("text-right", (d, i) => i > 1)
            .attr("role", "columnheader")
            .style("width", (d, i) => (i > 2 ? "3rem" : ""))
            .text((d) => capitalizeFirstLetter(d.data))
            .on("click", (_event, d) => {
                this._sortRows(d.index)
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
            .data(
                (row): Array<number | string | PortBonusValue> => [
                    row.name,
                    row.nation,
                    ...row.portBonusLevel,
                    row.points,
                    row.pointsInvested,
                ]
            )
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
