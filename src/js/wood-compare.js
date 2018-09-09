/**
 * This file is part of na-map.
 *
 * @file      Wood comparison.
 * @module    wood-compare
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

import { capitalizeFirstLetter, formatFloat } from "./util";
import { registerEvent } from "./analytics";

class Wood {
    constructor(compareId, woodCompare) {
        this._id = compareId;
        this._woodCompare = woodCompare;
        this._select = `#${this._woodCompare.baseFunction}-${this._id}`;

        this._setupSvg();
        this._g = d3.select(this._select).select("g");
    }

    _setupSvg() {
        d3.select(`${this.select} div`).remove();
        d3.select(this.select).append("div");
    }

    get id() {
        return this._id;
    }

    get g() {
        return this._g;
    }

    get woodCompare() {
        return this._woodCompare;
    }

    get select() {
        return this._select;
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
        const amount = this.woodData[type].properties
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
                const right = (value / this.woodCompare._minMaxProperty.get(key).max) * 100 * middle;
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`;
            } else if (value < 0) {
                const right = (value / this.woodCompare._minMaxProperty.get(key).min) * 100 * middle,
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
            frame: this.woodData.frame.name,
            trim: this.woodData.trim.name
        };
        wood.properties = new Map();
        this.woodCompare._properties.forEach(property => {
            wood.properties.set(property, this._getPropertySum(property));
        });

        $(`${this.select}`)
            .find("div")
            .append(this._getText(wood));
    }

    get woodData() {
        return this._woodData;
    }

    get woodCompare() {
        return this._woodCompare;
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
        const amount = this.baseData[type].properties
            .filter(prop => prop.modifier === property)
            .map(prop => prop.amount)[0];
        return typeof amount === "undefined" ? 0 : amount / 100;
    }

    _getBasePropertySum(property) {
        return this._getBaseProperty(property, "frame") + this._getBaseProperty(property, "trim");
    }

    _getCompareProperty(property, type) {
        const amount = this.compareData[type].properties
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
                return `${formatFloat(a * 100)} <span class="badge badge-light">${formatFloat(diff)}</span>`;
            }
            if (diff > 0) {
                return `${formatFloat(a * 100)} <span class="badge badge-light">+\u202f${formatFloat(diff)}</span>`;
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
                    this.woodCompare._minMaxProperty.get(key).max) *
                    100 *
                    middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this.woodCompare._minMaxProperty.get(key).max) *
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
                    (neutral / this.woodCompare._minMaxProperty.get(key).min) * 100 * middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this.woodCompare._minMaxProperty.get(key).min) *
                    100 *
                    middle}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${(base /
                    this.woodCompare._minMaxProperty.get(key).min) *
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
            frame: this.compareData.frame.name,
            trim: this.compareData.trim.name
        };
        wood.properties = new Map();
        this.woodCompare._properties.forEach(property => {
            wood.properties.set(property, {
                base: this._getBasePropertySum(property),
                compare: this._getComparePropertySum(property)
            });
        });

        $(`${this.select}`)
            .find("div")
            .append(this._getText(wood));
    }

    get baseData() {
        return this._baseData;
    }

    get compareData() {
        return this._compareData;
    }

    get woodCompare() {
        return this._woodCompare;
    }
}

/**
 *
 */
export default class WoodCompare {
    constructor(woodData, baseFunction) {
        this._woodData = woodData;
        this._baseFunction = baseFunction;

        if (this._baseFunction === "wood") {
            this._defaultWood = {
                frame: "Fir",
                trim: "Crew Space"
            };
            this._columnsCompare = ["C1", "C2", "C3"];
        } else {
            this._defaultWood = {
                frame: "Oak",
                trim: "Oak"
            };
            this._columnsCompare = ["C1", "C2"];
        }

        this._columns = this._columnsCompare;
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

        this._setupData();
        this._setupListener();
        this._columns.forEach(compareId => {
            ["frame", "trim"].forEach(type => {
                this._addWoodSelected(compareId, type, this.defaultWood[type]);
            });
            this._setupWoodSelects(compareId);
            this._setupSetupListener(compareId);
        });
    }

    _setupData() {
        this.frameSelectData = this.woodData.frame.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        this.trimSelectData = this.woodData.trim.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        this._addOption(
            this.frameSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`),
            this.trimSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`)
        );

