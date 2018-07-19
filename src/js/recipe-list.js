/*    recipe-list.js
 */

/* global d3 : false
 */

import { formatInt, formatPercent, formatSignPercent } from "./util";
import { registerEvent } from "./analytics";

export default class Recipe {
    constructor(recipeData, moduleData) {
        this._recipeData = recipeData.map(recipe => {
            recipe.name = recipe.name.replace(" Blueprint", "");
            return recipe;
        });
        this._moduleData = moduleData;
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

    _getRequirementText(currentRecipe) {
        let text = '<table class="table table-sm"><tbody>';
        if (currentRecipe.laborPrice) {
            text += `<tr><td>${currentRecipe.laborPrice} labour hours</td></tr>`;
        }
        if (currentRecipe.goldPrice) {
            text += `<tr><td>${currentRecipe.goldPrice} gold</td></tr>`;
        }
        if (currentRecipe.itemRequirements.length) {
            text += `<tr><td>${currentRecipe.itemRequirements
                .map(requirement => `${requirement.amount} ${requirement.name}`)
                .join("</td></tr><tr><td>")}</td></tr>`;
        }
        text += "</tbody></table>";

        return text;
    }

    _getModuleText(moduleName) {
        let text = "",
            moduleType = "",
            properties = "";
        this._moduleData.forEach(type => {
            type[1].filter(module => module.name === moduleName).forEach(module => {
                moduleType = type[0];
                properties = `<tr><td>${module.properties
                    .map(property => {
                        const amount = property.absolute ? property.amount : formatSignPercent(property.amount / 100);
                        return `${property.modifier} ${amount}`;
                    })
                    .join("</td></tr><tr><td>")}</td></tr>`;
            });
        });
        text = `<h6 class="card-subtitle mb-2 text-muted">${moduleType}</h6>`;
        text += `<table class="table table-sm"><tbody>${properties}</tbody></table>`;

        return text;
    }

    /**
     * Construct recipe tables
     * @param {string} selectedRecipeName Selected recipe.
     * @return {string} html string
     * @private
     */
    _getText(selectedRecipeName) {
        const currentRecipe = this._getRecipeData(selectedRecipeName),
            moduleName = currentRecipe.module ? currentRecipe.module : currentRecipe.name;

        let text = '<div class="row"><div class="card-deck mt-4">';

        text += '<div class="card"><div class="card-header">Recipe</div>';
        text += '<div class="card-body"><h5 class="card-title">Requirements</h5>';
        text += this._getRequirementText(currentRecipe);
        text += "</div></div>";

        text += '<div class="card"><div class="card-header">Resulting module</div>';
        text += '<div class="card-body"><h5 class="card-title">Properties</h5>';
        text += this._getModuleText(moduleName);
        text += "</div></div>";

        text += "</div></div>";
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
