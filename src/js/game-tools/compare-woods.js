/**
 * This file is part of na-map.
 *
 * @file      Compare woods.
 * @module    game-tools/compare-woods
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { min as d3Min, max as d3Max } from "d3-array";
import { select as d3Select } from "d3-selection";
import { formatFloat } from "../util";
import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";

class Wood {
    constructor(compareId, woodCompare) {
        this._id = compareId;
        this._woodCompare = woodCompare;
        this._select = `#${this._woodCompare._baseFunction}-${this._id}`;

        this._setupMainDiv();
        this._g = d3Select(this._select).select("g");
    }

    _setupMainDiv() {
        d3Select(`${this._select} div`).remove();
        d3Select(this._select).append("div");
    }
}

class WoodBase extends Wood {
    constructor(compareId, woodData, woodCompare) {
        super(compareId, woodCompare);

        this._woodData = woodData;
        this._woodCompare = woodCompare;

        this._printText();
    }

    _getProperty(property, type) {
        const amount = this._woodData[type].properties
            .filter(prop => prop.modifier === property)
            .map(prop => prop.amount)[0];
        return typeof amount === "undefined" ? 0 : amount / 100;
    }

    _getPropertySum(property) {
        return this._getProperty(property, "frame") + this._getProperty(property, "trim");
    }

    _getText(wood) {
        const middle = 100 / 2;
        let text = '<table class="table table-sm table-striped small mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Property</em></th><th><em>Change in %</em></th></tr></thead><tbody>";
        wood.properties.forEach((value, key) => {
            text += `<tr><td>${key}</td><td>${formatFloat(value * 100)}`;
            text += '<span class="rate">';
            if (value > 0) {
                const right = (value / this._woodCompare._minMaxProperty.get(key).max) * 100 * middle;
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`;
            } else if (value < 0) {
                const right = (value / this._woodCompare._minMaxProperty.get(key).min) * 100 * middle,
                    left = middle - right;
                text += `<span class="bar neutral" style="width:${left}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${right}%;"></span>`;
            } else {
                text += '<span class="bar neutral"></span>';
            }
            text += "</span></td></tr>";
            /*
            console.log(
                key,
                value,
                this.woodCompare.minMaxProperty.get(key).min,
                this.woodCompare.minMaxProperty.get(key).max
            );
            */
        });
        text += "</tbody></table>";
        return text;
    }

    _printText() {
        const wood = {
            frame: this._woodData.frame.name,
            trim: this._woodData.trim.name
        };
        wood.properties = new Map();
        this._woodCompare._properties.forEach(property => {
            wood.properties.set(property, this._getPropertySum(property));
        });

        $(`${this._select}`)
            .find("div")
            .append(this._getText(wood));
    }
}

class WoodComparison extends Wood {
    constructor(compareId, baseData, compareData, woodCompare) {
        super(compareId, woodCompare);

        this._baseData = baseData;
        this._compareData = compareData;
        this._woodCompare = woodCompare;

        this._printTextComparison();
    }

    _getBaseProperty(property, type) {
        const amount = this._baseData[type].properties
            .filter(prop => prop.modifier === property)
            .map(prop => prop.amount)[0];
        return typeof amount === "undefined" ? 0 : amount / 100;
    }

    _getBasePropertySum(property) {
        return this._getBaseProperty(property, "frame") + this._getBaseProperty(property, "trim");
    }

    _getCompareProperty(property, type) {
        const amount = this._compareData[type].properties
            .filter(prop => prop.modifier === property)
            .map(prop => prop.amount)[0];
        return typeof amount === "undefined" ? 0 : amount / 100;
    }

    _getComparePropertySum(property) {
        return this._getCompareProperty(property, "frame") + this._getCompareProperty(property, "trim");
    }

