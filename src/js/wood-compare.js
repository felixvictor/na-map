/*
    wood-compare.js
 */

/* global d3 : false
 */
import { capitalizeFirstLetter, formatFloat, formatPercent } from "./util";

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

    _getText(wood) {
        let text = '<table class="table table-sm table-striped small wood mt-4"><thead>';
        text += "<tr>";
        text += `<th>${wood.frame}<br><span class="des">Frame</span></th>`;
        text += `<th>${wood.trim}<br><span class="des">Trim</span></th></tr></thead><tbody>`;
        wood.properties.forEach((value, key) => {
            text += `<tr><td>${key}</td><td>${value}`;
            /*
            let base = parseFloat(value.replace("\u2212\u202f", "-"), 10),
                left,
                right;
            if (base > 0) {
                left = 50;
                right = base / this._woodCompare.minMaxProperty.get(key).max * 50;
                text += `<span class="rate"><span class="bar neutral" style="width:${left}%;"></span>`;
                text += `<span class="bar base" style="width:${right}%;"></span></span></td></tr>`;
            } else if (base < 0) {
                right = base / this._woodCompare.minMaxProperty.get(key).max * 50;
                left = 50 - right;
                text += `<span class="rate"><span class="bar neutral" style="width:${left}%;"></span>`;
                text += `<span class="bar base" style="width:${right}%;"></span></span></td></tr>`;
            } else {
                left = 50;
                right = 50;
            }
            console.log(
                key,
                value,
                parseFloat(value.replace("\u2212\u202f", "-"), 10),
                base,
                this._woodCompare.minMaxProperty.get(key).min,
                this._woodCompare.minMaxProperty.get(key).max
            );
            */
        });
        text += "</tbody></table>";
        return text;
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

    _printText() {
        const wood = {
            frame: this._woodData.frame.name,
            trim: this._woodData.trim.name
        };
        wood.properties = new Map();
        this._woodCompare._properties.forEach(property => {
            wood.properties.set(property, formatPercent(this._getPropertySum(property)));
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

    _printTextComparison() {
        function getDiff(a, b, decimals = 1) {
            const diff = parseFloat(((a - b) * 100).toFixed(decimals));
            if (diff < 0) {
                return `${formatPercent(a)} <span class="badge badge-danger">${formatFloat(Math.abs(diff))}</span>`;
            } else if (diff > 0) {
                return `${formatPercent(a)} <span class="badge badge-success">${formatFloat(diff)}</span>`;
            }
            return "";
        }

        const wood = {
            frame: this._compareData.frame.name,
            trim: this._compareData.trim.name
        };
        wood.properties = new Map();
        this._woodCompare._properties.forEach(property => {
            wood.properties.set(
                property,
                getDiff(this._getComparePropertySum(property), this._getBasePropertySum(property))
            );
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
            "Crew damage",
            "Grog morale bonus",
            "Fire probability",
            "Leak resistance"
        ];

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
        this._options = {};
        this._options.frame = this._frameSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`);
        this._options.trim = this._trimSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`);

        this.minMaxProperty = new Map();
        this._properties.forEach(property => {
            const values = [
                ...this._woodData.frame.map(
                    frame =>
                        frame.properties
                            .filter(modifier => modifier.modifier === property)
                            .map(modifier => modifier.amount)[0]
                ),
                ...this._woodData.trim.map(
                    trim =>
                        trim.properties
                            .filter(modifier => modifier.modifier === property)
                            .map(modifier => modifier.amount)[0]
                )
            ];
            const min = d3.min(values);
            const max = d3.max(values);
            // console.log("property", property, values, min, max);
            this.minMaxProperty.set(property, {
                min: typeof min === "undefined" ? 0 : min,
                max: typeof max === "undefined" ? 0 : max
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
