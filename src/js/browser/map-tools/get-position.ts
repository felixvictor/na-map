/*!
 * This file is part of na-map.
 *
 * @file      Get position.
 * @module    get-position
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select/js/bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { copyF11ToClipboard } from "../util"
import Toast from "../util/toast"
import { convertInvCoordX, convertInvCoordY } from "../../common/common-math"
import DisplayPorts from "../map/display-ports"
import { circleRadiusFactor, HtmlString, insertBaseModal } from "../../common/common-browser"
import { sortBy } from "../../common/common-node"

interface Vector {
    x: number
    y: number
    z: number
}
interface Circle {
    x: number
    y: number
    z: number
    r: number
}

/**
 * JavaScript implementation of Trilateration to find the position of a
 * point (P4) from three known points in 3D space (P1, P2, P3) and their
 * distance from the point in question.
 *
 * The solution used here is based on the derivation found on the Wikipedia
 * page of Trilateration: https://en.wikipedia.org/wiki/Trilateration
 *
 * This library does not need any 3rd party tools as all the non-basic
 * geometric functions needed are declared inside the trilaterate() function.
 *
 * See the GitHub page: https://github.com/gheja/trilateration.js
 */

// Scalar and vector operations

const sqr = (a: number): number => a * a

const norm = (a: Vector): number => Math.sqrt(sqr(a.x) + sqr(a.y) + sqr(a.z))

const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y + a.z * b.z

const vectorSubtract = (a: Vector, b: Vector): Vector => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
})

const vectorAdd = (a: Vector, b: Vector): Vector => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
})

const vectorDivide = (a: Vector, b: number): Vector => ({
    x: a.x / b,
    y: a.y / b,
    z: a.z / b,
})

const vectorMultiply = (a: Vector, b: number): Vector => ({
    x: a.x * b,
    y: a.y * b,
    z: a.z * b,
})

const vectorCross = (a: Vector, b: Vector): Vector => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
})

/**
 * Calculates the coordinates of a point in 3D space from three known points
 * and the distances between those points and the point in question.
 *
 * If no solution found then null will be returned.
 *
 * If two solutions found then both will be returned, unless the fourth
 * parameter (return#middle) is set to true when the middle of the two solution
 * will be returned.
 *
 * @param p1 - Point and distance
 * @param p2 - Point and distance
 * @param p3 - Point and distance
 * @param returnMiddle - If two solutions found then return the center of them
 * @returns Solution
 */
const trilaterate = (p1: Circle, p2: Circle, p3: Circle, returnMiddle = false): Vector | Vector[] | null => {
    // based on: https://en.wikipedia.org/wiki/Trilateration

    const ex = vectorDivide(vectorSubtract(p2, p1), norm(vectorSubtract(p2, p1)))
    const i = dot(ex, vectorSubtract(p3, p1))
    let a = vectorSubtract(vectorSubtract(p3, p1), vectorMultiply(ex, i))
    const ey = vectorDivide(a, norm(a))
    const ez = vectorCross(ex, ey)
    const d = norm(vectorSubtract(p2, p1))
    const j = dot(ey, vectorSubtract(p3, p1))

    const x = (sqr(p1.r) - sqr(p2.r) + sqr(d)) / (2 * d)
    const y = (sqr(p1.r) - sqr(p3.r) + sqr(i) + sqr(j)) / (2 * j) - (i / j) * x

    let b = sqr(p1.r) - sqr(x) - sqr(y)

    // floating point math flaw in IEEE 754 standard
    // see https://github.com/gheja/trilateration.js/issues/2
    if (Math.abs(b) < 0.0000000001) {
        b = 0
    }

    const z = Math.sqrt(b)

    // no solution found
    if (Number.isNaN(z)) {
        return null
    }

    a = vectorAdd(p1, vectorAdd(vectorMultiply(ex, x), vectorMultiply(ey, y)))
    const p4a = vectorAdd(a, vectorMultiply(ez, z))
    const p4b = vectorSubtract(a, vectorMultiply(ez, z))

    if (z === 0 || returnMiddle) {
        return a
    }

    return [p4a, p4b]
}

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
    readonly #selector: HTMLSelectElement[] = [] as HTMLSelectElement[]

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

    _navbarClick(event: Event): void {
        registerEvent("Menu", "Get position")
        event.stopPropagation()
        this._positionSelected()
    }

    /**
     * Setup menu item listener
     */
    _setupListener(): void {
        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", (event) => this._navbarClick(event))
    }

    _injectModal(): void {
        insertBaseModal({ id: this.#modalId, title: this.#baseName, size: "", buttonText: "Go" })

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
            this.#selector[inputNumber] = document.querySelector(`#${this.#select[inputNumber]}`) as HTMLSelectElement

            this.#selector[inputNumber].insertAdjacentHTML("beforeend", options)
            $(this.#selector[inputNumber]).selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Select port",
                virtualScroll: true,
            } as BootstrapSelectOptions)
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
            const port = this.#selector[inputNumber].selectedIndex
                ? this.#selector[inputNumber].options[this.#selector[inputNumber].selectedIndex].text
                : ""
            const distance = Number((document.querySelector(`#${this.#input[inputNumber]}`) as HTMLSelectElement).value)

            if (distance && port !== "") {
                ports.set(port, distance * roundingFactor * circleRadiusFactor)
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
