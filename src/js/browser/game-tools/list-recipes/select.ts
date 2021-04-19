import { select as d3Select } from "d3-selection"
import JQuery from "jquery"
import { getBaseIdSelects } from "common/common-browser"
import { HtmlString } from "common/interface"
import Select from "util/select"
import { RecipeEntity, RecipeGroup } from "common/gen-json"
import { sortBy } from "common/common"
import { getOrdinal } from "common/common-math"
import { ServerType } from "common/servers"

const replacer = (match: string, p1: number, p2: number): string =>
    `${getOrdinal(p1)}\u202F\u2013\u202F${getOrdinal(p2)}`

export default class ListRecipesSelect extends Select {
    #recipeData: RecipeGroup[]
    #select$ = {} as JQuery<HTMLSelectElement>
    #serverType: ServerType

    constructor(id: HtmlString, options: BootstrapSelectOptions, recipeData: RecipeGroup[], serverType: ServerType) {
        super(id)
        this.#recipeData = recipeData
        this.#serverType = serverType

        this._init(options)
    }

    _getOptions(): HtmlString {
        return this.#recipeData
            .map(
                (group) =>
                    `<optgroup label="${group.group}">${group.recipes
                        .filter((recipe) => recipe.serverType === "Any" || recipe.serverType === this.#serverType)
                        .sort(sortBy(["name"]))
                        .map(
                            (recipe: RecipeEntity) =>
                                `<option value="${recipe.id}">${recipe.name.replace(
                                    /(\d)-(\d)(st|rd|th)/,
                                    replacer
                                )}</option>`
                        )
                        .join("")}</optgroup>`
            )
            .join("")
    }

    _setupSelect(): void {
        const options = this._getOptions()
        this.#select$.append(options)
    }

    _injectSelects(): void {
        const selectsDiv = d3Select(`#${getBaseIdSelects(super.baseId)}`)
        const id = this.getSelectId()

        const div = selectsDiv.append("div")
        div.append("select").attr("name", id).attr("id", id).attr("class", "selectpicker")
        div.append("label")
            .attr("for", id)
            .attr("class", "form-label text-muted ps-2")
            .text("Items listed here may not be available in the game (yet).")
    }

    _init(options: BootstrapSelectOptions): void {
        this._injectSelects()
        this.#select$ = $(`#${this.getSelectId()}`)
        this._setupSelect()
        Select.construct(this.#select$, options)
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
