/*!
 * This file is part of na-map.
 *
 * @file      Select ports caln select.
 * @module    map/select-ports/clan
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import DisplayPorts from "../display-ports"
import SelectPortsSelectNation from "./nation"
import SelectPortsSelectClan from "./clan"

export default class SelectPortsNationClan {
    #clanSelect: SelectPortsSelectClan
    #nationSelect: SelectPortsSelectNation
    #ports: DisplayPorts

    constructor(ports: DisplayPorts) {
        this.#ports = ports

        this.#nationSelect = new SelectPortsSelectNation(ports)
        this.#clanSelect = new SelectPortsSelectClan(ports)

        this._setupListener()
    }

    _setupListener(): void {
        this.#clanSelect.selectSel.addEventListener("change", async () => {
            this.#clanSelect.changeEvent()
        })
        this.#nationSelect.selectSel.addEventListener("change", async () => {
            const needClanRefresh = this.#nationSelect.changeEvent()
            if (needClanRefresh) {
                this.refreshSelect()
            }
        })
    }

    refreshSelect(): void {
        this.#clanSelect.refreshSelect()
    }
}
