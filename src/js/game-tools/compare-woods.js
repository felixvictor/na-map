/**
 * This file is part of na-map.
 *
 * @file      Compare woods.
 * @module    game-tools/compare-woods
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { min as d3Min, max as d3Max } from "d3-array";
import { select as d3Select } from "d3-selection";

import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";
import { formatFloat, formatSignFloat, formatPercent, sortBy, putImportError } from "../util";

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

    _getProperty(propertyName, type) {
        const property = this._woodData[type].properties.find(prop => prop.modifier === propertyName);
        let amount = 0;
        let isPercentage = false;

        if (property && property.amount) {
            // eslint-disable-next-line prefer-destructuring
            amount = property.amount;
            // eslint-disable-next-line prefer-destructuring
            isPercentage = property.isPercentage;
        }

        return { amount, isPercentage };
    }

    _getPropertySum(propertyName) {
        const propertyFrame = this._getProperty(propertyName, "frame");
        const propertyTrim = this._getProperty(propertyName, "trim");

        return {
            amount: propertyFrame.amount + propertyTrim.amount,
            isPercentage: propertyTrim.isPercentage
        };
    }

    _getText(wood) {
        const middle = 100 / 2;
        let text = '<table class="table table-sm table-striped small mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Property</em></th><th><em>Change</em></th></tr></thead><tbody>";
        wood.properties.forEach((value, key) => {
            text += `<tr><td>${key}</td><td>${
                value.isPercentage ? formatPercent(value.amount / 100) : formatFloat(value.amount)
            }`;
            text += '<span class="rate">';
            if (value.amount > 0) {
                const right = (value.amount / this._woodCompare._minMaxProperty.get(key).max) * middle;
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`;
            } else if (value.amount < 0) {
                const right = (value.amount / this._woodCompare._minMaxProperty.get(key).min) * middle;
                const left = middle - right;
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
            frame: this._woodData.frame.id,
            trim: this._woodData.trim.id
        };
        wood.properties = new Map();
        this._woodCompare.propertyNames.forEach(propertyName => {
            const property = this._getPropertySum(propertyName);
            wood.properties.set(propertyName, {
                amount: property.amount,
                isPercentage: property.isPercentage
            });
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

    _getBaseProperty(propertyName, type) {
        const property = this._baseData[type].properties.find(prop => prop.modifier === propertyName);
        let amount = 0;
        let isPercentage = false;

        if (property && property.amount) {
            // eslint-disable-next-line prefer-destructuring
            amount = property.amount;
            // eslint-disable-next-line prefer-destructuring
            isPercentage = property.isPercentage;
        }

        return { amount, isPercentage };
    }

    _getBasePropertySum(propertyName) {
        const basePropertyFrame = this._getBaseProperty(propertyName, "frame");
        const basePropertyTrim = this._getBaseProperty(propertyName, "trim");

        return {
            amount: basePropertyFrame.amount + basePropertyTrim.amount,
            isPercentage: basePropertyTrim.isPercentage
        };
    }

    _getCompareProperty(propertyName, type) {
        const property = this._compareData[type].properties.find(prop => prop.modifier === propertyName);
        let amount = 0;
        let isPercentage = false;

        if (property && property.amount) {
            // eslint-disable-next-line prefer-destructuring
            amount = property.amount;
            // eslint-disable-next-line prefer-destructuring
            isPercentage = property.isPercentage;
        }

        return { amount, isPercentage };
    }

    _getComparePropertySum(propertyName) {
        const comparePropertyFrame = this._getCompareProperty(propertyName, "frame");
        const comparePropertyTrim = this._getCompareProperty(propertyName, "trim");

        return {
            amount: comparePropertyFrame.amount + comparePropertyTrim.amount,
            isPercentage: comparePropertyFrame.isPercentage && comparePropertyTrim.isPercentage
        };
    }

    _getText(wood) {
        function getDiff(a, b, isPercentage, decimals = 1) {
            const diff = parseFloat((a - b).toFixed(decimals));
            const value = isPercentage ? formatPercent(a / 100, decimals) : formatFloat(a);

            return `${value} <span class="badge badge-white">${formatSignFloat(diff)}</span>`;
        }

        const middle = 100 / 2;
        let base = 0;
        let diff = 0;
        let neutral = 0;
        let diffColour = "";
        let text = '<table class="table table-sm table-striped small wood mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Property</em></th><th><em>Change</em></th></tr></thead><tbody>";
        wood.properties.forEach((value, key) => {
            text += `<tr><td>${key}</td><td>${getDiff(value.compare, value.base, value.isPercentage)}`;
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
                    middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this._woodCompare._minMaxProperty.get(key).max) *
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
                    (neutral / this._woodCompare._minMaxProperty.get(key).min) * middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this._woodCompare._minMaxProperty.get(key).min) *
                    middle}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${(base /
                    this._woodCompare._minMaxProperty.get(key).min) *
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
        this._woodCompare.propertyNames.forEach(propertyName => {
            const basePropertySum = this._getBasePropertySum(propertyName);
            const comparePropertySum = this._getComparePropertySum(propertyName);
            wood.properties.set(propertyName, {
                base: basePropertySum.amount,
                compare: comparePropertySum.amount,
                isPercentage: basePropertySum.isPercentage
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
    constructor(baseFunction) {
        this._baseFunction = baseFunction;
        this._baseName = "Compare woods";
        this._baseId = `${this._baseFunction}-compare`;
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._woodsSelected = [];
        this._instances = [];

        this._options = {};
        this._minMaxProperty = new Map();

        if (this._baseFunction === "wood") {
            this._setupListener();
        }
    }

    async woodInit() {
        await this._loadAndSetupData();
        this._initData();
    }

    _setupData() {
        const findWoodId = (type, woodName) => this._woodData[type].find(wood => wood.name === woodName).id;

        this.propertyNames = new Set(
            [
                ...this._woodData.frame.flatMap(frame => frame.properties.map(property => property.modifier)),
                ...this._woodData.trim.flatMap(trim => trim.properties.map(property => property.modifier))
            ].sort()
        );

        if (this._baseFunction === "wood") {
            this._defaultWood = {
                frame: findWoodId("frame", "Fir"),
                trim: findWoodId("trim", "Crew Space")
            };
            this._columnsCompare = ["C1", "C2", "C3"];
        } else if (this._baseFunction === "wood-journey") {
            this._defaultWood = {
                frame: findWoodId("frame", "Oak"),
                trim: findWoodId("trim", "Oak")
            };
            this._columnsCompare = [];
        } else {
            this._defaultWood = {
                frame: findWoodId("frame", "Oak"),
                trim: findWoodId("trim", "Oak")
            };
            this._columnsCompare = ["C1", "C2"];
        }

        this._columns = this._columnsCompare.slice();
        this._columns.unshift("Base");
    }

    async _loadAndSetupData() {
        try {
            this._woodData = (await import(/* webpackChunkName: "data-woods" */ "../../gen/woods.json")).default;
            this._setupData();
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

    _initData() {
        this._frameSelectData = this._woodData.frame.sort(sortBy(["name"]));
        this._trimSelectData = this._woodData.trim.sort(sortBy(["name"]));
        this._setOption(
            this._frameSelectData.map(wood => `<option value="${wood.id}">${wood.name}</option>`),
            this._trimSelectData.map(wood => `<option value="${wood.id}">${wood.name}</option>`)
        );

        this.propertyNames.forEach(propertyName => {
            const frames = [
                ...this._woodData.frame.map(
                    frame =>
                        frame.properties
                            .filter(modifier => modifier.modifier === propertyName)
                            .map(modifier => modifier.amount)[0]
                )
            ];
            const trims = [
                ...this._woodData.trim.map(
                    trim =>
                        trim.properties
                            .filter(modifier => modifier.modifier === propertyName)
                            .map(modifier => modifier.amount)[0]
                )
            ];

            const minFrames = d3Min(frames) || 0;
            const maxFrames = d3Max(frames) || 0;
            const minTrims = d3Min(trims) || 0;
            const maxTrims = d3Max(trims) || 0;
            this._addMinMaxProperty(propertyName, {
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
                .attr("class", `col-md-3 ml-auto pt-2 ${column === "Base" ? "column-base" : "column-comp"}`);
            ["frame", "trim"].forEach(type => {
                const id = `${this._baseFunction}-${type}-${column}-select`;
                div.append("label").attr("for", id);
                div.append("select")
                    .attr("name", id)
                    .attr("id", id)
                    .attr("class", "selectpicker");
            });
            div.append("div").attr("id", `${this._baseFunction}-${column}`);
        });
    }

    _initModal() {
        this._initData();
        this._injectModal();

        this._columns.forEach(compareId => {
            ["frame", "trim"].forEach(type => {
                const select$ = $(`#${this._baseFunction}-${type}-${compareId}-select`);
                this._setupWoodSelects(compareId, type, select$);
                this._setupSelectListener(compareId, type, select$);
            });
        });
    }

    _setWoodsSelected(compareId, type, woodId) {
        if (!this._woodsSelected[compareId]) {
            this._woodsSelected[compareId] = {};
        }

        this._woodsSelected[compareId][type] = woodId;
    }

    _setupWoodSelects(compareId, type, select$) {
        this._setWoodsSelected(compareId, type, this._defaultWood[type]);
        select$.append(this._options[type]);
        if (this._baseFunction !== "wood" || (compareId !== "Base" && this._baseFunction === "wood")) {
            select$.attr("disabled", "disabled");
        }
    }

    _setOtherSelect(columnId, type) {
        const otherType = type === "frame" ? "trim" : "frame";

        if (this._woodsSelected[columnId][otherType] === this._defaultWood[otherType]) {
            $(`#${this._baseFunction}-${otherType}-${columnId}-select`)
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
        const woodId = Number(select$.val());

        this._setWoodsSelected(compareId, type, woodId);
        this._setOtherSelect(compareId, type);

        if (compareId === "Base") {
            this._addInstance(compareId, new WoodBase("Base", this._getWoodData("Base"), this));

            this._columnsCompare.forEach(columnId => {
                // For wood-compare: add instances with enabling selects
                // For ship-compare: add instances without enabling selects
                if (this._baseFunction === "wood") {
                    this.enableSelects(columnId);
                }

                if (this._instances[columnId]) {
                    this._addInstance(
                        columnId,
                        new WoodComparison(columnId, this._getWoodData("Base"), this._getWoodData(columnId), this)
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
            .on("change", () => this._woodSelected(compareId, type, select$))
            .selectpicker({ title: `Select ${type}` });
    }

    _getWoodData(id) {
        return {
            frame: this.getWoodTypeData("frame", this._woodsSelected[id].frame),
            trim: this.getWoodTypeData("trim", this._woodsSelected[id].trim)
        };
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

    getWoodTypeData(type, woodId) {
        return this._woodData[type].find(wood => wood.id === woodId);
    }
}
