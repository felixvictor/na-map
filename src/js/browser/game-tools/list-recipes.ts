/*!
 * This file is part of na-map.
 *
 * @file      List recipes.
 * @module    game-tools/list-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select/js/bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { putImportError } from "../../common/common"
import { insertBaseModal } from "../../common/common-browser"
import { formatInt, formatSignPercent } from "../../common/common-format"
import { getCurrencyAmount } from "../../common/common-game-tools"
import { getOrdinal } from "../../common/common-math"
import { sortBy } from "../../common/common-node"
import { servers } from "../../common/servers"

import { Module, RecipeEntity, RecipeGroup } from "../../common/gen-json"
import { HtmlString } from "../../common/interface"

const replacer = (match: string, p1: number, p2: number): string =>
    `${getOrdinal(p1)}\u202F\u2013\u202F${getOrdinal(p2)}`

export default class ListRecipes {
    private readonly _serverType: string
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _moduleData = [] as Module[]
    private _recipeData = [] as RecipeGroup[]
    private _recipes!: Map<number, RecipeEntity>

    constructor(serverId: string) {
        this._serverType = servers.find((server) => server.id === serverId)!.type

        this._baseName = "List admiralty items and recipes"
        this._baseId = "recipe-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._setupListener()
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            this._moduleData = (await import(/* webpackChunkName: "data-modules" */ "Lib/gen-generic/modules.json"))
                .default as Module[]
            this._recipeData = (await import(/* webpackChunkName: "data-recipes" */ "Lib/gen-generic/recipes.json"))
                .default.recipe as RecipeGroup[]
            this._recipes = new Map<number, RecipeEntity>(
                this._recipeData.flatMap((group) => group.recipes.map((recipe: RecipeEntity) => [recipe.id, recipe]))
            )
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._recipeListSelected()
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName })

        const id = `${this._baseId}-select`
        const body = d3Select(`#${this._modalId} .modal-body`)
        body.append("select").attr("name", id).attr("id", id)
        body.append("label")
            .attr("for", id)
            .attr("class", "text-muted pl-2")
            .text("Items listed here may not be available in the game (yet).")

        body.append("div").attr("id", `${this._baseId}`).attr("class", "container-fluid")
    }

    _getOptions(): HtmlString {
        return this._recipeData
            .map(
                (group) =>
                    `<optgroup label="${group.group}">${group.recipes
                        .filter((recipe) => recipe.serverType === "Any" || recipe.serverType === this._serverType)
                        .sort(sortBy(["name"]))
                        .map(
                            (recipe: RecipeEntity) =>
                                `<option value="${recipe.id}">${recipe.name.replace(/(\d)-(\d)(st|rd|th)/, replacer)}`
                        )
                        .join("</option>")}`
            )
            .join("</optgroup>")
    }

    _setupSelect(): void {
        const select$ = $(`#${this._baseId}-select`)
        const options = this._getOptions()
        select$.append(options)
    }

    _setupSelectListener(): void {
        const select$ = $(`#${this._baseId}-select`)

        select$
            .addClass("selectpicker")
            .on("change", (event) => this._recipeSelected(event))
            .selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Select item",
                virtualScroll: true,
            } as BootstrapSelectOptions)
    }

    _initModal(): void {
        this._injectModal()
        this._setupSelect()
        this._setupSelectListener()
    }

    _recipeListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    /**
     * Get recipe data by id
     * @param selectedRecipeId - Selected recipe
     */
    _getRecipeData(selectedRecipeId: number): RecipeEntity {
        return this._recipes.get(selectedRecipeId)!
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

        for (const type of this._moduleData) {
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
     * @param event - Event
     */
    _recipeSelected(event: JQuery.ChangeEvent): void {
        const recipeId = Number($(event.currentTarget).find(":selected").val())

        // Remove old recipe list
        d3Select(`#${this._baseId} div`).remove()

        // Add new recipe list
        d3Select(`#${this._baseId}`).append("div").classed("mt-4", true)
        d3Select(`#${this._baseId} div`).html(this._getText(recipeId))
    }
}
