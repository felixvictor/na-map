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
import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";

import { formatInt } from "../util";
import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";

export default class ListLoot {
    constructor(lootData) {
        this._lootData = lootData;

        this._baseName = "List loot and chests";
        this._baseId = "loot-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._types = ["loot", "chests", "items"];
        this._select$ = {};
        this._selectId = {};
        this._types.forEach(type => {
            this._selectId[type] = `${this._baseId}-${type}-select`;
        });
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

    _getOptions(type) {
        if (type !== "items") {
            /* eslint-disable indent */
            return html`
                ${repeat(
                    this._lootData[type],
                    item => item.id,
                    item =>
                        html`
                            <option value="${item.id}">${item.name}</option>
                        `
                )}
            `;
        }

        return html`
            <option value="1">hallo</option>
        `;
    }

    _getModalBody() {
        return html`
            ${repeat(
                this._types,
                type => type,
                type =>
                    html`
                        <label>
                            <select id="${this._selectId[type]}" class="selectpicker">
                                ${this._getOptions(type)}
                            </select>
                        </label>
                    `
            )}
            <div id="${this._baseId}"></div>
        `;
    }

    _insertBaseModal(id, title, size = "xl", buttonText = "Close") {
        const modalSize = size === "xl" || size === "lg" || size === "sm" ? ` modal-${size}` : "";

        return html`
            <div id="${id}" class="modal" tabindex="-1" role="dialog" aria-labelledby="title-${id}" aria-hidden="true">
                <div class="modal-dialog${modalSize}" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 id="title-${id}" class="modal-title">${title}</h5>
                        </div>
                        <div class="modal-body">${this._getModalBody()}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">${buttonText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _injectModal() {
        render(this._insertBaseModal(this._modalId, this._baseName, "md"), document.getElementById("modal-section"));
    }

    _setupSelectListeners() {
        this._types.forEach(type => {
            this._select$[type]
                .on("change", () => {
                    this._type = type;
                    this._itemSelected();
                })
                .selectpicker({
                    dropupAuto: false,
                    liveSearch: true,
                    liveSearchNormalize: true,
                    liveSearchPlaceholder: "Search ...",
                    title: `Select ${type}`,
                    virtualScroll: true
                });
        });
    }

    _initModal() {
        this._injectModal();
        this._mainDiv = document.getElementById(this._baseId);
        this._types.forEach(type => {
            this._select$[type] = $(`#${this._selectId[type]}`);
        });
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

    _getItemsText(items, itemProbability = []) {
        const getAmount = amount =>
            amount.min === amount.max ? formatInt(amount.min) : `${formatInt(amount.min)} to ${formatInt(amount.max)}`;

        const getChance = chance =>
            itemProbability.length ? formatInt((1 - itemProbability[chance]) * 100) : formatInt((1 - chance) * 100);

        return html`
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col" class="text-right">Chance (%)</th>
                        <th scope="col" class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${/* eslint-disable indent */
                    repeat(
                        items,
                        item => item.id,
                        item =>
                            html`
                                <tr>
                                    <td>${item.name}</td>
                                    <td class="text-right">${getChance(item.chance)}</td>
                                    <td class="text-right">${getAmount(item.amount)}</td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `;
    }

    _getLootText(currentItem) {
        return html`
            ${this._getItemsText(currentItem.items, currentItem.itemProbability)}
        `;
    }

    _getChestText(currentItem) {
        return html`
            <p>Weight ${formatInt(currentItem.weight)} tons<br />Lifetime ${formatInt(currentItem.lifetime)} hours</p>
            ${this._getItemsText(currentItem.items)}
        `;
    }

    _resetOtherSelects() {
        this._types
            .filter(type => type !== this._type)
            .forEach(type => {
                this._select$[type].val("default").selectpicker("refresh");
            });
    }

    /**
     * Construct item table
     * @param {string} selectedItemId Id of selected item.
     * @return {string} html string
     * @private
     */
    _getTable(selectedItemId) {
        const currentItem = this._getItemData(selectedItemId);

        return html`
            <div class="modules mt-4">
                ${this._type === "loot" ? this._getLootText(currentItem) : this._getChestText(currentItem)}
            </div>
        `;
    }

    /**
     * Show items for selected loot or chest
     * @return {void}
     * @private
     */
    _itemSelected() {
        const selectedItemId = Number(this._select$[this._type].find(":selected").val());

        this._resetOtherSelects();

        // Add new list
        render(this._getTable(selectedItemId), this._mainDiv);
    }
}