    _getText(wood) {
        function getDiff(a, b, decimals = 1) {
            const diff = parseFloat(((a - b) * 100).toFixed(decimals));
            if (diff < 0) {
                return `${formatFloat(a * 100)} <span class="badge badge-white">${formatFloat(diff)}</span>`;
            }
            if (diff > 0) {
                return `${formatFloat(a * 100)} <span class="badge badge-white">+\u202f${formatFloat(diff)}</span>`;
            }
            return formatFloat(a * 100);
        }

        const middle = 100 / 2;
        let base = 0,
            diff = 0,
            neutral = 0,
            diffColour = "";
        let text = '<table class="table table-sm table-striped small wood mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Property</em></th><th><em>Change in %</em></th></tr></thead><tbody>";
        wood.properties.forEach((value, key) => {
            text += `<tr><td>${key}</td><td>${getDiff(value.compare, value.base)}`;
            text += '<span class="rate">';
            if (value.compare >= 0) {
                if (value.base >= 0) {
                    if (value.compare > value.base) {
                        // eslint-disable-next-line prefer-destructuring
                        base = value.base;
                        diff = value.compare - value.base;
                        diffColour = "pos";
                    } else {
                        base = value.compare;
                        diff = value.base - value.compare;
                        diffColour = "neg";
                    }
                } else {
                    base = 0;
                    diff = value.compare;
                    diffColour = "pos";
                }
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${(base /
                    this._woodCompare._minMaxProperty.get(key).max) *
                    100 *
                    middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this._woodCompare._minMaxProperty.get(key).max) *
                    100 *
                    middle}%;"></span>`;
            } else if (value.compare < 0) {
                if (value.base < 0) {
                    if (value.compare >= value.base) {
                        base = value.compare;
                        diff = value.base - value.compare;
                        neutral = -value.base;
                        diffColour = "pos";
                    } else {
                        // eslint-disable-next-line prefer-destructuring
                        base = value.base;
                        diff = value.compare - value.base;
                        neutral = -value.compare;
                        diffColour = "neg";
                    }
                } else {
                    base = 0;
                    diff = value.compare;
                    neutral = -value.compare;
                    diffColour = "neg";
                }
                text += `<span class="bar neutral" style="width:${middle +
                    (neutral / this._woodCompare._minMaxProperty.get(key).min) * 100 * middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this._woodCompare._minMaxProperty.get(key).min) *
                    100 *
                    middle}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${(base /
                    this._woodCompare._minMaxProperty.get(key).min) *
                    100 *
                    middle}%;"></span>`;
            } else {
                text += '<span class="bar neutral"></span>';
            }

            text += "</span></td></tr>";
        });
        text += "</tbody></table>";
        return text;
    }

    _printTextComparison() {
        const wood = {
            frame: this._compareData.frame.name,
            trim: this._compareData.trim.name
        };
        wood.properties = new Map();
        this._woodCompare._properties.forEach(property => {
            wood.properties.set(property, {
                base: this._getBasePropertySum(property),
                compare: this._getComparePropertySum(property)
            });
        });

        $(`${this._select}`)
            .find("div")
            .append(this._getText(wood));
    }
}

/**
 *
 */
