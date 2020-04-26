/*!
 * This file is part of na-map.
 *
 * @file      List woods.
 * @module    game-tools/list-woods
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { select as d3Select } from "d3-selection";
import Tablesort from "tablesort";
import { registerEvent } from "../analytics";
import { putImportError } from "../../common/common";
import { initTablesort, insertBaseModal } from "../../common/common-browser";
import { formatFloatFixed } from "../../common/common-format";
import { simpleStringSort } from "../../common/common-node";
export default class ListWoods {
    constructor() {
        this._woodData = {};
        this._baseName = "List woods";
        this._baseId = "wood-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._woodData = (await import("Lib/gen-generic/woods.json"))
                .default;
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupListener() {
        var _a;
        let firstClick = true;
        (_a = document.querySelector(`#${this._buttonId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._woodListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("h5").text("Frames");
        body.append("div").attr("id", "frame-list").attr("class", "modules");
        body.append("h5").text("Trims");
        body.append("div").attr("id", "trim-list").attr("class", "modules");
    }
    _initModal() {
        initTablesort();
        this._injectModal();
        this._injectList("frame");
        this._injectList("trim");
    }
    _woodListSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _injectList(type) {
        $(`#${type}-list`).append(this._getList(type));
        const table = document.querySelector(`#table-${type}-list`);
        const sortTable = new Tablesort(table);
    }
    _getModifiers(type) {
        const modifiers = new Set();
        this._woodData[type].forEach((wood) => {
            wood.properties.forEach((property) => {
                if (property.modifier !== "Ship material" && property.modifier !== "Boarding morale") {
                    modifiers.add(property.modifier);
                }
            });
        });
        return [...modifiers].sort(simpleStringSort);
    }
    _getList(type) {
        const modifiers = this._getModifiers(type);
        let text = "";
        text += `<table id="table-${type}-list" class="table table-sm small tablesort"><thead><tr><th data-sort-default>Wood</th>`;
        modifiers.forEach((modifier) => {
            text += `<th class="text-right">${modifier}</th>`;
        });
        text += "</tr></thead><tbody>";
        this._woodData[type].forEach((wood) => {
            text += `<tr><td>${wood.name}</td>`;
            modifiers.forEach((modifier) => {
                const amount = wood.properties
                    .filter((property) => property.modifier === modifier)
                    .map((property) => property.amount)[0];
                text += `<td class="text-right" data-sort="${amount !== null && amount !== void 0 ? amount : 0}">${amount ? formatFloatFixed(amount) : ""}</td>`;
            });
            text += "</tr>";
        });
        text += "</tbody></table>";
        return text;
    }
}
//# sourceMappingURL=list-woods.js.map