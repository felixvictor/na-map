/**
 * This file is part of na-map.
 *
 * @file      List loot and chests.
 * @module    game-tools/list-loot
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";

import { formatInt, simpleSort } from "../util";
import { registerEvent } from "../analytics";

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

        let items = new Map();
        this._types
            .filter(type => type !== "items")
            .forEach(type => {
                this._lootData[type].forEach(loot => {
                    loot.items.forEach(item => {
                        let sourceIds = {};
                        if (items.has(item.id)) {
                            sourceIds = new Set([...items.get(item.id).sourceIds, loot.id]);
                        } else {
                            sourceIds = new Set([loot.id]);
                        }

                        items.set(item.id, { name: item.name, sourceIds });
                    });
                });
            });

        // Sort by name
        items = new Map(
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
                items,
                (value, key) => key,
                (value, key) => {
                    return html`
                        <option data-ids="${[...value[1].sourceIds].join(",")}" value="${key}">${value[1].name}</option>
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

    _insertBaseModal(id, title, size = "xl", buttonText = "Close") {
        const modalSize = size === "xl" || size === "lg" || size === "sm" ? ` modal-${size}` : "";

        return html`
            <div id="${id}" class="modal" tabindex="-1" role="dialog" aria-labelledby="title-${id}" aria-hidden="true">
                <div class="modal-dialog${modalSize}" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 id="title-${id}" class="modal-title">
                                ${title}
                            </h5>
                        </div>
                        <div class="modal-body">${this._getModalBody()}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                                ${buttonText}
                            </button>
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
            ${this._getItemsText(currentItem.items, currentItem.itemProbability)}
        `;
    }

    _getChestText(currentItem) {
        return html`
            <p>Weight ${formatInt(currentItem.weight)} tons<br />Lifetime ${formatInt(currentItem.lifetime)} hours</p>
            ${this._getItemsText(currentItem.items)}
        `;
    }

    _getSourceText() {
        const getSources = () =>
            this._types
                .filter(type => type !== "items")
                .map(type =>
                    this._lootData[type]
                        .filter(source => this._sourceIds.includes(source.id))
                        .map(source => ({ id: source.id, name: source.name }))
                )
                .flat();

        const sources = getSources();

        return html`
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th scope="col">Source</th>
                    </tr>
                </thead>
                <tbody>
                    ${/* eslint-disable indent */
                    repeat(
                        sources,
                        source => source.id,
                        source =>
                            html`
                                <tr>
                                    <td>${source.name}</td>
                                </tr>
                            `
                    )}
                </tbody>
            </table>
        `;
    }

    _resetOtherSelects() {
        this._types
            .filter(type => type !== this._type)
            .forEach(type => {
                this._select$[type].val("default").selectpicker("refresh");
            });
    }

    _getText(currentItem) {
        if (this._type === "items") {
            return this._getSourceText();
        }

        return this._type === "loot" ? this._getLootText(currentItem) : this._getChestText(currentItem);
    }

    /**
     * Construct item table
     * @param {string} selectedItemId Id of selected item.
     * @return {string} html string
     * @private
     */
    _getTable(selectedItemId) {
        const currentItem = this._type === "items" ? {} : this._getItemData(selectedItemId);

        return html`
            <div class="modules mt-4">
                ${this._getText(currentItem)}
            </div>
        `;
    }

    /**
     * Show items for selected loot or chest
     * @return {void}
     * @private
     */
    _itemSelected() {
        const currentItem$ = this._select$[this._type].find(":selected");
        const selectedItemId = Number(currentItem$.val());
        this._sourceIds =
            this._type === "items"
                ? currentItem$
                      .data("ids")
                      .split(",")
                      .map(Number)
                : [];

        this._resetOtherSelects();

        // Add new list
        render(this._getTable(selectedItemId), this._mainDiv);
    }
}
