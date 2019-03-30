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
import { formatInt, formatPercent, getOrdinal } from "../util";
import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";

export default class ListLoot {
    constructor(lootData) {
        this._lootData = lootData;

        this._baseName = "List loot and chests";
        this._baseId = "loot-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._lootSelectId = `${this._baseId}-loot-select`;
        this._chestSelectId = `${this._baseId}-chest-select`;

        this._type = "";

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
        insertBaseModal(this._modalId, this._baseName, "md");

        const body = d3Select(`#${this._modalId} .modal-body`);

        [this._lootSelectId, this._chestSelectId].forEach(id => {
            body.append("label").attr("for", id);
            body.append("select")
                .attr("name", id)
                .attr("id", id)
                .attr("class", "selectpicker")
                .classed("pl-3", id === this._chestSelectId);
        });

        body.append("div").attr("id", `${this._baseId}`);
    }

    _getOptions(type) {
        return `${this._lootData[type].map(item => `<option value="${item.id}">${item.name}</option>`).join("")}`;
    }

    _setupLootSelect() {
        const options = this._getOptions("loot");

        this._lootSelect$.append(options);
    }

    _setupChestSelect() {
        const options = this._getOptions("chests");

        this._chestSelect$.append(options);
    }

    _setupSelects() {
        this._setupLootSelect();
        this._setupChestSelect();
    }

    _setupLootSelectListener() {
        this._lootSelect$
            .on("change", () => {
                this._type = "loot";
                this._select$ = this._lootSelect$;
                this._itemSelected();
            })
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
            .on("change", () => {
                this._type = "chests";
                this._select$ = this._chestSelect$;
                this._itemSelected();
            })
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

    _getItemData(selectedItemId) {
        return this._lootData[this._type].find(item => item.id === selectedItemId);
    }

    _getItemsText(items, itemProbability) {
        const getAmount = amount => {
            if (amount.min === amount.max) {
                return `${formatInt(amount.min)}`;
            }

            return `${formatInt(amount.min)} to ${formatInt(amount.max)}`;
        };

        const getChance = chance => {
            if (this._type === "chests") {
                return formatInt((1 - chance) * 100);
            }

            return formatInt((1 - itemProbability[chance]) * 100);
        };

        let text = "";

        text += '<table class="table table-striped table-sm"><thead>';
        text +=
            '<tr><th scope="col">Item</th><th scope="col" class="text-right">Chance (%)</th><th scope="col" class="text-right">Amount</th></tr>';
        text += "</thead><tbody>";
        text += `<tr>${items
            .map(
                item =>
                    `<td>${item.name}</td><td class="text-right">${getChance(
                        item.chance
                    )}</td><td class="text-right">${getAmount(item.amount)}</td>`
            )
            .join("</tr><tr>")}</tr>`;
        text += "</tbody></table>";

        return text;
    }

    _getLootText(currentItem) {
        let text = "";

        text += this._getItemsText(currentItem.items, currentItem.itemProbability);

        return text;
    }

    _getChestText(currentItem) {
        let text = "";

        text += `<p>Weight ${formatInt(currentItem.weight)} tons<br>Lifetime ${formatInt(
            currentItem.lifetime
        )} hours</p>`;

        text += this._getItemsText(currentItem.items);

        return text;
    }

    /**
     * Construct building tables
     * @param {string} selectedItemId Id of selected item.
     * @return {string} html string
     * @private
     */
    _getText(selectedItemId) {
        const currentItem = this._getItemData(selectedItemId);

        const text = this._type === "loot" ? this._getLootText(currentItem) : this._getChestText(currentItem);

        return text;
    }

    _resetOtherSelect() {
        const otherSelect$ = this._type === "loot" ? this._chestSelect$ : this._lootSelect$;

        otherSelect$.val("default").selectpicker("refresh");
    }

    /**
     * Show buildings for selected building type
     * @return {void}
     * @private
     */
    _itemSelected() {
        const selectedItemId = Number(this._select$.find(":selected").val());

        this._resetOtherSelect();

        // Remove old list
        d3Select(`#${this._baseId} div`).remove();

        // Add new list
        d3Select(`#${this._baseId}`)
            .append("div")
            .attr("class", "mt-4")
            .html(this._getText(selectedItemId));
    }
}
