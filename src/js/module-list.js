/*
    module-list.js
 */

/* global d3 : false
 */

import { capitalizeFirstLetter, formatSignPercent, getOrdinal } from "./util";

export default class Module {
    constructor(moduleData) {
        this._moduleData = moduleData;

        this._setupData();
        this._setupListener();
        this._setupSelect();
    }

    _setupData() {
        this._options = `${this._moduleData.map(type => `<option value="${type[0]}"">${type[0]}</option>;`).join("")}`;
    }

    _setupListener() {
        $("#button-module-list").on("click", event => {
            event.stopPropagation();
            this._moduleListSelected();
        });
    }

    _moduleListSelected() {
        $("#modal-modules").modal("show");
        this._div = "#modules-list";
    }

    _setupSelect() {
        const select = $("#modules-select");
        select.append(this._options);

        select
            .addClass("selectpicker")
            .on("change", event => this._moduleSelected(event))
            .selectpicker({ noneSelectedText: "Select module type" });
    }

    _getText(moduleType) {
        function getRate(module) {
            return module.moduleLevel !== "U" ? ` ${rates.get(module.moduleLevel)}` : "";
        }

        const rates = new Map([
            ["L", `${getOrdinal(1)}\u202f\u2013\u202f${getOrdinal(3)}`],
            ["M", `${getOrdinal(4)}\u202f\u2013\u202f${getOrdinal(5)}`],
            ["S", `${getOrdinal(6)}\u202f\u2013\u202f${getOrdinal(7)}`]
        ]);
        let text = '<table class="table table-sm table-striped modules small mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Module</em></th><th><em>Ship rate</em></th><th><em>Modifier</em></th></tr></thead><tbody>";

        let rate = "";
        this._moduleData.forEach(type => {
            if (type[0] === moduleType) {
                type[1].forEach((module, i) => {
                    rate = getRate(module);
                    if (
                        i + 1 < type[1].length &&
                        module.name === type[1][i + 1].name &&
                        JSON.stringify(module.properties) === JSON.stringify(type[1][i + 1].properties)
                    ) {
                        type[1][i + 1].hasSamePropertiesAsPrevious = true;
                        rate += `<br>${getRate(type[1][i + 1])}`;
                    }
                    if (
                        i + 2 < type[1].length &&
                        module.name === type[1][i + 2].name &&
                        JSON.stringify(module.properties) === JSON.stringify(type[1][i + 2].properties)
                    ) {
                        type[1][i + 2].hasSamePropertiesAsPrevious = true;
                        rate = "";
                    }
                    if (
                        typeof module.hasSamePropertiesAsPrevious === "undefined" ||
                        (typeof module.hasSamePropertiesAsPrevious !== "undefined" &&
                            !module.hasSamePropertiesAsPrevious)
                    ) {
                        text += `<tr><td>${module.name}</td><td>${rate}</td><td>${module.properties
                            .map(property => {
                                const amount = property.absolute
                                    ? property.amount
                                    : formatSignPercent(property.amount / 100);
                                return `${property.modifier} ${amount}`;
                            })
                            .join("<br>")}</td></tr>`;
                    }
                });
            }
        });
        text += "</tbody></table>";
        return text;
    }

    _moduleSelected(event) {
        const moduleType = $(event.currentTarget)
            .find(":selected")
            .val();
        d3.select(`${this._div} div`).remove();
        d3.select(this._div).append("div");
        $(this._div)
            .find("div")
            .append(this._getText(moduleType));
    }
}
