import JQuery from "jquery"
import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { LootType } from "common/types"
import Select from "util/select"

export default class ListLootSelect extends Select {
    #select$ = {} as JQuery<HTMLSelectElement>
    #type: LootType

    // eslint-disable-next-line max-params
    constructor(
        id: HtmlString,
        selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        bootstrapSelectOptions: BootstrapSelectOptions,
        type: LootType,
        options: HtmlString
    ) {
        super(id, selectsDiv)

        this.#type = type

        this._init(bootstrapSelectOptions, options)
    }

    _setupSelect(options: HtmlString): void {
        this.#select$.append(options)
    }

    _injectSelects(): void {
        const id = this.getSelectId()

        const div = super.selectsDiv.append("div")
        div.append("label").append("select").attr("name", id).attr("id", id).attr("class", "selectpicker")
    }

    _init(bootstrapSelectOptions: BootstrapSelectOptions, options: HtmlString): void {
        this._injectSelects()
        this.#select$ = $(`#${this.getSelectId()}`)
        this._setupSelect(options)
        Select.construct(this.#select$, bootstrapSelectOptions)
        Select.reset(this.#select$)
    }

    getSelectId(): HtmlString {
        return `${super.baseId}-${this.#type}-select`
    }

    getSelectedValues(): string | number | string[] | undefined {
        return Select.getValues(this.#select$)
    }

    getSelect$(): JQuery<HTMLSelectElement> {
        return this.#select$
    }
}