        this.properties.forEach(property => {
            const frames = [
                    ...this.woodData.frame.map(
                        frame =>
                            frame.properties
                                .filter(modifier => modifier.modifier === property)
                                .map(modifier => modifier.amount)[0]
                    )
                ],
                trims = [
                    ...this.woodData.trim.map(
                        trim =>
                            trim.properties
                                .filter(modifier => modifier.modifier === property)
                                .map(modifier => modifier.amount)[0]
                    )
                ];

            const minFrames = d3.min(frames) || 0,
                maxFrames = d3.max(frames) || 0,
                minTrims = d3.min(trims) || 0,
                maxTrims = d3.max(trims) || 0;
            this._addMinMaxProperty(property, {
                min: minFrames + minTrims >= 0 ? 0 : minFrames + minTrims,
                max: maxFrames + maxTrims
            });
        });
    }

    _woodCompareSelected() {
        $("#modal-woods").modal("show");
        this.svgWidth = parseInt($("#modal-woods .columnA").width(), 10);
        // noinspection JSSuspiciousNameCombination
        this.svgHeight = this.svgWidth;
    }

    _setupListener() {
        $("#button-wood-compare").on("click", event => {
            registerEvent("Tools", "Compare woods");
            event.stopPropagation();
            this._woodCompareSelected();
        });
    }

    _setupWoodSelects(compareId) {
        ["frame", "trim"].forEach(type => {
            const select = $(`#${this.baseFunction}-${type}-${compareId}-select`);
            select.append(this.options[type]);
            if (this._baseFunction !== "wood" || (compareId !== "Base" && this._baseFunction === "wood")) {
                select.attr("disabled", "disabled");
            }
        });
    }

    _setOtherSelect(id, type) {
        const otherType = type === "frame" ? "trim" : "frame",
            select = $(`#${this.baseFunction}-${otherType}-${id}-select`);
        if (this._getWoodSelected(id)[otherType] === this.defaultWood[otherType]) {
            select.val(this.defaultWood[otherType]).selectpicker("refresh");
        }
    }

    _setupSetupListener(compareId) {
        ["frame", "trim"].forEach(type => {
            const select = $(`#${this.baseFunction}-${type}-${compareId}-select`);
            select
                .addClass("selectpicker")
                .on("change", () => {
                    const woodName = select.val();
                    this._addWoodSelected(compareId, type, woodName);
                    this._setOtherSelect(compareId, type);

                    if (compareId === "Base") {
                        this._addInstance(compareId, new WoodBase("Base", this._getWoodData("Base"), this));

                        this._columnsCompare.forEach(id => {
                            // For wood-compare: add instances with enabling selects
                            // For ship-compare: add instances without enabling selects
                            if (this._baseFunction === "wood") {
                                this.enableSelect(id);
                            }
                            if (typeof this.instances[id] !== "undefined") {
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
                })
                .selectpicker({ noneSelectedText: `Select ${capitalizeFirstLetter(type)}` });
        });
    }

    enableSelect(id) {
        ["frame", "trim"].forEach(typeSelect => {
            $(`#${this.baseFunction}-${typeSelect}-${id}-select`)
                .removeAttr("disabled")
                .selectpicker("refresh");
        });
    }

    get baseFunction() {
        return this._baseFunction;
    }

    get properties() {
        return this._properties;
    }

    _getWoodTypeData(type, name) {
        return this.woodData[type].filter(wood => wood.name === name)[0];
    }

    _getWoodData(id) {
        return {
            frame: this._getWoodTypeData("frame", this._getWoodSelected(id).frame),
            trim: this._getWoodTypeData("trim", this._getWoodSelected(id).trim)
        };
    }

    _addWoodSelected(compareId, type, woodName) {
        if (typeof this._woodsSelected[compareId] === "undefined") {
            this._woodsSelected[compareId] = {};
        }
        this._woodsSelected[compareId][type] = woodName;
    }

    _getWoodSelected(id) {
        return this._woodsSelected[id];
    }

    _addMinMaxProperty(property, minMax) {
        this._minMaxProperty.set(property, minMax);
    }

    _addInstance(id, woodInstance) {
        this._instances[id] = woodInstance;
    }

    get instances() {
        return this._instances;
    }

    set woodData(woodData) {
        this._woodData = woodData;
    }

    get woodData() {
        return this._woodData;
    }

    set frameSelectData(frameSelectData) {
        this._frameSelectData = frameSelectData;
    }

    get frameSelectData() {
        return this._frameSelectData;
    }

    set trimSelectData(trimSelectData) {
        this._trimSelectData = trimSelectData;
    }

    get trimSelectData() {
        return this._trimSelectData;
    }

    _addOption(frame, trim) {
        this._options.frame = frame;
        this._options.trim = trim;
    }

    get options() {
        return this._options;
    }

    set svgWidth(width) {
        this._svgWidth = width;
    }

    get svgWidth() {
        return this._svgWidth;
    }

    set svgHeight(height) {
        this._svgHeight = height;
    }

    get svgHeight() {
        return this._svgHeight;
    }

    get defaultWood() {
        return this._defaultWood;
    }
}
