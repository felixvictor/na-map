/*!
 * This file is part of na-map.
 *
 * @file      List cannons.
 * @module    game-tools/list-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/tab";
import "bootstrap/js/dist/modal";
import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";
import { registerEvent } from "../analytics";
import { cannonType, capitalizeFirstLetter, putImportError } from "../../common/common";
import { initTablesort, insertBaseModalHTML } from "../../common/common-browser";
import { formatFloatFixedHTML } from "../../common/common-format";
export default class ListCannons {
    constructor() {
        this._cannonData = {};
        this._groups = new Map();
        this._baseName = "List cannons";
        this._baseId = "cannon-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            const cannonData = (await import("Lib/gen-generic/cannons.json"))
                .default;
            this._setupData(cannonData);
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupData(cannonData) {
        for (const group of cannonData.long) {
            for (const [key, value] of Object.entries(group)) {
                if (key !== "name") {
                    this._groups.set(key, { values: value, count: Object.entries(value).length });
                }
            }
        }
        const groupOrder = ["name", "damage", "penetration", "dispersion", "traverse", "generic"];
        for (const type of cannonType) {
            this._cannonData[type] = cannonData[type].map((cannon) => Object.keys(cannon)
                .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
                .reduce((r, k) => ((r[k] = cannon[k]), r), {}));
        }
        this._groups = new Map([...this._groups.entries()].sort((a, b) => groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0])));
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
            this._cannonListSelected();
        });
    }
    _getList(type) {
        const getColumnGroupHeads = (groupValue) => html `
            <th scope="col" class="text-center" colspan="${groupValue[1].count}">
                ${capitalizeFirstLetter(groupValue[0])}
            </th>
        `;
        const getColumnHeads = (groupValue) => html `
            ${Object.entries(groupValue[1].values).map((modifierValue) => html `<th class="text-right">${capitalizeFirstLetter(modifierValue[0])}</th>`)}
        `;
        const getRowHead = (name) => {
            let nameConverted = name;
            const nameSplit = name.split(" (");
            if (nameSplit.length > 1) {
                nameConverted = html `${nameSplit[0]}<br /><em>${nameSplit[1].replace(")", "")}</em>`;
            }
            return html `
                <th scope="row" class="text-right" data-sort="${Number.parseInt(name, 10)}">
                    ${nameConverted}
                </th>
            `;
        };
        const getRow = (cannon) => html `
            ${Object.entries(cannon).map((groupValue) => {
            if (groupValue[0] === "name") {
                return html ``;
            }
            return Object.entries(groupValue[1]).map((modifierValue) => {
                var _a;
                return html `
                            <td class="text-right" data-sort="${(_a = modifierValue[1].value) !== null && _a !== void 0 ? _a : 0}">
                                ${modifierValue[1]
                    ? formatFloatFixedHTML(modifierValue[1].value, modifierValue[1].digits)
                    : ""}
                            </td>
                        `;
            });
        })}
        `;
        return html `
            <table id="table-${type}-list" class="table table-sm small tablesort">
                <thead>
                    <tr>
                        <th scope="col" class="border-bottom-0"></th>
                        ${repeat(this._groups, (groupValue, groupKey) => groupKey, (groupValue) => getColumnGroupHeads(groupValue))}
                    </tr>
                    <tr data-sort-method="thead">
                        <th scope="col" class="text-right border-top-0" data-sort-default>Lb</th>
                        ${repeat(this._groups, (groupValue, groupKey) => groupKey, (groupValue) => getColumnHeads(groupValue))}
                    </tr>
                </thead>
                <tbody>
                    ${repeat(this._cannonData[type], (cannon) => cannon.name, (cannon) => {
            return html `
                                <tr>
                                    ${getRowHead(cannon.name)}${getRow(cannon)}
                                </tr>
                            `;
        })}
                </tbody>
            </table>
        `;
    }
    _getModalBody() {
        return html `
            <ul class="nav nav-pills" role="tablist">
                ${repeat(Object.keys(this._cannonData), (type) => type, (type, index) => html `
                            <li class="nav-item">
                                <a
                                    class="nav-link${index === 0 ? " active" : ""}"
                                    id="tab-${this._baseId}-${type}"
                                    data-toggle="tab"
                                    href="#tab-content-${this._baseId}-${type}"
                                    role="tab"
                                    aria-controls="home"
                                    aria-selected="true"
                                    >${capitalizeFirstLetter(type)}</a
                                >
                            </li>
                        `)}
            </ul>
            <div class="tab-content pt-2">
                ${repeat(Object.keys(this._cannonData), (type) => type, (type, index) => html `
                            <div
                                class="tab-pane fade${index === 0 ? " show active" : ""}"
                                id="tab-content-${this._baseId}-${type}"
                                role="tabpanel"
                                aria-labelledby="tab-${this._baseId}-${type}"
                            >
                                <div id="${type}-list" class="modules">
                                    ${this._getList(type)}
                                </div>
                            </div>
                        `)}
            </div>
        `;
    }
    _getModalFooter() {
        return html `
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
                Close
            </button>
        `;
    }
    _injectModal() {
        render(insertBaseModalHTML({
            id: this._modalId,
            title: this._baseName,
            body: this._getModalBody.bind(this),
            footer: this._getModalFooter,
        }), document.querySelector("#modal-section"));
    }
    _initModal() {
        initTablesort();
        this._injectModal();
    }
    _cannonListSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
}
//# sourceMappingURL=list-cannons.js.map