export default class CompareWoods {
    constructor(woodData, baseFunction) {
        this._woodData = woodData;
        this._baseFunction = baseFunction;

        this._baseName = "Compare woods";
        this._baseId = `${this._baseFunction}-compare`;
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        if (this._baseFunction === "wood") {
            this._defaultWood = {
                frame: "Fir",
                trim: "Crew Space"
            };
            this._columnsCompare = ["C1", "C2", "C3"];
        } else if (this._baseFunction === "wood-journey") {
            this._defaultWood = {
                frame: "Oak",
                trim: "Oak"
            };
            this._columnsCompare = [];
        } else {
            this._defaultWood = {
                frame: "Oak",
                trim: "Oak"
            };
            this._columnsCompare = ["C1", "C2"];
        }

        this._columns = this._columnsCompare.slice();
        this._columns.unshift("Base");
        this._woodsSelected = [];
        this._instances = [];
        this._properties = [
            "Thickness",
            "Hull strength",
            "Side armour",
            "Mast thickness",
            "Ship speed",
            "Acceleration",
            "Rudder speed",
            "Turn speed",
            "Crew",
            "Crew protection",
            "Grog morale bonus",
            "Fire resistance",
            "Leak resistance"
        ];
        this._options = {};
        this._minMaxProperty = new Map();

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._woodCompareSelected();
        });
    }

    _woodCompareSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _setupData() {
        this._frameSelectData = this._woodData.frame.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        this._trimSelectData = this._woodData.trim.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        this._setOption(
            this._frameSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`),
            this._trimSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`)
        );

        this._properties.forEach(property => {
            const frames = [
                    ...this._woodData.frame.map(
                        frame =>
                            frame.properties
                                .filter(modifier => modifier.modifier === property)
                                .map(modifier => modifier.amount)[0]
                    )
                ],
                trims = [
                    ...this._woodData.trim.map(
                        trim =>
                            trim.properties
                                .filter(modifier => modifier.modifier === property)
                                .map(modifier => modifier.amount)[0]
                    )
                ];

            const minFrames = d3Min(frames) || 0,
                maxFrames = d3Max(frames) || 0,
                minTrims = d3Min(trims) || 0,
                maxTrims = d3Max(trims) || 0;
            this._addMinMaxProperty(property, {
                min: minFrames + minTrims >= 0 ? 0 : minFrames + minTrims,
                max: maxFrames + maxTrims
            });
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const row = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("class", "container-fluid")
            .append("div")
            .attr("class", "row wood");
        this._columns.forEach(column => {
            const div = row
                .append("div")
                .attr("class", `col-md-3 ml-auto pt-2 ${column === "Base" ? "columnA" : "columnC"}`);
            ["frame", "trim"].forEach(type => {
                const id = `${this._baseFunction}-${type}-${column}-select`;
                div.append("label").attr("for", id);
                div.append("select")
                    .attr("name", id)
                    .attr("id", id);
            });
            div.append("div").attr("id", `${this._baseFunction}-${column}`);
        });
    }

    _initModal() {
        this._setupData();
        this._injectModal();

        this._columns.forEach(compareId => {
            ["frame", "trim"].forEach(type => {
                const select$ = $(`#${this._baseFunction}-${type}-${compareId}-select`);
                this._setupWoodSelects(compareId, type, select$);
                this._setupSelectListener(compareId, type, select$);
            });
        });
    }

    _setWoodsSelected(compareId, type, woodName) {
        if (typeof this._woodsSelected[compareId] === "undefined") {
            this._woodsSelected[compareId] = {};
        }
        this._woodsSelected[compareId][type] = woodName;
    }

    _setupWoodSelects(compareId, type, select$) {
        this._setWoodsSelected(compareId, type, this._defaultWood[type]);
        select$.append(this._options[type]);
        if (this._baseFunction !== "wood" || (compareId !== "Base" && this._baseFunction === "wood")) {
            select$.attr("disabled", "disabled");
        }
    }

    _setOtherSelect(id, type) {
        const otherType = type === "frame" ? "trim" : "frame";
        if (this._getWoodSelected(id)[otherType] === this._defaultWood[otherType]) {
            $(`#${this._baseFunction}-${otherType}-${id}-select`)
                .val(this._defaultWood[otherType])
                .selectpicker("refresh");
        }
    }

    enableSelects(id) {
        ["frame", "trim"].forEach(type => {
            $(`#${this._baseFunction}-${type}-${id}-select`)
                .removeAttr("disabled")
                .selectpicker("refresh");
        });
    }

    _woodSelected(compareId, type, select$) {
        const woodName = select$.val();

        this._setWoodsSelected(compareId, type, woodName);
        this._setOtherSelect(compareId, type);

        if (compareId === "Base") {
            this._addInstance(compareId, new WoodBase("Base", this._getWoodData("Base"), this));

            this._columnsCompare.forEach(id => {
                // For wood-compare: add instances with enabling selects
                // For ship-compare: add instances without enabling selects
                if (this._baseFunction === "wood") {
                    this.enableSelects(id);
                }
                if (typeof this._instances[id] !== "undefined") {
                    this._addInstance(
                        id,
                        new WoodComparison(id, this._getWoodData("Base"), this._getWoodData(id), this)
                    );
                }
            });
        } else {
            this._addInstance(
                compareId,
                new WoodComparison(compareId, this._getWoodData("Base"), this._getWoodData(compareId), this)
            );
        }
    }

    _setupSelectListener(compareId, type, select$) {
        select$
            .addClass("selectpicker")
            .on("change", () => this._woodSelected(compareId, type, select$))
            .selectpicker({ noneSelectedText: `Select ${type}` })
            .val("default")
            .selectpicker("refresh");
    }

    _getWoodTypeData(type, name) {
        return this._woodData[type].filter(wood => wood.name === name)[0];
    }

    _getWoodData(id) {
        return {
            frame: this._getWoodTypeData("frame", this._getWoodSelected(id).frame),
            trim: this._getWoodTypeData("trim", this._getWoodSelected(id).trim)
        };
    }

    _getWoodSelected(id) {
        return this._woodsSelected[id];
    }

    _addMinMaxProperty(property, minMax) {
        this._minMaxProperty.set(property, minMax);
    }

    _setOption(frame, trim) {
        this._options.frame = frame;
        this._options.trim = trim;
    }

    _addInstance(id, woodInstance) {
        this._instances[id] = woodInstance;
    }
}
