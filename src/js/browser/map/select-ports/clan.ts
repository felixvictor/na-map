/*!
 * This file is part of na-map.
 *
 * @file      Select ports caln select.
 * @module    map/select-ports/clan
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import SelectPortsSelect from "./select"
import { registerEvent } from "../../analytics"
import DisplayPorts from "js/browser/map/display-ports"
import { simpleStringSort } from "common/common"

export default class SelectPortsSelectClan extends SelectPortsSelect {
    #button: HTMLButtonElement
    #ports: DisplayPorts

    constructor(ports: DisplayPorts) {
        super("Select clan")

        this.#ports = ports

        this._injectSelect()
        this.#button = this.selectSel.parentNode?.querySelector("button") as HTMLButtonElement
    }

    _injectSelect(): void {
        const clanList = new Set<string>()
        for (const d of this.#ports.portData.filter((d) => d.capturer)) {
            // @ts-expect-error
            clanList.add(d.capturer)
        }

        if (this.selectSel) {
            // noinspection InnerHTMLJS
            this.selectSel.innerHTML = ""
            let options = ""

            if (clanList.size === 0) {
                this.selectSel.disabled = true
            } else {
                this.selectSel.disabled = false
                options = `${[...clanList]
                    .sort(simpleStringSort)
                    .map((clan) => `<option value="${clan}" class="caps">${clan}</option>`)
                    .join("")}`
            }

            this.selectSel.insertAdjacentHTML("beforeend", options)
            this.selectSel.classList.add("selectpicker")
            this.select$.selectpicker({
                dropupAuto: false,
                liveSearch: false,
                virtualScroll: true,
            })
        }
    }

    _capsOn(): void {
        this.#button.classList.add("caps")
    }

    _capsOff(): void {
        this.#button.classList.remove("caps")
    }

    _selectSelected(): void {
        const clan = this.selectSel.options[this.selectSel.selectedIndex].value

        this._capsOn()
        if (clan) {
            this.#ports.portData = this.#ports.portDataDefault.filter((port) => port.capturer === clan)
        }

        this.#ports.showRadius = ""
        this.#ports.update()
    }

    changeEvent(): void {
        registerEvent("Menu", this.baseName)

        this._resetOtherSelects()
        this._selectSelected()
    }

    refreshSelect(): void {
        this._injectSelect()
        this._capsOff()
        this.select$.selectpicker("refresh")
    }
}
