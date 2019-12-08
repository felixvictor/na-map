/* eslint-disable no-irregular-whitespace */
/**
 * This file is part of na-map.
 *
 * @file      List loot and chests.
 * @module    game-tools/list-loot
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";

import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";

import { registerEvent } from "../analytics";
import { insertBaseModalHTML } from "../common";
import { formatInt, putImportError } from "../util";

export default class ListLoot {
    constructor() {
        this._baseName = "List loot and chests";
        this._baseId = "loot-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._modal$ = null;

        this._types = ["loot", "chests", "items"];
        this._select$ = {};
        this._selectId = {};
        this._types.forEach(type => {
            this._selectId[type] = `${this._baseId}-${type}-select`;
        });
        this._selectedType = "";

        this._setupListener();
    }

    async _loadAndSetupData() {
        try {
            this._sourceData = (await import(/* webpackChunkName: "data-loot" */ "../../gen/loot.json")).default;
        } catch (error) {
            putImportError(error);
        }
    }

    _setupListener() {
        let firstClick = true;

        document.getElementById(this._buttonId).addEventListener("click", async event => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }

            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._sourceListSelected();
        });
    }

    _getOptions(type) {
        if (type !== "items") {
            /* eslint-disable indent */
            return html`
                ${repeat(
                    this._sourceData[type],
                    item => item.id,
                    item =>
                        html`
                            <option value="${item.id}">${item.name}</option>
                        `
                )}
            `;
        }

        const items = new Map();
        this._types
            .filter(type => type !== "items")
            .forEach(type => {
                this._sourceData[type].forEach(source => {
                    source.items.forEach(item => {
                        const sourceDetail = new Map([
                            [source.id, { id: source.id, name: source.name, chance: item.chance, amount: item.amount }]
                        ]);

                        items.set(item.id, {
                            name: item.name,
                            sources: items.has(item.id)
                                ? new Map([...items.get(item.id).sources, ...sourceDetail])
                                : sourceDetail
                        });
                    });
                });
            });

        // Sort by name
        this._items = new Map(
            [...items.entries()].sort((a, b) => {
                if (a[1].name < b[1].name) {
                    return -1;
                }

                if (a[1].name > b[1].name) {
                    return 1;
                }

                return 0;
            })
        );

        /* eslint-disable indent */
        return html`
            ${repeat(
                this._items,
                (value, key) => key,
                value => {
                    return html`
                        <option value="${value[0]}">${value[1].name}</option>
                    `;
                }
            )};
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

    _getModalFooter() {
        return html`
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                Close
            </button>
        `;
    }

    _injectModal() {
        render(
            insertBaseModalHTML({
                id: this._modalId,
                title: this._baseName,
                size: "md",
                body: this._getModalBody.bind(this),
                footer: this._getModalFooter
            }),
            document.getElementById("modal-section")
        );
    }

    _setupSelectListeners() {
        this._types.forEach(type => {
            this._select$[type]
                .on("change", () => {
                    this._selectedType = type;
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

    _sourceListSelected() {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal();
            this._modal$ = $(`#${this._modalId}`);
        }

        // Show modal
        this._modal$.modal("show");
    }

    _getItemData(selectedItemId) {
        return this._sourceData[this._selectedType].find(item => item.id === selectedItemId);
    }

    _getItemsText(items) {
        const getAmount = amount =>
            amount.min === amount.max ? formatInt(amount.min) : `${formatInt(amount.min)} to ${formatInt(amount.max)}`;

        const getChance = chance => formatInt((1 - chance) * 100);

        return html`
            <table class="table table-sm small">
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col" class="text-right">Chance (0 − 100)</th>
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
                                    <td class="text-right">
                                        ${getChance(item.chance)}
                                    </td>
                                    <td class="text-right">
                                        ${getAmount(item.amount)}
                                    </td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `;
    }

    _getLootText(currentItem) {
        return html`
            ${this._getItemsText(currentItem.items)}
        `;
    }

    _getChestText(currentItem) {
        return html`
            <p>Weight ${formatInt(currentItem.weight)} tons<br />Lifetime ${formatInt(currentItem.lifetime)} hours</p>
            ${this._getItemsText(currentItem.items)}
        `;
    }

    _getSourceText() {
        const items = [...this._items.get(this._selectedItemId).sources].map(value => value[1]);

        return html`
            ${this._getItemsText(items)}
        `;
    }

    _resetOtherSelects() {
        this._types
            .filter(type => type !== this._selectedType)
            .forEach(type => {
                this._select$[type].val("default").selectpicker("refresh");
            });
    }

    _getText() {
        if (this._selectedType === "items") {
            return this._getSourceText();
        }

        const currentItem = this._getItemData(this._selectedItemId);

        return this._selectedType === "loot" ? this._getLootText(currentItem) : this._getChestText(currentItem);
    }

    /**
     * Construct item table
     * @return {string} html string
     * @private
     */
    _getTable() {
        return html`
            <div class="modules mt-4">
                ${this._getText()}
            </div>
        `;
    }

    /**
     * Show items for selected loot or chest
     * @return {void}
     * @private
     */
    _itemSelected() {
        const currentItem$ = this._select$[this._selectedType].find(":selected");
        this._selectedItemId = Number(currentItem$.val());

        this._resetOtherSelects();

        // Add new list
        render(this._getTable(), this._mainDiv);
    }
}
