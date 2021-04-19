import Modal from "util/modal"
import { getBaseIdOutput, getBaseIdSelects } from "common/common-browser"

export default class ListRecipesModal extends Modal {
    constructor(title: string) {
        super(title, "xl")

        this._init()
    }

    _init(): void {
        this._injectModal()
    }

    _injectModal(): void {
        const body = super.getBodySel()

        body.append("div").attr("id", `${getBaseIdSelects(super.baseId)}`)
        body.append("div")
            .attr("id", `${getBaseIdOutput(super.baseId)}`)
            .attr("class", "container-fluid")
    }
}
