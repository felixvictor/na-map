/*!
 * This file is part of na-map.
 *
 * @file      List recipes.
 * @module    game-tools/list-recipes
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/modal"

import "bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../../analytics"
import { getBaseIdOutput, getIdFromBaseName } from "common/common-browser"
import { formatInt, formatSignPercent } from "common/common-format"
import { getCurrencyAmount } from "common/common-game-tools"
import { getServerType, ServerId, ServerType } from "common/servers"

import { Module, RecipeEntity, RecipeGroup } from "common/gen-json"
import { HtmlString } from "common/interface"
import ListRecipesModal from "./modal"
import ListRecipesSelect from "./select"

export default class ListRecipes {
    readonly #baseId: HtmlString
    readonly #baseName = "List admiralty items and recipes"
    readonly #serverType: ServerType
    #modal: ListRecipesModal | undefined = undefined
    #select = {} as ListRecipesSelect
    #menuId: HtmlString
    #moduleData = [] as Module[]
    #recipeData = [] as RecipeGroup[]
    #recipes!: Map<number, RecipeEntity>

    constructor(serverId: ServerId) {
        this.#serverType = getServerType(serverId)
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        console.log("constructor CHANGE ejs", this.#menuId)
        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        this.#moduleData = (
            await import(/* webpackChunkName: "data-modules" */ "../../../../../lib/gen-generic/modules.json")
        ).default as Module[]
        this.#recipeData = (
            await import(/* webpackChunkName: "data-recipes" */ "../../../../../lib/gen-generic/recipes.json")
        ).default.recipe as RecipeGroup[]
        this.#recipes = new Map<number, RecipeEntity>(
            this.#recipeData.flatMap((group) => group.recipes.map((recipe: RecipeEntity) => [recipe.id, recipe]))
        )
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new ListRecipesModal(this.#baseName)
            this._setupSelect()
            this._setupSelectListener()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _setupSelect(): void {
        const selectpickerOptions: BootstrapSelectOptions = {
            dropupAuto: false,
            liveSearch: true,
            liveSearchNormalize: true,
            liveSearchPlaceholder: "Search ...",
            title: "Select item",
            virtualScroll: true,
        }

        this.#select = new ListRecipesSelect(this.#baseId, selectpickerOptions, this.#recipeData, this.#serverType)
    }

    _setupSelectListener(): void {
        this.#select.getSelect$().on("change", () => {
            this._recipeSelected()
        })
    }

    /**
     * Get recipe data by id
     * @param selectedRecipeId - Selected recipe
     */
    _getRecipeData(selectedRecipeId: number): RecipeEntity {
        return this.#recipes.get(selectedRecipeId)!
    }

    _getRequirementText(currentRecipe: RecipeEntity): HtmlString {
        let text = '<table class="table table-sm card-table"><tbody>'
        if (currentRecipe.labourPrice) {
            text += `<tr><td>${currentRecipe.labourPrice} labour hours</td></tr>`
        }

        if (currentRecipe.goldPrice) {
            text += `<tr><td>${getCurrencyAmount(currentRecipe.goldPrice)}</td></tr>`
        }

        if (currentRecipe.itemRequirements.length > 0) {
            text += `<tr><td>${currentRecipe.itemRequirements
                .map((requirement) => `${requirement.amount} ${requirement.name}`)
                .join("</td></tr><tr><td>")}</td></tr>`
        }

        text += "</tbody></table>"

        return text
    }

    _getPropertiesText(currentRecipe: RecipeEntity): HtmlString {
        let text = ""
        let moduleType = ""
        let properties = ""

        for (const type of this.#moduleData) {
            const modules = type[1].filter((module) => module.id === currentRecipe.result.id)
            for (const module of modules) {
                ;[moduleType] = type
                properties = `<tr><td>${module.properties
                    .map((property) => {
                        const amount = property.isPercentage
                            ? formatSignPercent(property.amount / 100)
                            : property.amount
                        return `${property.modifier} ${amount}`
                    })
                    .join("</td></tr><tr><td>")}</td></tr>`
            }
        }

        if (properties) {
            text += `<h6 class="card-subtitle mb-2 text-muted">${moduleType}</h6>`
            text += `<table class="table table-sm card-table na-table"><tbody>${properties}</tbody></table>`
        } else {
            text += `<p>${formatInt(currentRecipe.result.amount)} ${currentRecipe.result.name}</p>`
        }

        return text
    }

    /**
     * Construct recipe tables
     * @param selectedRecipeId - Selected recipe
     */
    _getText(selectedRecipeId: number): HtmlString {
        const currentRecipe = this._getRecipeData(selectedRecipeId)

        let text = '<div class="row no-gutters card-deck">'

        text += '<div class="card col-6"><div class="card-header">Item</div>'
        text += '<div class="card-body">'
        text += this._getRequirementText(currentRecipe)
        text += "</div></div>"

        text += '<div class="card col-6"><div class="card-header">Result</div>'
        text += '<div class="card-body">'
        text += this._getPropertiesText(currentRecipe)
        text += "</div></div>"

        text += "</div></div>"
        return text
    }

    /**
     * Show recipes for selected recipe type
     */
    _recipeSelected(): void {
        const recipeId = Number(this.#select.getSelectedValues())
        const div = d3Select(`#${getBaseIdOutput(this.#baseId)}`)

        // Remove old recipe list
        div.select("div").remove()

        // Add new recipe list
        div.append("div").classed("mt-4", true).html(this._getText(recipeId))
    }
}
