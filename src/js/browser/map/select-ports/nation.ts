/*!
 * This file is part of na-map.
 *
 * @file      Select ports nation select.
 * @module    map/select-ports/nation
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import SelectPortsSelect from "./select"
import { getNationOptions } from "./nation-options"

import { registerEvent } from "../../analytics"
import { validNationShortName } from "common/common"
import DisplayPorts from "../display-ports"

export default class SelectPortsSelectNation extends SelectPortsSelect {
    #nation = ""
    #ports: DisplayPorts

    constructor(ports: DisplayPorts) {
        super("Select nation")

        this.#ports = ports

        this._injectSelect()
    }

    _injectSelect(): void {
        const options = getNationOptions(true)
console.log("SelectPortsSelectNation options", options)
        this.selectSel.insertAdjacentHTML("beforeend", options)
        this.selectSel.classList.add("selectpicker")
        this.select$.selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true,
        })
    }

    _selectSelected(): boolean {
        this.#nation = this.selectSel.options[this.selectSel.selectedIndex].value ?? ""

        if (validNationShortName(this.#nation)) {
            this.#ports.portData = this.#ports.portDataDefault.filter((port) => port.nation === this.#nation)
            this.#ports.showRadius = ""
            this.#ports.update()
            return true
        }

        this.#nation = "NT"
        return false
    }

    changeEvent(event: Event): boolean {
        registerEvent("Menu", this.baseName)

        this._resetOtherSelects()
        return this._selectSelected()
        // event.preventDefault()
    }

    get nation(): string {
        return this.#nation
    }
}
