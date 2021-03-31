/*!
 * This file is part of na-map.
 *
 * @file      Predict wind modal.
 * @module    map-tools/wind-rose/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { copyF11ToClipboard } from "../../util"
import { registerEvent } from "../../analytics"

import Modal from "util/modal"

import { HtmlString } from "common/interface"

export default class F11Modal extends Modal {
    readonly #copyButtonId: HtmlString
    readonly #formId: HtmlString
    readonly #submitButtonId: HtmlString
    readonly #xInputId: HtmlString
    readonly #zInputId: HtmlString

    #formSel = {} as HTMLFormElement
    #xInputSel: HTMLInputElement | undefined = undefined
    #zInputSel: HTMLInputElement | undefined = undefined

    constructor(title: string) {
        super(title, "sm")

        this.#formId = `${this.baseId}-form`
        this.#xInputId = `${this.baseId}-input-x`
        this.#zInputId = `${this.baseId}-input-y`
        this.#copyButtonId = `${this.baseId}-copy-coord`
        this.#submitButtonId = `${this.baseId}-submit`

        this._init()
    }

    _init(): void {
        this._injectModal()
        this.#xInputSel = document.querySelector<HTMLInputElement>(`#${this.#xInputId}`) as HTMLInputElement
        this.#zInputSel = document.querySelector<HTMLInputElement>(`#${this.#zInputId}`) as HTMLInputElement

        // Copy coordinates to clipboard (ctrl-c key event)
        document.querySelector(`#${this.modalId}`)?.addEventListener("keydown", (event: Event): void => {
            if ((event as KeyboardEvent).key === "KeyC" && (event as KeyboardEvent).ctrlKey) {
                this._copyCoordClicked(event)
            }
        })
        // Copy coordinates to clipboard (click event)
        document.querySelector(`#${this.#copyButtonId}`)?.addEventListener("click", (event): void => {
            this._copyCoordClicked(event)
        })
    }

    _injectModal(): void {
        const body = super.getModalBody()
        super.removeFooter()
        console.log("injectModal", body)
        const form = body
            .append("form")
            .attr("id", this.#formId)
            .attr("role", "form")
        this.#formSel = form.node()!

        form.append("div").classed("alert alert-primary", true).text("Use F11 in open world.")

        const inputGroup1 = form.append("div").classed("form-group", true).append("div").classed("input-group", true)
        inputGroup1.append("label").attr("for", this.#xInputId)
        inputGroup1
            .append("input")
            .classed("form-control", true)
            .attr("id", this.#xInputId)
            .attr("type", "number")
            .attr("required", "")
            .attr("placeholder", "X coordinate")
            .attr("min", "-819")
            .attr("max", "819")
            .attr("step", "1")
            .attr("tabindex", "1")

        inputGroup1
            .append("div")
            .classed("input-group-append", true)
            .append("span")
            .classed("input-group-text", true)
            .text("k")

        const inputGroup2 = form.append("div").classed("form-group", true).append("div").classed("input-group", true)
        inputGroup2.append("label").attr("for", this.#zInputId)
        inputGroup2
            .append("input")
            .classed("form-control", true)
            .attr("id", this.#zInputId)
            .attr("type", "number")
            .attr("required", "")
            .attr("placeholder", "Z coordinate")
            .attr("step", "1")
            .attr("min", "-819")
            .attr("max", "819")
            .attr("tabindex", "2")
        inputGroup2
            .append("div")
            .classed("input-group-append", true)
            .append("span")
            .classed("input-group-text", true)
            .text("k")

        form.append("div")
            .classed("alert alert-primary", true)
            .append("small")
            .html("In k units (divide by 1,000).<br>Example: <em>43</em> for value of <em>43,162.5</em>.")

        const buttonGroup = form.append("div").classed("float-end btn-group", true).attr("role", "group")

        const button = buttonGroup
            .append("button")
            .classed("btn btn-outline-secondary icon-outline-button", true)
            .attr("id", this.#copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
        button.append("i").classed("icon icon-copy", true)
        buttonGroup
            .append("button")
            .classed("btn btn-outline-secondary", true)
            .attr("id", this.#submitButtonId)
            .attr("title", "Go to")
            .attr("type", "submit")
            .text("Go to")
    }

    _getInputValue(element: HTMLInputElement | undefined): number {
        if (element?.value) {
            return Number(element.value)
        }

        return Number.POSITIVE_INFINITY
    }

    getXCoord(): number {
        return this._getInputValue(this.#xInputSel)
    }

    getZCoord(): number {
        return this._getInputValue(this.#zInputSel)
    }

    _copyCoordClicked(event: Event): void {
        registerEvent("Menu", "Copy F11 coordinates")
        event.preventDefault()

        const x = this.getXCoord()
        const z = this.getZCoord()

        copyF11ToClipboard(x, z, super.getModalNode())
    }

    showModal(): void {
        super.show()
        this.#xInputSel?.focus()
        this.#xInputSel?.select()
    }

    get formSel(): HTMLFormElement {
        return this.#formSel
    }
}
