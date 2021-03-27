/*!
 * This file is part of na-map.
 *
 * @file      Select ports select goods.
 * @module    map/select-ports/goods
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import SelectPortsSelect from "./select"
import { registerEvent } from "../../analytics"
import { GoodList, PortPerServer, PortWithTrades } from "common/gen-json"
import DisplayPorts from "js/browser/map/display-ports"

export default class SelectPortsSelectGoods extends SelectPortsSelect {
    #ports: DisplayPorts

    constructor(ports: DisplayPorts) {
        super("Show goods’ relations")

        this.#ports = ports

        this._setupListener()
        $(this.selectSel).selectpicker()
    }

    _setupListener(): void {
        $(this.selectSel).one("show.bs.select", () => {
            this._injectSelect()
        })
        this.selectSel.addEventListener("change", async (event) => {
            registerEvent("Menu", this.baseName)

            this._resetOtherSelects()
            this._selectSelected()
            // event.preventDefault()
        })
    }

    _injectSelect(): void {
        const selectGoods = new Map<number, string>()
        const types = ["consumesTrading", "dropsTrading", "dropsNonTrading", "producesNonTrading"] as Array<
            keyof PortPerServer
        >

        for (const port of this.#ports.portDataDefault) {
            for (const type of types) {
                const goodList = port[type] as GoodList
                if (goodList) {
                    for (const good of goodList) {
                        selectGoods.set(good, this.#ports.tradeItem.get(good)?.name ?? "")
                    }
                }
            }
        }

        const sortedGoods = [...selectGoods].sort((a, b) => a[1].localeCompare(b[1]))
        const options = `${sortedGoods.map((good) => `<option value="${good[0]}">${good[1]}</option>`).join("")}`
        this.selectSel.insertAdjacentHTML("beforeend", options)
        $(this.selectSel).selectpicker("refresh")
    }

    _selectSelected(): void {
        const goodSelectedId = Number(this.selectSel.options[this.selectSel.selectedIndex].value)

        const sourcePorts = (JSON.parse(
            JSON.stringify(
                this.#ports.portDataDefault.filter(
                    (port) =>
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        port.dropsTrading?.includes(goodSelectedId) ||
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        port.dropsNonTrading?.includes(goodSelectedId) ||
                        port.producesNonTrading?.includes(goodSelectedId)
                )
            )
        ) as PortWithTrades[]).map((port) => {
            port.isSource = true
            return port
        })
        const consumingPorts = (JSON.parse(
            JSON.stringify(this.#ports.portDataDefault.filter((port) => port.consumesTrading?.includes(goodSelectedId)))
        ) as PortWithTrades[]).map((port) => {
            port.isSource = false
            return port
        })

        this.#ports.setShowRadiusSetting("off")
        this.#ports.portData = [...sourcePorts, ...consumingPorts]
        this.#ports.showRadius = "currentGood"
        this.#ports.update()
    }
}
