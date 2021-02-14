/*!
 * This file is part of na-map.
 *
 * @file      Get position.
 * @module    get-position
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { convertInvCoordX, convertInvCoordY } from "common/common-math"
import { circleRadiusFactor, insertBaseModal } from "common/common-browser"
import { sortBy } from "common/common-node"
import { copyF11ToClipboard } from "../util"
import { trilaterate, Vector } from "util/transliterate"
import Toast from "util/toast"

import JQuery from "jquery"
import { HtmlString } from "common/interface"

import DisplayPorts from "./display-ports"

/**
 * Get position
 */
export default class TrilateratePosition {
    #modal$: JQuery = {} as JQuery
    #ports: DisplayPorts
    readonly #baseId: string
    readonly #baseName: string
    readonly #buttonId: HtmlString
    readonly #input: HtmlString[] = [] as HtmlString[]
    readonly #modalId: HtmlString
    readonly #NumberOfInputs: number
    readonly #numbers: number[]
    readonly #select: HtmlString[] = [] as HtmlString[]
    readonly #selector: Array<HTMLSelectElement | null> = [] as Array<HTMLSelectElement | null>

    /**
     * @param ports - Port data
     */
    constructor(ports: DisplayPorts) {
        this.#ports = ports

        // Number of input port distances
        this.#NumberOfInputs = 3
        this.#numbers = [...new Array(this.#NumberOfInputs).keys()]
        this.#baseName = "Get position"
        this.#baseId = "get-position"
        this.#buttonId = `button-${this.#baseId}`

        this.#modalId = `modal-${this.#baseId}`
        for (const inputNumber of this.#numbers) {
            this.#select[inputNumber] = `${this.#baseId}-${inputNumber}-select`
            this.#input[inputNumber] = `${this.#baseId}-${inputNumber}-input`
        }

        this._setupListener()
    }

    _navbarClick(): void {
        registerEvent("Menu", "Get position")

        this._positionSelected()
    }

    /**
     * Setup menu item listener
     */
    _setupListener(): void {
        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", () => {
            this._navbarClick()
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this.#modalId, title: this.#baseName, size: "modal-md", buttonText: "Go" })

        const body = d3Select(`#${this.#modalId} .modal-body`)
        body.append("div").attr("class", "alert alert-primary").attr("role", "alert").text("Use in-game trader tool.")

        const form = body.append("form")
        const dataList = form.append("datalist").attr("id", "defaultDistances")
        for (const distance of [5, 10, 15, 20, 30, 50, 100, 200]) {
            dataList.append("option").attr("value", distance)
        }

        for (const inputNumber of this.#numbers) {
            const formRow = form.append("div").attr("class", "form-row")
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("label")
                .append("select")
                .attr("name", this.#select[inputNumber])
                .attr("id", this.#select[inputNumber])
                .attr("class", "selectpicker")
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("input")
                .attr("id", this.#input[inputNumber])
                .attr("name", this.#input[inputNumber])
                .attr("type", "number")
                .attr("class", "form-control")
                .attr("placeholder", "Distance in k")
                .attr("step", 1)
                .attr("list", "defaultDistances")
                .attr("min", 0)
                .attr("max", 1000)
        }
    }

    _setupSelects(): void {
        const selectPorts = this.#ports.portDataDefault
            .map((d) => ({
                id: d.id,
                coord: [d.coordinates[0], d.coordinates[1]],
                name: d.name,
                nation: d.nation,
            }))
            .sort(sortBy(["name"]))

        const options = `${selectPorts
            .map((port) => `<option data-subtext="${port.nation}">${port.name}</option>`)
            .join("")}`
        for (const inputNumber of this.#numbers) {
            this.#selector[inputNumber] = document.querySelector<HTMLSelectElement>(`#${this.#select[inputNumber]}`)
            if (this.#selector[inputNumber]) {
                this.#selector[inputNumber]!.insertAdjacentHTML("beforeend", options)
                $(this.#selector[inputNumber]!).selectpicker({
                    dropupAuto: false,
                    liveSearch: true,
                    liveSearchNormalize: true,
                    liveSearchPlaceholder: "Search ...",
                    title: "Select port",
                    virtualScroll: true,
                })
            }
        }
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._injectModal()
        this._setupSelects()
    }

    /**
     * Show and go to Position
     */
    _showAndGoToPosition(): void {
        const circles = this.#ports.portData.map((port) => ({
            x: port.coordinates[0],
            y: port.coordinates[1],
            z: 0,
            r: port.distance ?? 0,
        }))

        const position = trilaterate(circles[0], circles[1], circles[2], true) as Vector

        // If intersection is found
        if (position) {
            position.x = Math.round(position.x)
            position.y = Math.round(position.y)

            this.#ports.map.f11.printCoord(position.x, position.y)
            this.#ports.map.zoomAndPan(position.x, position.y, 1)

            const coordX = Math.round(convertInvCoordX(position.x, position.y) / -1000)
            const coordY = Math.round(convertInvCoordY(position.x, position.y) / -1000)
            copyF11ToClipboard(coordX, coordY, this.#modal$)

            // eslint-disable-next-line no-new
            new Toast("Get position", "Coordinates copied to clipboard.")
        } else {
            // eslint-disable-next-line no-new
            new Toast("Get position", "No intersection found.")
        }
    }

    /**
     * Use user input and show position
     */
    _useUserInput(): void {
        const roundingFactor = 1.04

        /*
        const ports = new Map([
            ["Les Cayes", 21 * circleRadiusFactor],
            ["Saint-Louis", 29 * circleRadiusFactor],
            ["Tiburon", 34 * circleRadiusFactor],
            ["Kingston / Port Royal", 132 * circleRadiusFactor]
        ]);

        const ports = new Map([
            ["Gracias a Dios", 52 * roundingFactor * circleRadiusFactor],
            ["Port Morant", 296 * roundingFactor * circleRadiusFactor],
            ["Santanillas", 82 * roundingFactor * circleRadiusFactor],
        ])
        */

        const ports = new Map()
        for (const inputNumber of this.#numbers) {
            if (this.#selector[inputNumber]) {
                const port = this.#selector[inputNumber]!.selectedIndex
                    ? this.#selector[inputNumber]!.options[this.#selector[inputNumber]!.selectedIndex].text
                    : ""
                const distance = Number(
                    document.querySelector<HTMLSelectElement>(`#${this.#input[inputNumber]}`)!.value
                )

                if (distance && port !== "") {
                    ports.set(port, distance * roundingFactor * circleRadiusFactor)
                }
            }
        }

        if (ports.size === this.#NumberOfInputs) {
            this.#ports.setShowRadiusSetting("position")
            this.#ports.portData = this.#ports.portDataDefault
                .filter((port) => ports.has(port.name))
                .map((port) => {
                    port.distance = ports.get(port.name)
                    return port
                })
            this.#ports.update()
            this._showAndGoToPosition()
        } else {
            // eslint-disable-next-line no-new
            new Toast("Get position", "Not enough data.")
        }
    }

    /**
     * Action when selected
     */
    _positionSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this.#modalId}`)) {
            this._initModal()
            this.#modal$ = $(`#${this.#modalId}`)
        }

        // Show modal
        this.#modal$.modal("show").one("hidden.bs.modal", () => {
            this._useUserInput()
        })
    }
}
