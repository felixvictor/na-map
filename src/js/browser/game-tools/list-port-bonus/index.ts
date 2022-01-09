/*!
 * This file is part of na-map.
 *
 * @file      List port bonus.
 * @module    game-tools/list-port-bonus
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { sum as d3Sum } from "d3-array"
import { registerEvent } from "../../analytics"
import { capitalizeFirstLetter, findNationByNationShortName } from "common/common"
import { getIdFromBaseName, loadJsonFile } from "common/common-browser"

import { Selection } from "d3-selection"
import { PortBasic, PortBattlePerServer, PortPerServer } from "common/gen-json"
import { HtmlString } from "common/interface"
import { ServerId } from "common/servers"
import { PortBonus, portBonusType, PortBonusValue } from "common/types"

import Modal from "util/modal"

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
    readonly #baseId: HtmlString
    readonly #baseName = "List of port bonuses"
    readonly #menuId: HtmlString
    #modal: Modal | undefined = undefined

    readonly #serverId: ServerId
    #portPerServer = [] as PortPerServer[]
    #portBasicData = [] as PortBasic[]
    #pbPerServer = [] as PortBattlePerServer[]
    #portData = [] as PortData[]
    #rows = {} as Selection<HTMLTableRowElement, PortData, HTMLTableSectionElement, unknown>
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
        this.#portPerServer = await loadJsonFile<PortPerServer[]>(`${this.#serverId}-ports.json`)
        this.#pbPerServer = await loadJsonFile<PortBattlePerServer[]>(`${this.#serverId}-pb.json`)
        this.#portBasicData = (
            await import(/* webpackChunkName: "data-ports" */ "../../../../../lib/gen-generic/ports.json")
        ).default as PortBasic[]
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
                    nation: portNation.get(port.id) ?? "",
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
            if (index === 0) {
                return a.name.localeCompare(b.name) * sign
            }

            if (index === 1) {
                const aa = findNationByNationShortName(a.nation)?.sortName ?? ""
                const bb = findNationByNationShortName(b.nation)?.sortName ?? ""

                return aa.localeCompare(bb) * sign
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
            .classed("text-start", (d, i) => i <= 1)
            .attr("scope", "col")
            .style("width", (d, i) => (i >= 2 ? "4rem" : ""))
            .text((d) => capitalizeFirstLetter(d.data))
            .on("click", (_event, d) => {
                this._sortRows(d.index)
            })
        this.#table.append("tbody")
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
                    .classed("text-start", (d, i) => i <= 1)
                    .html((d, i) =>
                        d === 0
                            ? ""
                            : i === 1
                            ? `<span class="flag-icon-${String(d)} flag-icon-small" role="img" title="${
                                  findNationByNationShortName(String(d))?.sortName ?? ""
                              }"></span>`
                            : String(d)
                    )
            )
    }

    _listSelected(): void {
        this.#table = this.#modal!.outputSel.append("table").attr(
            "class",
            "table table-sm small table-striped table-hover table-sort"
        )

        this._initTable()
        this._updateTable()
        this._sortRows(0, false)
    }
}
