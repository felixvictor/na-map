/*    recipe-list.js
 */

/* global d3 : false
 */

import { formatPercent, formatInt } from "./util";
import { registerEvent } from "./analytics";

export default class Recipe {
    constructor(recipeData) {
        this._recipeData = recipeData.map(recipe => {
            recipe.name = recipe.name.replace(" Blueprint", "");
            return recipe;
        });
        this._options = this._setupOptions();

        this._setupListener();
        this._setupSelect();
    }

    _setupOptions() {
        console.log(this._recipeData);
        return `${this._recipeData.map(recipe => `<option value="${recipe.name}">${recipe.name}</option>;`).join("")}`;
    }

    _setupListener() {
        $("#button-recipe-list").on("click", event => {
            registerEvent("Tools", "List recipes");
            event.stopPropagation();
            this._recipeListSelected();
        });
    }

    _recipeListSelected() {
        $("#modal-recipes").modal("show");
        this._div = "#recipes-list";
    }

    _setupSelect() {
        const select = $("#recipes-select");
        select.append(this._options);

        select
            .addClass("selectpicker")
            .on("change", event => this._recipeSelected(event))
            .selectpicker({ noneSelectedText: "Select recipe" });
    }

    _getRecipeData(selectedRecipeName) {
        return this._recipeData.filter(recipe => recipe.name === selectedRecipeName)[0];
    }

    /**
     * Construct recipe tables
     * @param {string} selectedRecipeName Selected recipe.
     * @return {string} html string
     * @private
     */
    _getText(selectedRecipeName) {
        const currentRecipe = this._getRecipeData(selectedRecipeName);
        let text = `<p class="mt-4">Makes <em>${currentRecipe.module ? currentRecipe.module : currentRecipe.name}</em>`;

        text += "<br>Requirements: ";
        if (currentRecipe.laborPrice) {
            text += `${currentRecipe.laborPrice} labour hours, `;
        }
        if (currentRecipe.goldPrice) {
            text += `${currentRecipe.goldPrice} gold, `;
        }
        if (currentRecipe.itemRequirements.length) {
            text += currentRecipe.itemRequirements
                .map(requirement => `${requirement.amount} ${requirement.name}`)
                .join(", ");
        }
        text += "</p>";

        return text;
    }

    /**
     * Show recipes for selected recipe type
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _recipeSelected(event) {
        const recipe = $(event.currentTarget)
            .find(":selected")
            .val();

        // Remove old recipe list
        d3.select(`${this._div} div`).remove();

        // Add new recipe list
        d3.select(this._div)
            .append("div")
            .classed("recipes", true);
        $(this._div)
            .find("div")
            .append(this._getText(recipe));
    }
}
