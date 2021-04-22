import { Selection } from "d3-selection"
import JQuery from "jquery"
import { HtmlString } from "common/interface"
import Select from "util/select"
import { Module } from "common/gen-json"

export default class ListModulesSelect extends Select {
    #data: Module[]
    #select$ = {} as JQuery<HTMLSelectElement>

    constructor(
        id: HtmlString,
        selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        bsSelectOptions: BootstrapSelectOptions,
        data: Module[]
    ) {
        super(id, selectsDiv)

        this.#data = data

        this._init(bsSelectOptions)
    }

    _getOptions(): HtmlString {
        return `${this.#data.map((type) => `<option value="${type[0]}">${type[0]}</option>`).join("")}`
    }

    _setupSelect(): void {
        const options = this._getOptions()
        this.#select$.append(options)
    }

    _injectSelects(): void {
        const id = this.getSelectId()

        const div = super.selectsDiv.append("div")
        div.append("label").append("select").attr("name", id).attr("id", id).attr("class", "selectpicker")
    }

    _init(bsSelectOptions: BootstrapSelectOptions): void {
        this._injectSelects()
        this.#select$ = $(`#${this.getSelectId()}`)
        this._setupSelect()
        Select.construct(this.#select$, bsSelectOptions)
        Select.reset(this.#select$)
    }

    getSelectId(): HtmlString {
        return `${super.baseId}-select`
    }

    getSelectedValues(): string | number | string[] | undefined {
        return Select.getValues(this.#select$)
    }

    getSelect$(): JQuery<HTMLSelectElement> {
        return this.#select$
    }
}
