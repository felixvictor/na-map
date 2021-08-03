/*!
 * This file is part of na-map.
 *
 * @file      Select port battle time window.
 * @module    map/select-ports/pb-time
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { getPortBattleTime } from "common/common-browser"
import { HtmlString } from "common/interface"
import DisplayPorts from "../display-ports"
import Select from "util/select"

export default class SelectPBTimeWindow {
    #select = {} as Select
    #ports: DisplayPorts
    readonly #baseId = "port-select-pb-time"

    constructor(ports: DisplayPorts) {
        this.#ports = ports

        this._setupSelect()
        this._setupListener()
    }

    _getOptions(): HtmlString {
        const data = new Set<number>(
            this.#ports.portData
                .filter((port) => port.capturable)
                .map((port): number => port.portBattleStartTime)
                .sort((a, b) => a - b)
        )

        return `${[...data]
            .map((time): string => `<option value="${time}">${getPortBattleTime(time)}</option>`)
            .join("")}`
    }

    _setupSelect(): void {
        const bsSelectOptions = {
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true,
        }

        this.#select = new Select(this.#baseId, undefined, bsSelectOptions, this._getOptions())
    }

    _selected(): void {
        const timeSelected = String(this.#select.getValues())

        this.#ports.portData = this.#ports.portDataDefault.filter(
            (port) => port.capturable && port.portBattleStartTime === Number(timeSelected)
        )
        this.#ports.showRadius = ""
        this.#ports.update()
    }

    _setupListener(): void {
        this.#select.select$.on("change", async () => {
            registerEvent("Menu", this.#baseId)

            this._selected()
        })
    }
}
