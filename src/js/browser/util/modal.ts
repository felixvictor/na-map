/*!
 * This file is part of na-map.
 *
 * @file      Modal.
 * @module    util/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSModal } from "bootstrap/js/dist/modal"
import { select as d3Select, Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { getIdFromBaseName } from "common/common-browser"

export default class Modal {
    readonly #baseId: HtmlString
    readonly #baseIdOutput: HtmlString
    readonly #baseIdSelects: HtmlString
    readonly #baseName: string
    readonly #buttonId: HtmlString
    readonly #buttonText: string
    readonly #modal: BSModal
    readonly #modalId: HtmlString
    readonly #size: HtmlString

    #bodySel = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #footerSel = {} as Selection<HTMLElement, unknown, HTMLElement, unknown>
    #modalSel = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #outputSel = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #selectsSel = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>

    constructor(title: string, size: string, buttonText = "Close") {
        this.#baseName = title
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#baseIdSelects = `${this.#baseId}-selects`
        this.#baseIdOutput = `${this.#baseId}-output`
        this.#buttonId = `menu-${this.baseId}`
        this.#buttonText = buttonText
        this.#modalId = `modal-${this.baseId}`
        this.#size = `modal-${size}`

        this._inject()
        this.#modal = new BSModal(this.#modalSel.node() as Element)
        this.show()
    }

    _inject(): void {
        this.#modalSel = d3Select("#modal-section")
            .append("div")
            .attr("id", this.#modalId)
            .attr("class", "modal")
            .attr("tabindex", "-1")
            .attr("aria-labelledby", `title-${this.#modalId}`)
            .attr("aria-hidden", "true")

        const dialog = this.#modalSel.append("div").attr("class", `modal-dialog ${this.#size}`)

        const content = dialog.append("div").attr("class", "modal-content")

        const header = content.append("header").attr("class", "modal-header")
        header
            .append("h5")
            .attr("class", "modal-title")
            .attr("id", `title-${this.#modalId}`)
            .html(this.#baseName)
        header
            .append("button")
            .attr("type", "button")
            .attr("class", "btn-close")
            .attr("data-bs-dismiss", "modal")
            .attr("aria-label", "Close")

        this.#bodySel = content.append("div").attr("class", "modal-body")
        this.#selectsSel = this.#bodySel.append("div").attr("id", this.#baseIdSelects)
        this.#outputSel = this.#bodySel.append("div").attr("id", this.#baseIdOutput)

        this.#footerSel = content.append<HTMLElement>("footer").attr("class", "modal-footer")
        this.#footerSel
            .append("button")
            .attr("type", "button")
            .attr("class", "btn btn-secondary")
            .attr("data-bs-dismiss", "modal")
            .text(this.#buttonText)
    }

    hide(): void {
        this.#modal.hide()
    }

    show(): void {
        this.#modal.show()
    }

    getModalNode(): HTMLDivElement {
        return this.#modalSel.node() as HTMLDivElement
    }

    get baseIdSelects(): HtmlString {
        return this.#baseIdSelects
    }

    get baseIdOutput(): HtmlString {
        return this.#baseIdOutput
    }

    get bodySel(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#bodySel
    }

    get footer(): Selection<HTMLElement, unknown, HTMLElement, unknown> {
        return this.#footerSel
    }

    get outputSel(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#outputSel
    }

    get selectsSel(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#selectsSel
    }

    removeFooter(): void {
        this.#footerSel.remove()
    }

    get baseId(): HtmlString {
        return this.#baseId
    }

    get id(): HtmlString {
        return this.#modalId
    }
}
