/*!
 * This file is part of na-map.
 *
 * @file      Select ports.
 * @module    map/select-ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import dayjs, { Dayjs } from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isBetween from "dayjs/plugin/isBetween"
import utc from "dayjs/plugin/utc"

dayjs.extend(customParseFormat)
dayjs.extend(isBetween)
dayjs.extend(utc)
dayjs.locale("en-gb")

import { initMultiDropdownNavbar } from "common/common-browser"
import { serverMaintenanceHour } from "common/common-var"

import DisplayPorts from "../display-ports"
import SelectPBTimeWindow from "./pb-time"
import SelectPortsSelectGoods from "./goods"
import SelectPortsSelectPorts from "./ports"
import SelectPortsNationClan from "./nation-clan"
import Select from "util/select"

type PortDepth = "deep" | "shallow"

export default class SelectPorts {
    #nationClan: SelectPortsNationClan
    #ports: DisplayPorts

    constructor(ports: DisplayPorts) {
        this.#ports = ports

        void new SelectPortsSelectPorts(ports)
        void new SelectPortsSelectGoods(ports)
        this.#nationClan = new SelectPortsNationClan(ports)

        this._setupListener()
    }

    _setupListener(): void {
        document.querySelector("#menu-prop-deep")?.addEventListener("click", () => {
            Select.resetAll()
            this._depthSelected("deep")
        })
        document.querySelector("#menu-prop-shallow")?.addEventListener("click", () => {
            Select.resetAll()
            this._depthSelected("shallow")
        })
        document.querySelector("#menu-prop-all")?.addEventListener("click", () => {
            Select.resetAll()
            this._allSelected()
        })
        document.querySelector("#menu-prop-non-capturable")?.addEventListener("click", () => {
            Select.resetAll()
            this._nonCapSelected()
        })
        document.querySelector("#menu-prop-today")?.addEventListener("click", () => {
            Select.resetAll()
            this._capturedToday()
        })
        document.querySelector("#menu-prop-yesterday")?.addEventListener("click", () => {
            Select.resetAll()
            this._capturedYesterday()
        })
        document.querySelector("#menu-prop-this-week")?.addEventListener("click", () => {
            Select.resetAll()
            this._capturedThisWeek()
        })
        document.querySelector("#menu-prop-last-week")?.addEventListener("click", () => {
            Select.resetAll()
            this._capturedLastWeek()
        })

        initMultiDropdownNavbar("selectPortNavbar")
    }

    _depthSelected(depth: PortDepth): void {
        const portData = this.#ports.portDataDefault.filter((d) => (depth === "shallow" ? d.shallow : !d.shallow))

        this.#ports.portData = portData
        this.#ports.showRadius = ""
        this.#ports.update()
    }

    _allSelected(): void {
        const portData = this.#ports.portDataDefault.filter((d) => d.availableForAll)

        this.#ports.portData = portData
        this.#ports.showRadius = ""
        this.#ports.update()
    }

    _nonCapSelected(): void {
        const portData = this.#ports.portDataDefault.filter((d) => !d.capturable)

        this.#ports.portData = portData
        this.#ports.showRadius = ""
        this.#ports.update()
    }

    _filterCaptured(begin: Dayjs, end: Dayjs): void {
        // console.log("Between %s and %s", begin.format("dddd D MMMM YYYY H:mm"), end.format("dddd D MMMM YYYY H:mm"));
        const portData = this.#ports.portDataDefault.filter((port) =>
            dayjs(port.captured, "YYYY-MM-DD HH:mm").isBetween(begin, end, "hour", "(]")
        )

        this.#ports.portData = portData
        this.#ports.showRadius = ""
        this.#ports.update()
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
        this.#nationClan.refreshSelect()
    }
}
