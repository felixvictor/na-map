/*!
 * This file is part of na-map.
 *
 * @file      Select ports select goods.
 * @module    map/select-ports/goods
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { GoodList, PortPerServer, PortWithTrades } from "common/gen-json"
import DisplayPorts from "../display-ports"
import { HtmlString } from "common/interface"
import Select from "util/select"
import { getIdFromBaseName } from "common/common-browser"

export default class SelectPortsSelectGoods {
    #baseName = "Show goods’ relations"
    #baseId: HtmlString
    #ports: DisplayPorts
    #select = {} as Select

    constructor(ports: DisplayPorts) {
        this.#ports = ports

        this.#baseId = `port-select-${getIdFromBaseName(this.#baseName)}`

        this._setupSelect()
        this._setupListener()
    }

    _getOptions(): HtmlString {
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

        return `${sortedGoods.map((good) => `<option value="${good[0]}">${good[1]}</option>`).join("")}`
    }

    _setupSelect(): void {
        this.#select = new Select(this.#baseId, undefined, {}, "")
    }

    _setupListener(): void {
        this.#select.select$.one("show.bs.select", () => {
            this.#select.setOptions(this._getOptions())
            this.#select.reset()
        })
        this.#select.select$.on("change", () => {
            registerEvent("Menu", this.#baseName)

            this._selectSelected()
        })
    }

    _selectSelected(): void {
        const goodSelectedId = Number(this.#select.getValues())

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
