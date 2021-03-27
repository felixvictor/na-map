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
    #ports: DisplayPorts

    constructor(ports: DisplayPorts) {
        super("Select nation")

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
        const options = getNationOptions(true)

        this.selectSel.insertAdjacentHTML("beforeend", options)
        this.selectSel.classList.add("selectpicker")
        $(this.selectSel).selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true,
        })
    }

    _selectSelected(): void {
        this._nation = this.selectSel.options[this.selectSel.selectedIndex].value ?? ""

        if (validNationShortName(this._nation)) {
            this.#ports.portData = this.#ports.portDataDefault.filter((port) => port.nation === this._nation)
            this.#ports.showRadius = ""
            this.#ports.update()
            this._setupClanSelect()
            $(this._propClanSelector!).selectpicker("refresh")
        } else {
            this._nation = "NT"
        }
    }
}
