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
import Tablesort from "tablesort"
import { h, render } from "preact"
import htm from "htm"
import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"

import { registerEvent } from "../analytics"
import { capitalizeFirstLetter, findNationByNationShortName, putImportError } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { displayClanLitHtml, initTablesort } from "../../common/common-game-tools"

import { PortBattlePerServer } from "../../common/gen-json"
import { HtmlResult, HtmlString } from "../../common/interface"

const html = htm.bind(h)
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

/**
 *
 */
export default class ListPortBattles {
    #div!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #tableId!: HtmlString
    #data!: PortBattlePerServer[]
    #serverId!: string
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString

    constructor(serverId: string) {
        this.#serverId = serverId
        this._baseName = "List of port battles"
        this._baseId = "pb-list"
        this._buttonId = `button-${this._baseId}`
        this.#tableId = `table-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        const dataDirectory = "data"

        try {
            const data = (await (
                await fetch(`${dataDirectory}/${this.#serverId}-pb.json`)
            ).json()) as PortBattlePerServer[]
            this.#data = data.filter((port) => port.attackHostility === 1)
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

            this._pbListSelected()
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "modal-xl" })

        const body = d3Select(`#${this._modalId} .modal-body`)
        this.#div = body.append("div").attr("id", this._baseId)
    }

    _initModal(): void {
        initTablesort()
        this._injectModal()
        this._injectList()
    }

    _pbListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    _getList(): HtmlResult {
        const getHead = () => {
            return html` <thead>
                <tr>
                    <th data-sort-default>Time</th>
                    <th>Port</th>
                    <th>Attacker</th>
                    <th>Defender</th>
                </tr>
            </thead>`
        }

        const getBody = (): HtmlResult => {
            return html`<tbody>
                ${this.#data.map((port) => {
                    const portBattleLT = dayjs.utc(port.portBattle).local()
                    const portBattleST = dayjs.utc(port.portBattle)
                    const localTime = portBattleST === portBattleLT ? "" : ` (${portBattleLT.format("H.mm")} local)`
                    return html`
                        <tr>
                            <td data-sort="${port.portBattle}">
                                ${capitalizeFirstLetter(portBattleST.fromNow())} at ${portBattleST.format("H.mm")}
                                ${localTime}
                            </td>
                            <td>${port.name}</td>
                            <td>${port.attackerNation} (${displayClanLitHtml(port.attackerClan)})</td>
                            <td>
                                ${findNationByNationShortName(port.nation)?.name} (${displayClanLitHtml(port.capturer)})
                            </td>
                        </tr>
                    `
                })}
            </tbody>`
        }

        return html`
            <table id="${this.#tableId}" class="table table-sm tablesort na-table">
                ${getHead()} ${getBody()}
            </table>
        `
    }

    /**
     * Show list
     */
    _injectList(): void {
        render(this._getList(), this.#div.node() as HTMLDivElement)

        const table = document.querySelector(`#${this.#tableId}`) as HTMLTableElement
        // @ts-expect-error
        void new Tablesort(table)
    }
}
