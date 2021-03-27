/*!
 * This file is part of na-map.
 *
 * @file      Select ports.
 * @module    map/select-ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap-select"

import dayjs, { Dayjs } from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isBetween from "dayjs/plugin/isBetween"
import utc from "dayjs/plugin/utc"

dayjs.extend(customParseFormat)
dayjs.extend(isBetween)
dayjs.extend(utc)
dayjs.locale("en-gb")

import { initMultiDropdownNavbar } from "common/common-browser"
import { simpleStringSort } from "common/common-node"
import { serverMaintenanceHour } from "common/common-var"

import { NAMap } from "../na-map"
import DisplayPorts from "../display-ports"
import DisplayPbZones from "../display-pb-zones"
import SelectPortsSelectGoods from "./goods"
import SelectPortsSelectPorts from "./ports"

type PortDepth = "deep" | "shallow"

export default class SelectPorts {
    isInventorySelected: boolean
    private _ports: DisplayPorts
    private readonly _map: NAMap
    private readonly _pbZone: DisplayPbZones

    constructor(ports: DisplayPorts, pbZone: DisplayPbZones, map: NAMap) {
        this._ports = ports
        this._pbZone = pbZone
        this._map = map

        const portSelect = new SelectPortsSelectPorts(ports)
        const goodSelect = new SelectPortsSelectGoods(ports)


        this.isInventorySelected = false

        this._setupSelects()
        this._setupListener()
    }

    _setupSelects(): void {
        this._setupClanSelect()
    }

    _setupListener(): void {
        document.querySelector("#menu-prop-deep")?.addEventListener("click", () => {
            this._depthSelected("deep")
        })
        document.querySelector("#menu-prop-shallow")?.addEventListener("click", () => {
            this._depthSelected("shallow")
        })
        document.querySelector("#menu-prop-all")?.addEventListener("click", () => {
            this._allSelected()
        })
        document.querySelector("#menu-prop-non-capturable")?.addEventListener("click", () => {
            this._nonCapSelected()
        })

        document.querySelector("#menu-prop-today")?.addEventListener("click", () => {
            this._capturedToday()
        })
        document.querySelector("#menu-prop-yesterday")?.addEventListener("click", () => {
            this._capturedYesterday()
        })
        document.querySelector("#menu-prop-this-week")?.addEventListener("click", () => {
            this._capturedThisWeek()
        })
        document.querySelector("#menu-prop-last-week")?.addEventListener("click", () => {
            this._capturedLastWeek()
        })

        initMultiDropdownNavbar("selectPortNavbar")
    }

    _setupClanSelect(): void {
        const clanList = new Set<string>()
        for (const d of this._ports.portData.filter((d) => d?.capturer !== "")) {
            clanList.add(d.capturer!)
        }

        if (this._propClanSelector) {
            // noinspection InnerHTMLJS
            this._propClanSelector.innerHTML = ""
            let options = ""

            if (clanList.size === 0) {
                this._propClanSelector.disabled = true
            } else {
                this._propClanSelector.disabled = false
                options = `${[...clanList]
                    .sort(simpleStringSort)
                    .map((clan) => `<option value="${clan}" class="caps">${clan}</option>`)
                    .join("")}`
            }

            this._propClanSelector.insertAdjacentHTML("beforeend", options)
            this._propClanSelector.classList.add("selectpicker")
            $(this._propClanSelector).selectpicker({
                dropupAuto: false,
                liveSearch: false,
                virtualScroll: true,
            })
        }
    }

    _clanSelected(): void {
        const clan = this._propClanSelector?.options[this._propClanSelector.selectedIndex].value

        if (clan) {
            this._ports.portData = this._ports.portDataDefault.filter((port) => port.capturer === clan)
        } else if (this._nation) {
            this._ports.portData = this._ports.portDataDefault.filter((port) => port.nation === this._nation)
        }

        this._ports.showRadius = ""
        this._ports.update()
    }

    _depthSelected(depth: PortDepth): void {
        const portData = this._ports.portDataDefault.filter((d) => (depth === "shallow" ? d.shallow : !d.shallow))

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _allSelected(): void {
        const portData = this._ports.portDataDefault.filter((d) => d.availableForAll)

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _nonCapSelected(): void {
        const portData = this._ports.portDataDefault.filter((d) => !d.capturable)

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _filterCaptured(begin: Dayjs, end: Dayjs): void {
        // console.log("Between %s and %s", begin.format("dddd D MMMM YYYY H:mm"), end.format("dddd D MMMM YYYY H:mm"));
        const portData = this._ports.portDataDefault.filter((port) =>
            dayjs(port.captured, "YYYY-MM-DD HH:mm").isBetween(begin, end, "hour", "(]")
        )

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _capturedToday(): void {
        const now = dayjs.utc()
        let begin = dayjs().utc().hour(serverMaintenanceHour).minute(0)
        if (now.hour() < begin.hour()) {
            begin = begin.subtract(1, "day")
        }

        this._filterCaptured(begin, dayjs.utc(begin).add(1, "day"))
    }

    _capturedYesterday(): void {
        const now = dayjs.utc()
        let begin = dayjs().utc().hour(serverMaintenanceHour).minute(0).subtract(1, "day")
        if (now.hour() < begin.hour()) {
            begin = begin.subtract(1, "day")
        }

        this._filterCaptured(begin, dayjs.utc(begin).add(1, "day"))
    }

    _capturedThisWeek(): void {
        const currentMondayOfWeek = dayjs().utc().startOf("week")
        // This Monday
        const begin = currentMondayOfWeek.utc().hour(serverMaintenanceHour)
        // Next Monday
        const end = dayjs(currentMondayOfWeek).utc().add(7, "day").hour(serverMaintenanceHour)

        this._filterCaptured(begin, end)
    }

    _capturedLastWeek(): void {
        const currentMondayOfWeek = dayjs().utc().startOf("week")
        // Monday last week
        const begin = dayjs(currentMondayOfWeek).utc().subtract(7, "day").hour(serverMaintenanceHour)
        // This Monday
        const end = currentMondayOfWeek.utc().hour(serverMaintenanceHour)

        this._filterCaptured(begin, end)
    }

    clearMap(): void {
        this.isInventorySelected = false
        this._setupClanSelect()
        $(this._propClanSelector!).selectpicker("refresh")
    }
}
