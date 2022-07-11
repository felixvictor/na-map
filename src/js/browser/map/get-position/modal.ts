/*!
 * This file is part of na-map.
 *
 * @file      Predict wind modal.
 * @module    map-tools/wind-rose/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Modal from "util/modal"

import { PortWithTrades } from "common/gen-json"
import { HtmlString } from "common/interface"
import { sortBy } from "common/common"

export default class GetPositionModal extends Modal {
    readonly #ids: number[]
    readonly #numberOfInputs = 3
    readonly #portDataDefault: PortWithTrades[]

    #inputId = [] as HtmlString[]
    #inputSel = [] as HTMLInputElement[]
    #selectId = [] as HtmlString[]
    #selectSel = [] as HTMLSelectElement[]

    constructor(title: string, portDataDefault: PortWithTrades[]) {
        super(title, "md", "Set")

        this.#portDataDefault = portDataDefault

        // Number of input port distances
        this.#ids = Array.from({ length: this.#numberOfInputs }, (_, i) => i)

        this._init()
    }

    _init(): void {
        for (const id of this.#ids) {
            this.#selectId[id] = `${super.baseId}-${id}-select`
            this.#inputId[id] = `${super.baseId}-${id}-input`
        }

        this._injectModal()
        this._setupSelects()
    }

    _injectModal(): void {
        const body = super.bodySel

        const form = body.append("form")
        const dataList = form.append("datalist").attr("id", "defaultDistances")
        for (const distance of [5, 10, 15, 20, 30, 50, 100, 200]) {
            dataList.append("option").attr("value", distance)
        }

        for (const id of this.#ids) {
            const formRow = form.append("div").attr("class", "row mb-4")
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("label")
                .attr("class", "col-form-label")
                .append("select")
                .attr("name", this.#selectId[id])
                .attr("id", this.#selectId[id])
                .attr("class", "selectpicker")
            const formGroup = formRow.append("div").attr("class", "col-md-6 form-floating")
            const input = formGroup
                .append("input")
                .attr("id", this.#inputId[id])
                .attr("name", this.#inputId[id])
                .attr("type", "number")
                .attr("class", "form-control")
                .attr("placeholder", "Distance in k")
                .attr("step", 1)
                .attr("list", "defaultDistances")
                .attr("min", 0)
                .attr("max", 1000)
            formGroup.append("label").attr("for", this.#inputId[id]).attr("class", "ps-4").text("Distance in k")

            this.#inputSel[id] = input.node() as HTMLInputElement
        }

        body.append("div").attr("class", "form-text mt-3").text("Distances from in-game trader tool.")
    }

    _setupSelects(): void {
        const selectPorts = this.#portDataDefault
            .map((d) => ({
                id: d.id,
                name: d.name,
                nation: d.nation,
            }))
            .sort(sortBy(["name"]))

        const options = `${selectPorts
            .map((port) => `<option data-subtext="${port.nation}">${port.name}</option>`)
            .join("")}`
        for (const inputId of this.#ids) {
            this.#selectSel[inputId] = document.querySelector(`#${this.#selectId[inputId]}`) as HTMLSelectElement
            if (this.#selectSel[inputId]) {
                this.#selectSel[inputId].insertAdjacentHTML("beforeend", options)
                $(this.#selectSel[inputId]).selectpicker({
                    dropupAuto: false,
                    liveSearch: true,
                    liveSearchNormalize: true,
                    liveSearchPlaceholder: "Search ...",
                    placeholder: "Select port",
                    virtualScroll: true,
                } as Partial<BootstrapSelectOptions>)
            }
        }
    }

    get ids(): number[] {
        return this.#ids
    }

    get numberOfInputs(): number {
        return this.#numberOfInputs
    }

    getPort(id: number): string {
        const sel = this.#selectSel[id]
        return sel.selectedIndex ? sel.options[sel.selectedIndex].text : ""
    }

    getDistance(id: number): number {
        return Number(this.#inputSel[id].value)
    }
}
