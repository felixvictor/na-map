/**
 * This file is part of na-map.
 *
 * @file      List loot and chests.
 * @module    game-tools/list-loot
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { formatInt } from "../util";
import { registerEvent } from "../analytics";
import { getCurrencyAmount, insertBaseModal } from "../common";

export default class ListLoot {
    constructor(lootData) {
        this._lootData = lootData;

        this._baseName = "List loot and chests";
        this._baseId = "loot-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._lootSelectId = `${this._baseId}-loot-select`;
        this._chestSelectId = `${this._baseId}-chest-select`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._lootListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const body = d3Select(`#${this._modalId} .modal-body`);

        [this._lootSelectId, this._chestSelectId].forEach(id => {
            body.append("label").attr("for", id);
            body.append("select")
                .attr("name", id)
                .attr("id", id)
                .attr("class", "selectpicker");
        });

        body.append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid");
    }

    _getLootOptions() {
        return `${this._lootData.loot.map(item => `<option value="${item.id}">${item.name}</option>`).join("")}`;
    }

    _getChestOptions() {
        return `${this._lootData.chests.map(item => `<option value="${item.id}">${item.name}</option>`).join("")}`;
    }

    _setupLootSelect() {
        const options = this._getLootOptions();
        console.log(options);
        this._lootSelect$.append(options);
    }

    _setupChestSelect() {
        const options = this._getChestOptions();
        this._chestSelect$.append(options);
    }

    _setupSelects() {
        this._setupLootSelect();
        this._setupChestSelect();
    }

    _setupLootSelectListener() {
        this._lootSelect$
            .on("change", () => this._itemSelected(this._lootSelect$, "loot"))
            .selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Select loot",
                virtualScroll: true
            });
    }

    _setupChestSelectListener() {
        this._chestSelect$
            .on("change", () => this._itemSelected(this._chestSelect$, "chests"))
            .selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Select chest",
                virtualScroll: true
            });
    }

    _setupSelectListeners() {
        this._setupLootSelectListener();
        this._setupChestSelectListener();
    }

    _initModal() {
        this._injectModal();
        this._lootSelect$ = $(`#${this._lootSelectId}`);
        this._chestSelect$ = $(`#${this._chestSelectId}`);
        this._setupSelects();
        this._setupSelectListeners();
    }

    _lootListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }

        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _getItemData(selectedItemId, type) {
        return this._lootData[type].find(item => item.id === selectedItemId);
    }

    _getItemsText(items) {
        let text = "";
        text += '<table class="table table-sm"><tbody>';
        text += `<tr><td>${items
            .map(item => `${item.name}</td><td>${item.chance}</td><td>${item.amount.min} to ${item.amount.max}`)
            .join("</td></tr><tr><td>")}</td></tr>`;
        text += "</tbody></table>";
        return text;
    }

    _getLootText(currentItem) {
        let text = "";

        text += `<p> Name ${currentItem.name}<br> Class ${currentItem.class}<br> lootprop ${
            currentItem.lootProbability
        }<br> itemprop ${currentItem.itemProbability}<br> quantityprop ${currentItem.quantityProbability}<br> </p>`;

        text += this._getItemsText(currentItem.items);

        return text;
    }

    _getChestText(currentItem) {
        let text = "";

        text += `<p> Name ${currentItem.name}<br> Weight ${currentItem.weight} tons<br> lifetime ${
            currentItem.lifetime
        } hours<br> </p>`;

        text += this._getItemsText(currentItem.items);

        return text;
    }

    /**
     * Construct building tables
     * @param {string} selectedItemId Id of selected item.
     * @param {string} type Type (loot or chests).
     * @return {string} html string
     * @private
     */
    _getText(selectedItemId, type) {
        const currentItem = this._getItemData(selectedItemId, type);
        console.log(selectedItemId, type, currentItem);
        let text = '<div class="row no-gutters card-deck">';

        text += '<div class="card col"><div class="card-header">Items</div>';
        text += '<div class="card-body">';
        text += type === "loot" ? this._getLootText(currentItem) : this._getChestText(currentItem);
        text += "</div></div>";

        text += "</div>";
        return text;
    }

    /**
     * Show buildings for selected building type
     * @param {Object} select$ jQuery select
     * @param {string} type Type (loot or chests).
     * @return {void}
     * @private
     */
    _itemSelected(select$, type) {
        const selectedItemId = Number(select$.find(":selected").val());

        // Remove old recipe list
        d3Select(`#${this._baseId} div`).remove();

        // Add new recipe list
        d3Select(`#${this._baseId}`)
            .append("div")
            .classed("buildings mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(selectedItemId, type));
    }
}
