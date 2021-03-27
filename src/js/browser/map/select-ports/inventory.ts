/*!
 * This file is part of na-map.
 *
 * @file      Select ports inventory select.
 * @module    map/select-ports/inventory
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { sortBy } from "common/common-node"
import { HtmlString } from "common/interface"
import { formatInt, formatSiCurrency } from "common/common-format"
import { NationShortName } from "common/common"
import { InventoryEntity } from "common/gen-json"

import SelectPortsSelect from "./select"
import DisplayPorts from "../display-ports"
import { NAMap } from "../na-map"

type goodMap = Map<string, { name: string; nation: NationShortName; good: InventoryEntity }>

export default class SelectPortsSelectInventory extends SelectPortsSelect {
    #isInventorySelected = false
    #map: NAMap
    #ports: DisplayPorts

    constructor(ports: DisplayPorts, map: NAMap) {
        super("Show good availability")

        this.#ports = ports
        this.#map = map

        this._setupListener()
    }

    _setupListener(): void {
        this.selectSel.addEventListener("change", async (event) => {
            registerEvent("Menu", this.baseName)

            this._resetOtherSelects()
            this._selectSelected()
            // event.preventDefault()
        })
    }

    _getPortList(goodIdSelected: number, buyGoods: goodMap, sellGoods: goodMap): HtmlString {
        let h: HtmlString = ""

        console.log(goodIdSelected)

        h += `<h5>${this.#ports.tradeItem.get(goodIdSelected)?.name ?? ""}</h5>`
        if (buyGoods.size) {
            h += "<h6>Buy</h6>"
            for (const [, value] of buyGoods) {
                h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                    value.good.buyQuantity
                )} @ ${formatSiCurrency(value.good.buyPrice)}<br>`
            }
        }

        if (buyGoods && sellGoods) {
            h += "<p></p>"
        }

        if (sellGoods.size) {
            h += "<h6>Sell</h6>"
            for (const [, value] of sellGoods) {
                h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                    value.good.sellQuantity
                )} @ ${formatSiCurrency(value.good.sellPrice)}<br>`
            }
        }

        return h
    }

    _selectSelected(): void {
        const goodIdSelected = Number(this.selectSel.options[this.selectSel.selectedIndex].value)
        const buyGoods = new Map() as goodMap
        const sellGoods = new Map() as goodMap

        this.#isInventorySelected = true

        const portsFiltered = this.#ports.portDataDefault
            .filter((port) => port.inventory.some((good) => good.id === goodIdSelected))
            .sort(sortBy(["name"]))
            .map((port) => {
                const item = port.inventory.find((good) => good.id === goodIdSelected)
                if (item) {
                    port.sellInTradePort = item.buyQuantity > 0
                    if (port.sellInTradePort) {
                        buyGoods.set(port.name, { name: port.name, nation: port.nation, good: item })
                    }

                    port.buyInTradePort = item.sellQuantity > 0
                    if (port.buyInTradePort) {
                        sellGoods.set(port.name, { name: port.name, nation: port.nation, good: item })
                    }
                }

                return port
            })

        this.#ports.setShowRadiusSetting("off")
        this.#ports.portData = portsFiltered
        this.#ports.showRadius = "tradePorts"
        if (this.#map.showTrades.listType !== "portList") {
            this.#map.showTrades.listType = "portList"
        }

        this.#map.showTrades.update(this._getPortList(goodIdSelected, buyGoods, sellGoods))
        this.#ports.update()
    }

    injectSelect(show: boolean): void {
        if (!this.selectSel.classList.contains("selectpicker")) {
            const selectGoods = new Map<number, string>()

            for (const port of this.#ports.portDataDefault) {
                if (port.inventory) {
                    for (const good of port.inventory) {
                        selectGoods.set(good.id, this.#ports.tradeItem.get(good.id)?.name ?? "")
                    }
                }
            }

            const options = `${[...selectGoods]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map((good) => `<option value="${good[0]}">${good[1]}</option>`)
                .join("")}`

            this.selectSel.insertAdjacentHTML("beforeend", options)
            this.selectSel.classList.add("selectpicker")
            this.select$.selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Show good availability",
                virtualScroll: true,
            })
        }

        if (show) {
            this.selectSel.classList.remove("d-none")
            ;(this.selectSel.parentNode as HTMLSelectElement).classList.remove("d-none")
        } else {
            this.selectSel.classList.add("d-none")
            ;(this.selectSel.parentNode as HTMLSelectElement).classList.add("d-none")
        }
    }

    get isInventorySelected(): boolean {
        return this.#isInventorySelected
    }
}
