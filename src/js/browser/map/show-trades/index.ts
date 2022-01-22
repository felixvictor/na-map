/*
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { ZoomTransform } from "d3-zoom"

import { Extent } from "common/common-math"
import { hideElem, showElem } from "./common"

import Cookie from "util/cookie"
import Checkbox from "util/checkbox"
import DisplayPorts from "../display-ports"
import SelectPortsSelectInventory from "../select-ports/inventory"

import Graphs from "./graphs"
import List from "./list"
import TradeData from "./trade-data"

/**
 * Show trades
 */
export default class ShowTrades {
    #graphs: Graphs
    #inventorySelect = {} as SelectPortsSelectInventory
    #isDataLoaded = false
    #ports: DisplayPorts
    #scale = 1
    #tradeData: TradeData
    list: List
    readonly #showCookie: Cookie
    readonly #showCheckboxId = "show-trades"
    readonly #showCheckboxValues = [String(false), String(true)] // Possible values for show trade checkboxes (first is default value)
    readonly #showCheckbox: Checkbox
    show: boolean

    constructor(ports: DisplayPorts, serverName: string) {
        this.#ports = ports

        this.#showCookie = new Cookie({ id: this.#showCheckboxId, values: this.#showCheckboxValues })
        this.#showCheckbox = new Checkbox(this.#showCheckboxId)

        this.show = this.#getShowValue()

        this.list = new List()
        this.#graphs = new Graphs()
        this.#tradeData = new TradeData(serverName)

        this.#setupListener()

        this.#inventorySelect = new SelectPortsSelectInventory(ports, this.list)
    }

    #setupListener(): void {
        document.querySelector(`#${this.#showCheckboxId}`)?.addEventListener("click", async () => {
            this.#showSelected()
        })
        document.querySelector(`#${this.#tradeData.profitId}`)?.addEventListener("change", () => {
            this.#profitValueSelected()
        })
        this.#tradeData.selectNation$.on("change", () => {
            this.#nationChanged()
        })
    }

    async #setupData(): Promise<void> {
        await this.#tradeData.loadAndSetupData()

        this.list.tradeData = this.#tradeData
        this.#graphs.tradeData = this.#tradeData
    }

    async showOrHide(): Promise<void> {
        if (this.show) {
            if (!this.#isDataLoaded) {
                await this.#setupData()
                this.#isDataLoaded = true
            }

            showElem(this.list.tradeDetailsDiv)
        } else {
            hideElem(this.list.tradeDetailsDiv)
        }
    }

    async #showSelected(): Promise<void> {
        this.show = this.#showCheckbox.get()

        this.#showCookie.set(String(this.show))

        await this.showOrHide()
        this.#inventorySelect.show(this.show)
        this.#tradeData.show()

        this.update()
    }

    #profitValueSelected(): void {
        this.#tradeData.profitValueSelected()
        this.update()
    }

    #nationChanged(): void {
        this.#tradeData.changeFilter()
        this.update()
    }

    /**
     * Get show value from cookie or use default value
     */
    #getShowValue(): boolean {
        const r = Boolean(this.#showCookie.get())

        this.#showCheckbox.set(r)

        return r
    }

    update(info?: string): void {
        if (this.show) {
            this.#tradeData.filterTradesByVisiblePorts()
            this.list.update(this.#inventorySelect.isInventorySelected, info)
        } else {
            this.#tradeData.emptyLinkDataFiltered()
        }

        this.#graphs.update(this.#scale)
    }

    transform(transform: ZoomTransform): void {
        this.#scale = transform.k

        this.update()
    }

    clearMap(): void {
        this.list.listType = "tradeList"

        this.update()
    }

    /**
     * Set bounds of current viewport
     */
    setBounds(viewport?: Extent): void {
        this.#tradeData.setBounds(viewport)
    }
}
