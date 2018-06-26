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
        this._moduleSelectData = d3
            .nest()
            .key(module => {
                const sortingGroup =
                    module.sortingGroup && module.type !== "Ship trim"
                        ? `\u202f\u2013\u202f${capitalizeFirstLetter(module.sortingGroup).replace("_", "/")}`
                        : "";
                return `${module.type}${sortingGroup}`;
            })
            .sortKeys(d3.ascending)
            .entries(
                this._moduleData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    if (a.moduleLevel < b.moduleLevel) {
                        return -1;
                    }
                    if (a.moduleLevel > b.moduleLevel) {
                        return 1;
                    }
                    return 0;
                })
            );

        this._options = `${this._moduleSelectData
            .map(type => `<option value="${type.key}"">${type.key}</option>`)
            .join("")}`;
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
        const rates = new Map([
            ["L", `${getOrdinal(1)}\u202f\u2013\u202f${getOrdinal(3)}`],
            ["M", `${getOrdinal(4)}\u202f\u2013\u202f${getOrdinal(5)}`],
            ["S", `${getOrdinal(6)}\u202f\u2013\u202f${getOrdinal(7)}`]
        ]);
        let text = '<table class="table table-sm table-striped modules small mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Module</em></th><th><em>Ship rate</em></th><th><em>Modifier</em></th></tr></thead><tbody>";
        this._moduleSelectData.forEach(type => {
            if (type.key === moduleType) {
                type.values.forEach(module => {
                    const rate = module.moduleLevel !== "U" ? ` ${rates.get(module.moduleLevel)}` : "";
                    text += `<tr><td>${module.name}</td><td>${rate}</td><td>${module.properties
                        .map(property => {
                            const amount = property.absolute
                                ? property.amount
                                : formatSignPercent(property.amount / 100);
                            return `${property.modifier} ${amount}`;
                        })
                        .join("<br>")}</td></tr>`;
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
