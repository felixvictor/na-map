/*
    wood-compare.js
 */

/* global d3 : false
 */
import { capitalizeFirstLetter, formatFloat, isEmpty } from "./util";

class Wood {
    constructor(compareId, woodCompare) {
        this._id = compareId;
        this._woodCompare = woodCompare;

        this._select = `#wood-${this._id}`;

        this._setupSvg();
        this._g = d3.select(this._select).select("g");
    }

    _setupSvg() {
        d3.select(`${this._select} svg`).remove();
        d3
            .select(this._select)
            .append("svg")
            .attr("width", this._woodCompare.svgWidth)
            .attr("height", this._woodCompare.svgHeight)
            .attr("class", "profile")
            .attr("fill", "none")
            .append("g")
            .attr("transform", `translate(${this._woodCompare.svgWidth / 2}, ${this._woodCompare.svgHeight / 2})`);
        d3.select(`${this._select} div`).remove();
        d3.select(this._select).append("div");
    }

    static getText(wood) {
        let text = '<table class="table table-sm table-striped small ship"><tbody>';
        text += "<tr><td></td>";
        text += `<td>${wood.name}<br><span class="des">Name</span></td></tr>`;
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

    _printText() {
        console.log("woodData", this._woodData);
        console.log("woodData.frame", this._woodData.frame);
        console.log("woodData.frame.name", this._woodData.frame.name);
        const wood = {
            name: this._woodData.frame.name

        };

        $(`${this._select}`)
            .find("div")
            .append(Wood.getText(wood));
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

    _printTextComparison() {
        function getDiff(a, b, decimals = 0) {
            const diff = parseFloat((a - b).toFixed(decimals));

            if (diff < 0) {
                return `<span class="badge badge-danger">${formatFloat(Math.abs(diff))}</span>`;
            } else if (diff > 0) {
                return `<span class="badge badge-success">${formatFloat(diff)}</span>`;
            }
            return "";
        }

        const wood = {
            name: this._compareData.frame.name
        };

        $(`${this._select}`)
            .find("div")
            .append(Wood.getText(wood));
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

        this._setupData();
        this._setupListener();
        ["Base", "C1", "C2"].forEach(compareId => {
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
    }

    _woodCompareSelected() {
        $("#modal-woods").modal("show");
        this.svgWidth = parseInt($("#modal-woods .columnA").width(), 10);
        console.log(this.svgWidth);
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
                        this._instance[compareId] = new WoodBase(compareId, this._getWoodData(compareId), this);
                        ["C1", "C2"].forEach(id => {
                            WoodCompare.enableSelect(id);
                            if (this._instance[id] !== "undefined") {
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
