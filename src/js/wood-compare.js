/*
    wood-compare.js
 */

/* global d3 : false
 */
import { capitalizeFirstLetter, formatFloat, formatPercent } from "./util";
import { registerEvent } from "./analytics";

class Wood {
    constructor(compareId, woodCompare) {
        this._id = compareId;
        this._woodCompare = woodCompare;
        this._select = `#wood-${this._id}`;

        this._setupSvg();
        this._g = d3.select(this._select).select("g");
    }

    _setupSvg() {
        d3.select(`${this._select} div`).remove();
        d3.select(this._select).append("div");
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
        let text = '<table class="table table-sm table-striped small wood mt-4"><thead>';
        text += "<tr>";
        text += "<tr><th><em>Property</em></th><th><em>Change in %</em></th></tr></thead><tbody>";
        wood.properties.forEach((value, key) => {
            text += `<tr><td>${key}</td><td>${formatFloat(value * 100)}`;
            text += '<span class="rate">';
            if (value > 0) {
                const right = (value / this._woodCompare.minMaxProperty.get(key).max) * 100 * middle;
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`;
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`;
            } else if (value < 0) {
                const right = (value / this._woodCompare.minMaxProperty.get(key).min) * 100 * middle,
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
                this._woodCompare.minMaxProperty.get(key).min,
                this._woodCompare.minMaxProperty.get(key).max
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
                return `${formatFloat(a * 100)} <span class="badge badge-light">${formatFloat(diff)}</span>`;
            } else if (diff > 0) {
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
                    this._woodCompare.minMaxProperty.get(key).max) *
                    100 *
                    middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this._woodCompare.minMaxProperty.get(key).max) *
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
                    (neutral / this._woodCompare.minMaxProperty.get(key).min) * 100 * middle}%;"></span>`;
                text += `<span class="bar ${diffColour}" style="width:${(diff /
                    this._woodCompare.minMaxProperty.get(key).min) *
                    100 *
                    middle}%;"></span>`;
                text += `<span class="bar neg diff" style="width:${(base /
                    this._woodCompare.minMaxProperty.get(key).min) *
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
export default class WoodCompare {
    constructor(woodData) {
        this._woodData = woodData;
        this._defaultWood = {};
        this._defaultWood.frame = "Fir";
        this._defaultWood.trim = "Crew Space";
        this._woodSelected = [];
        this._instance = [];
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
        this.minMaxProperty = new Map();

        this._setupData();
        this._setupListener();
        ["Base", "C1", "C2", "C3"].forEach(compareId => {
            this._woodSelected[compareId] = {};
            ["frame", "trim"].forEach(type => {
                this._woodSelected[compareId][type] = this._defaultWood[type];
            });
            this._setupWoodSelects(compareId);
            this._setupSetupListener(compareId);
        });
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
        this._options.frame = this._frameSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`);
        this._options.trim = this._trimSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`);

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
            let minFrames = d3.min(frames),
                maxFrames = d3.max(frames),
                minTrims = d3.min(trims),
                maxTrims = d3.max(trims);
            minFrames = typeof minFrames === "undefined" ? 0 : minFrames;
            minTrims = typeof minTrims === "undefined" ? 0 : minTrims;
            maxFrames = typeof maxFrames === "undefined" ? 0 : maxFrames;
            maxTrims = typeof maxTrims === "undefined" ? 0 : maxTrims;
            this.minMaxProperty.set(property, {
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
            const select = $(`#wood-${type}-${compareId}-select`);
            select.append(this._options[type]);
            if (compareId !== "Base") {
                select.attr("disabled", "disabled");
            }
        });
    }

    _getWoodTypeData(type, name) {
        return this._woodData[type].filter(wood => wood.name === name)[0];
    }

    _getWoodData(id) {
        return {
            frame: this._getWoodTypeData("frame", this._woodSelected[id].frame),
            trim: this._getWoodTypeData("trim", this._woodSelected[id].trim)
        };
    }

    _setOtherSelect(id, type) {
        const otherType = type === "frame" ? "trim" : "frame",
            select = $(`#wood-${otherType}-${id}-select`);
        if (this._woodSelected[id][otherType] === this._defaultWood[otherType]) {
            select.val(this._defaultWood[otherType]).selectpicker("refresh");
        }
    }

    static enableSelect(id) {
        ["frame", "trim"].forEach(typeSelect => {
            $(`#wood-${typeSelect}-${id}-select`)
                .removeAttr("disabled")
                .selectpicker("refresh");
        });
    }

    _setupSetupListener(compareId) {
        ["frame", "trim"].forEach(type => {
            const select = $(`#wood-${type}-${compareId}-select`);
            select
                .addClass("selectpicker")
                .on("change", () => {
                    const woodName = select.val();
                    this._woodSelected[compareId][type] = woodName;
                    this._setOtherSelect(compareId, type);

                    if (compareId === "Base") {
                        this._instance[compareId] = new WoodBase("Base", this._getWoodData("Base"), this);
                        ["C1", "C2", "C3"].forEach(id => {
                            WoodCompare.enableSelect(id);
                            if (typeof this._instance[id] !== "undefined") {
                                this._instance[id] = new WoodComparison(
                                    id,
                                    this._getWoodData("Base"),
                                    this._getWoodData(id),
                                    this
                                );
                            }
                        });
                    } else {
                        this._instance[compareId] = new WoodComparison(
                            compareId,
                            this._getWoodData("Base"),
                            this._getWoodData(compareId),
                            this
                        );
                    }
                })
                .selectpicker({ noneSelectedText: `Select ${capitalizeFirstLetter(type)}` });
        });
    }
}
