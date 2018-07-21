/*    ingredient-list.js
 */

/* global d3 : false
 */

import { chunkify } from "./util";
import { registerEvent } from "./analytics";

export default class Ingredient {
    constructor(ingredientData) {
        this._ingredientData = ingredientData;

        this._setupListener();
    }

    _setupListener() {
        $("#button-ingredient-list").on("click", event => {
            registerEvent("Tools", "List ingredients");
            event.stopPropagation();
            this._ingredientListSelected();
        });
    }

    _ingredientListSelected() {
        $("#modal-ingredients").modal("show");
        this._div = "#ingredients-list";
        this._showIngredient();
    }

    _getRows() {
        return this._ingredientData.map(
            ingredient =>
                `<tr><td>${ingredient.name}</td><td>${ingredient.recipe
                    .map(recipeName => recipeName)
                    .join("<br>")}</td></tr>`
        );
    }

    /**
     * Construct ingredient tables
     * @param {string} selectedIngredientName Selected ingredient.
     * @return {string} html string
     * @private
     */
    _getText() {
        const columns = 2,
            rows = this._getRows(),
            splitRows = chunkify(rows, columns);
        let text = "";
        Array.from(Array(splitRows.length).keys()).forEach(column => {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<table class="table table-sm"><thead>';
            text += "<tr><th>Ingredient</th><th>Recipe</th></tr></thead><tbody>";
            text += splitRows[column].join("");
            text += "</tbody></table></div>";
        });

        return text;
    }

    /**
     * Show ingredients
     * @return {void}
     * @private
     */
    _showIngredient() {
        // Remove old ingredient list
        d3.select(`${this._div} div`).remove();

        // Add new ingredient list
        d3.select(this._div)
            .append("div")
            .classed("row ingredients mt-4", true);
        $(this._div)
            .find("div")
            .append(this._getText());
    }
}
