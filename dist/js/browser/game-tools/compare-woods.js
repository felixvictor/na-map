/*!
 * This file is part of na-map.
 *
 * @file      Compare woods.
 * @module    game-tools/compare-woods
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap-select/js/bootstrap-select";
import { min as d3Min, max as d3Max } from "d3-array";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../analytics";
import { formatFloat, formatPercent, formatSignFloat } from "../../common/common-format";
import { insertBaseModal } from "../../common/common-browser";
import { putImportError, woodType } from "../../common/common";
import { simpleStringSort, sortBy } from "../../common/common-node";
const woodColumnType = ["Base", "C1", "C2", "C3"];
class Wood {
    constructor(compareId, woodCompare) {
        this._id = compareId;
        this._woodCompare = woodCompare;
        this.select = `#${this._woodCompare.baseFunction}-${this._id}`;
        this._setupMainDiv();
        this._g = d3Select(this.select).select("g");
    }
    _setupMainDiv() {
        d3Select(`${this.select} div`).remove();
        d3Select(this.select).append("div");
    }
}
class WoodBase extends Wood {
    constructor(compareId, woodData, woodCompare) {
        super(compareId, woodCompare);
        this._woodData = woodData;
        this._printText();
    }
    _getProperty(propertyName, type) {
        const property = this._woodData[type].properties.find((prop) => prop.modifier === propertyName);
        let amount = 0;
        let isPercentage = false;
        if (property === null || property === void 0 ? void 0 : property.amount) {
            ;
            ({ amount, isPercentage } = property);
        }
        return { amount, isPercentage };
    }
    _getPropertySum(propertyName) {
        const propertyFrame = this._getProperty(propertyName, "frame");
        const propertyTrim = this._getProperty(propertyName, "trim");
        return {
            amount: propertyFrame.amount + propertyTrim.amount,
            isPercentage: propertyTrim.isPercentage,
        };
    }
    _getText(wood) {
        var _a, _b, _c, _d;
        const middle = 100 / 2;
        let text = '<table class="table table-sm table-striped small mt-4"><thead>';
        text += "<tr>";
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>';
        for (const [key, value] of wood.properties) {
            text += `<tr><td>${key}</td><td>${value.isPercentage ? formatPercent(value.amount / 100) : formatFloat(value.amount)}`;
            text += '<span class="rate">';
            if (value.amount > 0) {
                const right = (value.amount / ((_b = (_a = this._woodCompare.minMaxProperty.get(key)) === null || _a === void 0 ? void 0 : _a.max) !== null && _b !== void 0 ? _b : 1)) * middle;
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`;
            }
            else if (value.amount < 0) {
                const right = (value.amount / ((_d = (_c = this._woodCompare.minMaxProperty.get(key)) === null || _c === void 0 ? void 0 : _c.min) !== null && _d !== void 0 ? _d : 1)) * middle;
                const left = middle - right;
                text += `<span class="bar neutral" style="width:${left}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${right}%;"></span>`;
            }
            else {
                text += '<span class="bar neutral"></span>';
            }
            text += "</span></td></tr>";
        }
        text += "</tbody></table>";
        return text;
    }
    _printText() {
        const wood = {
            frame: this._woodData.frame.name,
            trim: this._woodData.trim.name,
            properties: new Map(),
        };
        for (const propertyName of this._woodCompare.propertyNames) {
            const property = this._getPropertySum(propertyName);
            wood.properties.set(propertyName, {
                amount: property.amount,
                isPercentage: property.isPercentage,
            });
        }
        $(`${this.select}`).find("div").append(this._getText(wood));
    }
}
class WoodComparison extends Wood {
    constructor(compareId, baseData, compareData, woodCompare) {
        super(compareId, woodCompare);
        this._baseData = baseData;
        this._compareData = compareData;
        this._printTextComparison();
    }
    static _getDiff(a, b, isPercentage, decimals = 1) {
        const diff = Number.parseFloat((a - b).toFixed(decimals));
        const value = isPercentage ? formatPercent(a / 100, decimals) : formatFloat(a);
        return `${value} <span class="badge badge-white">${formatSignFloat(diff)}</span>`;
    }
    _getBaseProperty(propertyName, type) {
        const property = this._baseData[type].properties.find((prop) => prop.modifier === propertyName);
        let amount = 0;
        let isPercentage = false;
        if (property === null || property === void 0 ? void 0 : property.amount) {
            ;
            ({ amount, isPercentage } = property);
        }
        return { amount, isPercentage };
    }
    _getBasePropertySum(propertyName) {
        const basePropertyFrame = this._getBaseProperty(propertyName, "frame");
        const basePropertyTrim = this._getBaseProperty(propertyName, "trim");
        return {
            amount: basePropertyFrame.amount + basePropertyTrim.amount,
            isPercentage: basePropertyTrim.isPercentage,
        };
    }
    _getCompareProperty(propertyName, type) {
        const property = this._compareData[type].properties.find((prop) => prop.modifier === propertyName);
        let amount = 0;
        let isPercentage = false;
        if (property === null || property === void 0 ? void 0 : property.amount) {
            amount = property.amount;
            isPercentage = property.isPercentage;
        }
        return { amount, isPercentage };
    }
    _getComparePropertySum(propertyName) {
        const comparePropertyFrame = this._getCompareProperty(propertyName, "frame");
        const comparePropertyTrim = this._getCompareProperty(propertyName, "trim");
        return {
            amount: comparePropertyFrame.amount + comparePropertyTrim.amount,
            isPercentage: comparePropertyFrame.isPercentage && comparePropertyTrim.isPercentage,
        };
    }
    _getText(wood) {
        var _a, _b, _c, _d, _e, _f, _h, _j, _k, _l;
        const middle = 100 / 2;
        let base = 0;
        let diff = 0;
        let neutral = 0;
        let diffColour = "";
        let text = '<table class="table table-sm table-striped small wood mt-4"><thead>';
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>';
        for (const [key, value] of wood.properties) {
            text += `<tr><td>${key}</td><td>${WoodComparison._getDiff(value.compare, value.base, value.isPercentage)}`;
            text += '<span class="rate">';
            if (value.compare >= 0) {
                if (value.base >= 0) {
                    if (value.compare > value.base) {
                        base = value.base;
                        diff = value.compare - value.base;
                        diffColour = "pos";
                    }
                    else {
                        base = value.compare;
                        diff = value.base - value.compare;
                        diffColour = "neg";
                    }
                }
                else {
                    base = 0;
                    diff = value.compare;
                    diffColour = "pos";
                }
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${(base / ((_b = (_a = this._woodCompare.minMaxProperty.get(key)) === null || _a === void 0 ? void 0 : _a.max) !== null && _b !== void 0 ? _b : 1)) * middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff / ((_d = (_c = this._woodCompare.minMaxProperty.get(key)) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : 1)) * middle}%;"></span>`;
            }
            else if (value.compare < 0) {
                if (value.base < 0) {
                    if (value.compare >= value.base) {
                        base = value.compare;
                        diff = value.base - value.compare;
                        neutral = -value.base;
                        diffColour = "pos";
                    }
                    else {
                        base = value.base;
                        diff = value.compare - value.base;
                        neutral = -value.compare;
                        diffColour = "neg";
                    }
                }
                else {
                    base = 0;
                    diff = value.compare;
                    neutral = -value.compare;
                    diffColour = "neg";
                }
                text += `<span class="bar neutral" style="width:${middle + (neutral / ((_f = (_e = this._woodCompare.minMaxProperty.get(key)) === null || _e === void 0 ? void 0 : _e.min) !== null && _f !== void 0 ? _f : 1)) * middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff / ((_j = (_h = this._woodCompare.minMaxProperty.get(key)) === null || _h === void 0 ? void 0 : _h.min) !== null && _j !== void 0 ? _j : 1)) * middle}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${(base / ((_l = (_k = this._woodCompare.minMaxProperty.get(key)) === null || _k === void 0 ? void 0 : _k.min) !== null && _l !== void 0 ? _l : 1)) * middle}%;"></span>`;
            }
            else {
                text += '<span class="bar neutral"></span>';
            }
            text += "</span></td></tr>";
        }
        text += "</tbody></table>";
        return text;
    }
    _printTextComparison() {
        const wood = {
            frame: this._compareData.frame.name,
            trim: this._compareData.trim.name,
            properties: new Map(),
        };
        for (const propertyName of this._woodCompare.propertyNames) {
            const basePropertySum = this._getBasePropertySum(propertyName);
            const comparePropertySum = this._getComparePropertySum(propertyName);
            wood.properties.set(propertyName, {
                base: basePropertySum.amount,
                compare: comparePropertySum.amount,
                isPercentage: basePropertySum.isPercentage,
            });
        }
        $(`${this.select}`).find("div").append(this._getText(wood));
    }
}
export default class CompareWoods {
    constructor(baseFunction) {
        this.instances = {};
        this.minMaxProperty = new Map();
        this._defaultWoodId = {};
        this._options = {};
        this._woodIdsSelected = {};
        this.baseFunction = baseFunction;
        this._baseName = "Compare woods";
        this._baseId = `${this.baseFunction}-compare`;
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        if (this.baseFunction === "wood") {
            this._setupListener();
        }
    }
    async woodInit() {
        await this._loadAndSetupData();
        this._initData();
    }
    _findWoodId(type, woodName) {
        var _a, _b;
        return (_b = (_a = this._woodData[type].find((wood) => wood.name === woodName)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0;
    }
    _setupData() {
        this.propertyNames = new Set([
            ...this._woodData.frame.flatMap((frame) => frame.properties.map((property) => property.modifier)),
            ...this._woodData.trim.flatMap((trim) => trim.properties.map((property) => property.modifier)),
        ].sort(simpleStringSort));
        if (this.baseFunction === "wood") {
            this._defaultWoodId = {
                frame: this._findWoodId("frame", "Fir"),
                trim: this._findWoodId("trim", "Crew Space"),
            };
            this._columnsCompare = ["C1", "C2", "C3"];
        }
        else if (this.baseFunction === "wood-journey") {
            this._defaultWoodId = {
                frame: this._findWoodId("frame", "Oak"),
                trim: this._findWoodId("trim", "Oak"),
            };
            this._columnsCompare = [];
        }
        else {
            this._defaultWoodId = {
                frame: this._findWoodId("frame", "Oak"),
                trim: this._findWoodId("trim", "Oak"),
            };
            this._columnsCompare = ["C1", "C2"];
        }
        this._columns = this._columnsCompare.slice();
        this._columns.unshift("Base");
    }
    async _loadAndSetupData() {
        try {
            this._woodData = (await import("Lib/gen-generic/woods.json"))
                .default;
            this._setupData();
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
            this._woodCompareSelected();
        });
    }
    _woodCompareSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _initData() {
        var _a, _b, _c, _d;
        this._frameSelectData = this._woodData.frame.sort(sortBy(["name"]));
        this._trimSelectData = this._woodData.trim.sort(sortBy(["name"]));
        this._setOption(this._frameSelectData.map((wood) => `<option value="${wood.id}">${wood.name}</option>`).toString(), this._trimSelectData.map((wood) => `<option value="${wood.id}">${wood.name}</option>`).toString());
        for (const propertyName of this.propertyNames) {
            const frames = [
                ...this._woodData.frame.map((frame) => { var _a, _b; return (_b = (_a = frame.properties.find((modifier) => modifier.modifier === propertyName)) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0; }),
            ];
            const trims = [
                ...this._woodData.trim.map((trim) => { var _a, _b; return (_b = (_a = trim.properties.find((modifier) => modifier.modifier === propertyName)) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0; }),
            ];
            const minFrames = (_a = d3Min(frames)) !== null && _a !== void 0 ? _a : 0;
            const maxFrames = (_b = d3Max(frames)) !== null && _b !== void 0 ? _b : 0;
            const minTrims = (_c = d3Min(trims)) !== null && _c !== void 0 ? _c : 0;
            const maxTrims = (_d = d3Max(trims)) !== null && _d !== void 0 ? _d : 0;
            this._addMinMaxProperty(propertyName, {
                min: minFrames + minTrims >= 0 ? 0 : minFrames + minTrims,
                max: maxFrames + maxTrims,
            });
        }
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const row = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("class", "container-fluid")
            .append("div")
            .attr("class", "row wood");
        for (const column of this._columns) {
            const div = row
                .append("div")
                .attr("class", `col-md-3 ml-auto pt-2 ${column === "Base" ? "column-base" : "column-comp"}`);
            for (const type of woodType) {
                const id = `${this.baseFunction}-${type}-${column}-select`;
                div.append("label").attr("for", id);
                div.append("select").attr("name", id).attr("id", id).attr("class", "selectpicker");
            }
            div.append("div").attr("id", `${this.baseFunction}-${column}`);
        }
    }
    _initModal() {
        this._initData();
        this._injectModal();
        for (const compareId of this._columns) {
            for (const type of woodType) {
                const select$ = $(`#${this.baseFunction}-${type}-${compareId}-select`);
                this._setupWoodSelects(compareId, type, select$);
                this._setupSelectListener(compareId, type, select$);
            }
        }
    }
    _setWoodsSelected(compareId, type, woodId) {
        if (!this._woodIdsSelected[compareId]) {
            this._woodIdsSelected[compareId] = {};
        }
        this._woodIdsSelected[compareId][type] = woodId;
    }
    _setupWoodSelects(compareId, type, select$) {
        this._setWoodsSelected(compareId, type, this._defaultWoodId[type]);
        select$.append(this._options[type]);
        if (this.baseFunction !== "wood" || (compareId !== "Base" && this.baseFunction === "wood")) {
            select$.attr("disabled", "disabled");
        }
    }
    _setOtherSelect(columnId, type) {
        const otherType = type === "frame" ? "trim" : "frame";
        if (this._woodIdsSelected[columnId][otherType] === this._defaultWoodId[otherType]) {
            $(`#${this.baseFunction}-${otherType}-${columnId}-select`)
                .val(this._defaultWoodId[otherType])
                .selectpicker("refresh");
        }
    }
    enableSelects(id) {
        for (const type of woodType) {
            $(`#${this.baseFunction}-${type}-${id}-select`).removeAttr("disabled").selectpicker("refresh");
        }
    }
    _woodSelected(compareId, type, select$) {
        const woodId = Number(select$.val());
        this._setWoodsSelected(compareId, type, woodId);
        this._setOtherSelect(compareId, type);
        if (compareId === "Base") {
            this._addInstance(compareId, new WoodBase("Base", this._getWoodData("Base"), this));
            for (const columnId of this._columnsCompare) {
                if (this.baseFunction === "wood") {
                    this.enableSelects(columnId);
                }
                if (this.instances[columnId]) {
                    this._addInstance(columnId, new WoodComparison(columnId, this._getWoodData("Base"), this._getWoodData(columnId), this));
                }
            }
        }
        else {
            this._addInstance(compareId, new WoodComparison(compareId, this._getWoodData("Base"), this._getWoodData(compareId), this));
        }
    }
    _setupSelectListener(compareId, type, select$) {
        select$
            .on("change", () => this._woodSelected(compareId, type, select$))
            .selectpicker({ title: `Select ${type}` });
    }
    _getWoodData(id) {
        return {
            frame: this.getWoodTypeData("frame", this._woodIdsSelected[id].frame),
            trim: this.getWoodTypeData("trim", this._woodIdsSelected[id].trim),
        };
    }
    _addMinMaxProperty(property, minMax) {
        this.minMaxProperty.set(property, minMax);
    }
    _setOption(frame, trim) {
        this._options.frame = frame;
        this._options.trim = trim;
    }
    _addInstance(id, woodInstance) {
        this.instances[id] = woodInstance;
    }
    getWoodTypeData(type, woodId) {
        var _a;
        return (_a = this._woodData[type].find((wood) => wood.id === woodId)) !== null && _a !== void 0 ? _a : {};
    }
}
//# sourceMappingURL=compare-woods.js.map