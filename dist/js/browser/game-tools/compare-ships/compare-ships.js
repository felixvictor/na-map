/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file.
 * @module    game-tools/compare-ships/compare-ships
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { ascending as d3Ascending, max as d3Max, min as d3Min } from "d3-array";
import { nest as d3Nest } from "d3-collection";
import { interpolateCubehelixLong as d3InterpolateCubehelixLong } from "d3-interpolate";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../../analytics";
import { appVersion, colourGreenDark, colourRedDark, colourWhite, hashids, hullRepairsPercent, insertBaseModal, repairTime, rigRepairsPercent, } from "../../../common/common-browser";
import { isEmpty, putImportError } from "../../../common/common";
import { formatPP, formatSignInt, formatSignPercent } from "../../../common/common-format";
import { getOrdinal } from "../../../common/common-math";
import { sortBy } from "../../../common/common-node";
import { copyToClipboard } from "../../util";
import { ShipBase, ShipComparison } from ".";
import CompareWoods from "../compare-woods";
const shipColumnType = ["Base", "C1", "C2"];
export class CompareShips {
    constructor(id = "ship-compare") {
        this.windProfileRotate = 0;
        this._modal$ = {};
        this._selectedUpgradeIdsList = {};
        this._selectedUpgradeIdsPerType = {};
        this._selectModule$ = {};
        this._selectShip$ = {};
        this._selectWood$ = {};
        this._shipIds = {};
        this._baseId = id;
        this._baseName = "Compare ships";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._moduleId = `${this._baseId}-module`;
        this._copyButtonId = `button-copy-${this._baseId}`;
        this.colourScaleSpeedDiff = d3ScaleLinear()
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong);
        this._modifierAmount = new Map();
        if (this._baseId === "ship-compare") {
            this.columnsCompare = ["C1", "C2"];
        }
        else {
            this.columnsCompare = [];
        }
        this._columns = this.columnsCompare.slice();
        this._columns.unshift("Base");
        this.selectedShips = { Base: {}, C1: {}, C2: {} };
        this._woodId = "wood-ship";
        this._setupArrow();
        if (this._baseId !== "ship-journey") {
            this._setupListener();
        }
    }
    static _getModuleLevel(rate) {
        return rate <= 3 ? "L" : rate <= 5 ? "M" : "S";
    }
    static _adjustAbsolute(currentValue, additionalValue) {
        return currentValue ? currentValue + additionalValue : additionalValue;
    }
    static _adjustPercentage(currentValue, additionalValue, isBaseValueAbsolute) {
        if (isBaseValueAbsolute) {
            return currentValue ? currentValue * (1 + additionalValue) : additionalValue;
        }
        return currentValue ? currentValue + additionalValue : additionalValue;
    }
    static _getModifierFromModule(properties) {
        return `<p class="mb-0">${properties
            .map((property) => {
            let amount;
            if (property.isPercentage) {
                amount = formatSignPercent(property.amount / 100);
            }
            else {
                amount =
                    property.amount < 1 && property.amount > 0
                        ? formatPP(property.amount)
                        : formatSignInt(property.amount);
            }
            return `${property.modifier} ${amount}`;
        })
            .join("<br>")}</p>`;
    }
    static _setSelect(select$, ids) {
        if (ids) {
            select$.val(ids.toString);
        }
        select$.selectpicker("render");
    }
    async CompareShipsInit() {
        await this._loadAndSetupData();
        this._initData();
        this._initSelects();
    }
    async initFromClipboard(urlParams) {
        var _a;
        await this._loadAndSetupData();
        const shipAndWoodsIds = hashids.decode((_a = urlParams.get("cmp")) !== null && _a !== void 0 ? _a : "");
        if (shipAndWoodsIds.length > 0) {
            this._shipCompareSelected();
            this._setShipAndWoodsSelects(shipAndWoodsIds);
            this._setModuleSelects(urlParams);
        }
    }
    _setupArrow() {
        const arrow = document.querySelector("#journey-arrow");
        const arrowNew = arrow.cloneNode(true);
        arrowNew.id = "wind-profile-arrow-head";
        if (arrowNew.hasChildNodes()) {
            for (const child of arrowNew.childNodes) {
                ;
                child.classList.replace("journey-arrow-head", "wind-profile-arrow-head");
            }
        }
        const defs = document.querySelector("#na-map svg defs");
        defs.append(arrowNew);
    }
    _setupData() {
        var _a, _b, _c;
        this._moduleAndWoodChanges = new Map([
            ["Acceleration", { properties: ["ship.acceleration"], isBaseValueAbsolute: true }],
            [
                "Armor thickness",
                { properties: ["sides.thickness", "bow.thickness", "stern.thickness"], isBaseValueAbsolute: true },
            ],
            ["Armour repair amount (perk)", { properties: ["repairAmount.armourPerk"], isBaseValueAbsolute: true }],
            ["Armour repair amount", { properties: ["repairAmount.armour"], isBaseValueAbsolute: true }],
            [
                "Armour hit points",
                { properties: ["bow.armour", "sides.armour", "stern.armour"], isBaseValueAbsolute: true },
            ],
            ["Back armour thickness", { properties: ["stern.thickness"], isBaseValueAbsolute: true }],
            ["Splinter resistance", { properties: ["resistance.splinter"], isBaseValueAbsolute: false }],
            ["Crew", { properties: ["crew.max"], isBaseValueAbsolute: true }],
            ["Fire resistance", { properties: ["resistance.fire"], isBaseValueAbsolute: false }],
            ["Front armour thickness", { properties: ["bow.thickness"], isBaseValueAbsolute: true }],
            ["Hold weight", { properties: ["maxWeight"], isBaseValueAbsolute: true }],
            ["Hull hit points", { properties: ["structure.armour"], isBaseValueAbsolute: true }],
            ["Leak resistance", { properties: ["resistance.leaks"], isBaseValueAbsolute: false }],
            [
                "Mast health",
                { properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"], isBaseValueAbsolute: true },
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    isBaseValueAbsolute: true,
                },
            ],
            ["Rudder health", { properties: ["rudder.armour"], isBaseValueAbsolute: true }],
            ["Rudder repair time", { properties: ["repairTime.rudder"], isBaseValueAbsolute: true }],
            ["Rudder speed", { properties: ["rudder.halfturnTime"], isBaseValueAbsolute: true }],
            ["Sail repair amount (perk)", { properties: ["repairAmount.sailsPerk"], isBaseValueAbsolute: true }],
            ["Sail repair amount", { properties: ["repairAmount.sails"], isBaseValueAbsolute: true }],
            ["Sail repair time", { properties: ["repairTime.sails"], isBaseValueAbsolute: true }],
            ["Sailing crew", { properties: ["crew.sailing"], isBaseValueAbsolute: true }],
            ["Max speed", { properties: ["speed.max"], isBaseValueAbsolute: true }],
            ["Side armour repair time", { properties: ["repairTime.sides"], isBaseValueAbsolute: true }],
            ["Speed decrease", { properties: ["ship.deceleration"], isBaseValueAbsolute: true }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], isBaseValueAbsolute: true }],
            ["Water pump health", { properties: ["pump.armour"], isBaseValueAbsolute: true }],
            ["Water repair time", { properties: ["repairTime.pump"], isBaseValueAbsolute: true }],
        ]);
        this._moduleAndWoodCaps = new Map([
            [
                "Armor thickness",
                {
                    properties: ["sides.thickness", "bow.thickness", "stern.thickness"],
                    cap: { amount: 0.4, isPercentage: true },
                },
            ],
            [
                "Armour hit points",
                {
                    properties: ["bow.armour", "sides.armour", "stern.armour"],
                    cap: { amount: 0.4, isPercentage: true },
                },
            ],
            ["Structure hit points", { properties: ["structure.armour"], cap: { amount: 0.4, isPercentage: true } }],
            [
                "Mast health",
                {
                    properties: ["mast.bottomArmour", "mast.middleArmour", "mast.topArmour"],
                    cap: { amount: 0.3, isPercentage: true },
                },
            ],
            [
                "Mast thickness",
                {
                    properties: ["mast.bottomThickness", "mast.middleThickness", "mast.topThickness"],
                    cap: { amount: 0.3, isPercentage: true },
                },
            ],
            ["Max speed", { properties: ["speed.max"], cap: { amount: 16, isPercentage: false } }],
            ["Turn rate", { properties: ["rudder.turnSpeed"], cap: { amount: 0.25, isPercentage: true } }],
        ]);
        const theoreticalMinSpeed = ((_a = d3Min(this._shipData, (ship) => ship.speed.min)) !== null && _a !== void 0 ? _a : 0) * 1.2;
        const theoreticalMaxSpeed = this._moduleAndWoodCaps.get("Max speed").cap.amount;
        this._minSpeed = theoreticalMinSpeed;
        this._maxSpeed = theoreticalMaxSpeed;
        this.colorScale = d3ScaleLinear()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateCubehelixLong);
        const minShipMass = (_b = d3Min(this._shipData, (ship) => ship.shipMass)) !== null && _b !== void 0 ? _b : 0;
        const maxShipMass = (_c = d3Max(this._shipData, (ship) => ship.shipMass)) !== null && _c !== void 0 ? _c : 0;
        this.shipMassScale = d3ScaleLinear().domain([minShipMass, maxShipMass]).range([100, 150]);
    }
    async _loadAndSetupData() {
        try {
            this._moduleDataDefault = (await import("Lib/gen-generic/modules.json")).default;
            this._shipData = (await import("Lib/gen-generic/ships.json"))
                .default;
            this._setupData();
            if (this._baseId !== "ship-journey") {
                this.woodCompare = new CompareWoods(this._woodId);
                await this.woodCompare.woodInit();
            }
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
            this._shipCompareSelected();
        });
    }
    _setGraphicsParameters() {
        var _a;
        this.svgWidth = (_a = $(`#${this._modalId} .column-base`).width()) !== null && _a !== void 0 ? _a : 0;
        this.svgHeight = this.svgWidth;
        this.outerRadius = Math.floor(Math.min(this.svgWidth, this.svgHeight) / 2);
        this.innerRadius = Math.floor(this.outerRadius * 0.3);
        this.radiusSpeedScale = d3ScaleLinear()
            .domain([this._minSpeed, 0, this._maxSpeed])
            .range([10, this.innerRadius, this.outerRadius]);
    }
    _shipCompareSelected() {
        var _a, _b;
        if (isEmpty(this._modal$)) {
            this._initModal();
            this._modal$ = $(`#${this._modalId}`);
            (_a = document.querySelector(`#${this._modalId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("keydown", (event) => {
                if (event.key === "KeyC" && event.ctrlKey) {
                    this._copyDataClicked(event);
                }
            });
            (_b = document.querySelector(`#${this._copyButtonId}`)) === null || _b === void 0 ? void 0 : _b.addEventListener("click", (event) => {
                this._copyDataClicked(event);
            });
        }
        this._modal$.modal("show");
        this._setGraphicsParameters();
    }
    _getShipAndWoodIds() {
        const data = [];
        for (const columnId of this._columns) {
            if (this._shipIds[columnId] !== undefined) {
                data.push(...this._shipIds[columnId]);
                for (const type of ["frame", "trim"]) {
                    data.push(Number(this._selectWood$[columnId][type].val()));
                }
            }
        }
        return data;
    }
    _copyDataClicked(event) {
        registerEvent("Menu", "Copy ship compare");
        event.preventDefault();
        const ShipAndWoodIds = this._getShipAndWoodIds();
        if (ShipAndWoodIds.length > 0) {
            const ShipCompareUrl = new URL(window.location.href);
            ShipCompareUrl.searchParams.set("v", encodeURIComponent(appVersion));
            ShipCompareUrl.searchParams.set("cmp", hashids.encode(ShipAndWoodIds));
            for (const columnId of this._columns) {
                const columnIndex = this._columns.indexOf(columnId);
                if (this._selectedUpgradeIdsPerType[columnId]) {
                    for (const type of [...this._moduleTypes]) {
                        const typeIndex = [...this._moduleTypes].indexOf(type);
                        const moduleIds = this._selectedUpgradeIdsPerType[columnId][type];
                        if (moduleIds === null || moduleIds === void 0 ? void 0 : moduleIds.length) {
                            const param = `${columnIndex}${typeIndex}`;
                            ShipCompareUrl.searchParams.set(param, hashids.encode(moduleIds));
                        }
                    }
                }
            }
            copyToClipboard(ShipCompareUrl.href, this._modal$);
        }
    }
    _setupShipData() {
        this._shipSelectData = d3Nest()
            .key((ship) => String(ship.class))
            .sortKeys(d3Ascending)
            .entries(this._shipData
            .map((ship) => ({
            id: ship.id,
            name: ship.name,
            class: ship.class,
            battleRating: ship.battleRating,
            guns: ship.guns,
        }))
            .sort(sortBy(["name"])));
    }
    _setupModuleData() {
        this._moduleProperties = new Map(this._moduleDataDefault.flatMap((type) => type[1]
            .filter((module) => module.properties.some((property) => {
            return this._moduleAndWoodChanges.has(property.modifier);
        }))
            .map((module) => [module.id, module])));
        this._moduleTypes = new Set([...this._moduleProperties].map((module) => module[1].type.replace(/\s\u2013\s[\s/A-Za-z\u25CB]+/, "")));
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const row = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("class", "container-fluid")
            .append("div")
            .attr("class", "row");
        for (const columnId of this._columns) {
            const div = row
                .append("div")
                .attr("class", `col-md-4 ml-auto pt-2 ${columnId === "Base" ? "column-base" : "column-comp"}`);
            const shipSelectId = this._getShipSelectId(columnId);
            div.append("label")
                .append("select")
                .attr("name", shipSelectId)
                .attr("id", shipSelectId)
                .attr("class", "selectpicker");
            for (const type of ["frame", "trim"]) {
                const woodId = this._getWoodSelectId(type, columnId);
                div.append("label")
                    .append("select")
                    .attr("name", woodId)
                    .attr("id", woodId)
                    .attr("class", "selectpicker");
            }
            for (const type of this._moduleTypes) {
                const moduleId = this._getModuleSelectId(type, columnId);
                div.append("label")
                    .append("select")
                    .attr("name", moduleId)
                    .attr("id", moduleId)
                    .property("multiple", true)
                    .attr("class", "selectpicker");
            }
            div.append("div")
                .attr("id", `${this._baseId}-${columnId}`)
                .attr("class", `${columnId === "Base" ? "ship-base" : "ship-compare"}`);
        }
        const footer = d3Select(`#${this._modalId} .modal-footer`);
        footer
            .insert("button", "button")
            .classed("btn btn-outline-secondary icon-outline-button", true)
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
            .append("i")
            .classed("icon icon-copy", true);
    }
    _initData() {
        this._setupShipData();
        this._setupModuleData();
    }
    _initSelectColumns() {
        for (const columnId of this._columns) {
            this._setupShipSelect(columnId);
            if (this._baseId !== "ship-journey") {
                this._selectWood$[columnId] = {};
                for (const type of ["frame", "trim"]) {
                    this._selectWood$[columnId][type] = $(`#${this._getWoodSelectId(type, columnId)}`);
                    this.woodCompare._setupWoodSelects(columnId, type, this._selectWood$[columnId][type]);
                }
            }
            this._setupSelectListener(columnId);
        }
    }
    _initSelects() {
        this._initSelectColumns();
    }
    _initModal() {
        this._initData();
        this._injectModal();
        this._initSelects();
    }
    _getShipOptions() {
        return this._shipSelectData
            .map((key) => `<optgroup label="${getOrdinal(Number(key.key), false)} rate">${key.values
            .map((ship) => `<option data-subtext="${ship.battleRating}" value="${ship.id}">${ship.name} (${ship.guns})`)
            .join("</option>")}`)
            .join("</optgroup>");
    }
    _setupShipSelect(columnId) {
        this._selectShip$[columnId] = $(`#${this._getShipSelectId(columnId)}`);
        const options = this._getShipOptions();
        this._selectShip$[columnId].append(options);
        if (columnId !== "Base") {
            this._selectShip$[columnId].attr("disabled", "disabled");
        }
    }
    _getUpgradesOptions(moduleType, shipClass) {
        const modules = d3Nest()
            .key((module) => module[1].type.replace(/[\sA-Za-z]+\s–\s/, ""))
            .sortKeys(d3Ascending)
            .sortValues((a, b) => a[1].name.localeCompare(b[1].name))
            .entries([...this._moduleProperties].filter((module) => module[1].type.replace(/\s–\s[\s/A-Za-z\u25CB]+/, "") === moduleType &&
            (module[1].moduleLevel === "U" ||
                module[1].moduleLevel === CompareShips._getModuleLevel(shipClass))));
        let options = "";
        const moduleTypeWithSingleOption = new Set(["Permanent", "Ship trim"]);
        if (modules.length > 1) {
            options = modules
                .map((group) => `<optgroup label="${group.key}" data-max-options="${moduleTypeWithSingleOption.has(moduleType.replace(/[\sA-Za-z]+\s–\s/, "")) ? 1 : 5}">${group.values
                .map((module) => `<option value="${module[0]}">${module[1].name}`)
                .join("</option>")}`)
                .join("</optgroup>");
        }
        else {
            options = modules
                .map((group) => `${group.values
                .map((module) => `<option value="${module[0]}">${module[1].name}`)
                .join("</option>")}`)
                .join("");
        }
        return options;
    }
    _fillModuleSelect(columnId, type) {
        const getShipClass = () => this._shipData.find((ship) => ship.id === this._shipIds[columnId]).class;
        const options = this._getUpgradesOptions(type, getShipClass());
        this._selectModule$[columnId][type].find("option").remove();
        this._selectModule$[columnId][type].append(options);
    }
    _resetModuleSelects(columnId) {
        for (const type of this._moduleTypes) {
            this._fillModuleSelect(columnId, type);
            this._selectModule$[columnId][type].selectpicker("refresh");
        }
    }
    _getModuleFromName(moduleName) {
        let module = {};
        this._moduleDataDefault.some((type) => {
            module = type[1].find((module) => module.name === moduleName);
            return Boolean(module);
        });
        return module;
    }
    _setupModulesSelect(columnId) {
        if (!this._selectModule$[columnId]) {
            this._selectModule$[columnId] = {};
            for (const type of this._moduleTypes) {
                this._selectModule$[columnId][type] = $(`#${this._getModuleSelectId(type, columnId)}`);
                this._selectModule$[columnId][type]
                    .on("changed.bs.select", () => {
                    this._modulesSelected(columnId);
                    this._refreshShips(columnId);
                })
                    .on("show.bs.select", (event) => {
                    const $el = $(event.currentTarget);
                    $el.parent().find("button.bs-select-all").remove();
                })
                    .on("show.bs.select", (event) => {
                    const $el = $(event.currentTarget);
                    for (const element of $el.data("selectpicker").selectpicker.current.elements) {
                        if (!(element.classList.contains("dropdown-divider") ||
                            element.classList.contains("dropdown-header"))) {
                            const module = this._getModuleFromName(element.textContent);
                            $(element)
                                .attr("data-original-title", CompareShips._getModifierFromModule(module.properties))
                                .tooltip({ boundary: "viewport", html: true });
                        }
                    }
                })
                    .selectpicker({
                    actionsBox: true,
                    countSelectedText(amount) {
                        return `${amount} ${type.toLowerCase()}s selected`;
                    },
                    deselectAllText: "Clear",
                    liveSearch: true,
                    liveSearchNormalize: true,
                    liveSearchPlaceholder: "Search ...",
                    maxOptions: type.startsWith("Ship trim") ? 6 : 5,
                    selectedTextFormat: "count > 1",
                    title: `${type}`,
                    width: "150px",
                });
            }
        }
        this._resetModuleSelects(columnId);
    }
    _getShipData(columnId) {
        const shipDataDefault = this._shipData.find((ship) => ship.id === this._shipIds[columnId]);
        let shipDataUpdated = shipDataDefault;
        shipDataUpdated.repairAmount = {
            armour: hullRepairsPercent,
            armourPerk: 0,
            sails: rigRepairsPercent,
            sailsPerk: 0,
        };
        shipDataUpdated.repairTime = { sides: repairTime, default: repairTime };
        shipDataUpdated.resistance = {
            fire: 0,
            leaks: 0,
            splinter: 0,
        };
        shipDataUpdated = this._addModulesAndWoodData(shipDataDefault, shipDataUpdated, columnId);
        return shipDataUpdated;
    }
    _adjustValue(value, key, isBaseValueAbsolute) {
        var _a, _b;
        let adjustedValue = value;
        if ((_a = this._modifierAmount.get(key)) === null || _a === void 0 ? void 0 : _a.absolute) {
            const { absolute } = this._modifierAmount.get(key);
            adjustedValue = CompareShips._adjustAbsolute(adjustedValue, absolute);
        }
        if ((_b = this._modifierAmount.get(key)) === null || _b === void 0 ? void 0 : _b.percentage) {
            const percentage = this._modifierAmount.get(key).percentage / 100;
            adjustedValue = CompareShips._adjustPercentage(adjustedValue, percentage, isBaseValueAbsolute);
        }
        return Math.trunc(adjustedValue * 100) / 100;
    }
    _setModifier(property) {
        var _a, _b, _c, _d;
        let absolute = property.isPercentage ? 0 : property.amount;
        let percentage = property.isPercentage ? property.amount : 0;
        if (this._modifierAmount.has(property.modifier)) {
            absolute += (_b = (_a = this._modifierAmount.get(property.modifier)) === null || _a === void 0 ? void 0 : _a.absolute) !== null && _b !== void 0 ? _b : 0;
            percentage += (_d = (_c = this._modifierAmount.get(property.modifier)) === null || _c === void 0 ? void 0 : _c.percentage) !== null && _d !== void 0 ? _d : 0;
        }
        this._modifierAmount.set(property.modifier, {
            absolute,
            percentage,
        });
    }
    _showCappingAdvice(compareId, modifiers) {
        var _a;
        const id = `${this._baseId}-${compareId}-capping`;
        let div = document.querySelector(`#${id}`);
        if (!div) {
            div = document.createElement("p");
            div.id = id;
            div.className = "alert alert-warning";
            const element = document.querySelector(`#${this._baseId}-${compareId}`);
            (_a = element === null || element === void 0 ? void 0 : element.firstChild) === null || _a === void 0 ? void 0 : _a.after(div);
        }
        div.innerHTML = `${[...modifiers].join(", ")} capped`;
    }
    _removeCappingAdvice(compareId) {
        const id = `${this._baseId}-${compareId}-capping`;
        const div = document.querySelector(`#${id}`);
        if (div) {
            div.remove();
        }
    }
    _addModulesAndWoodData(shipDataBase, shipDataUpdated, compareId) {
        const data = JSON.parse(JSON.stringify(shipDataUpdated));
        const setModifierAmounts = () => {
            for (const id of this._selectedUpgradeIdsList[compareId]) {
                const module = this._moduleProperties.get(id);
                for (const property of module.properties) {
                    if (this._moduleAndWoodChanges.has(property.modifier)) {
                        this._setModifier(property);
                    }
                }
            }
            if (this.woodCompare.instances[compareId]) {
                let dataLink = "_woodData";
                if (compareId !== "Base") {
                    dataLink = "_compareData";
                }
                for (const type of ["frame", "trim"]) {
                    for (const property of this.woodCompare.instances[compareId][dataLink][type].properties) {
                        if (this._moduleAndWoodChanges.has(property.modifier)) {
                            this._setModifier(property);
                        }
                    }
                }
            }
        };
        const adjustDataByModifiers = () => {
            var _a;
            for (const [key] of this._modifierAmount.entries()) {
                if ((_a = this._moduleAndWoodChanges.get(key)) === null || _a === void 0 ? void 0 : _a.properties) {
                    const { properties, isBaseValueAbsolute } = this._moduleAndWoodChanges.get(key);
                    for (const modifier of properties) {
                        const index = modifier.split(".");
                        if (index.length > 1) {
                            data[index[0]][index[1]] = this._adjustValue(data[index[0]][index[1]], key, isBaseValueAbsolute);
                        }
                        else {
                            data[index[0]] = this._adjustValue(data[index[0]], key, isBaseValueAbsolute);
                        }
                    }
                }
            }
        };
        const adjustDataByCaps = () => {
            const valueCapped = { isCapped: false, modifiers: new Set() };
            const adjustValue = (modifier, uncappedValue, baseValue, { amount: capAmount, isPercentage }) => {
                const valueRespectingCap = Math.min(uncappedValue, isPercentage ? baseValue * (1 + capAmount) : capAmount);
                if (uncappedValue !== valueRespectingCap) {
                    valueCapped.isCapped = true;
                    valueCapped.modifiers.add(modifier);
                }
                return valueRespectingCap;
            };
            for (const [modifier] of this._modifierAmount.entries()) {
                if (this._moduleAndWoodCaps.has(modifier)) {
                    const { cap } = this._moduleAndWoodCaps.get(modifier);
                    for (const property of this._moduleAndWoodCaps.get(modifier).properties) {
                        const index = property.split(".");
                        if (index.length > 1) {
                            if (data[index[0]][index[1]]) {
                                data[index[0]][index[1]] = adjustValue(modifier, data[index[0]][index[1]], shipDataBase[index[0]][index[1]], cap);
                            }
                        }
                        else if (data[index[0]]) {
                            data[index[0]] = adjustValue(modifier, data[index[0]], shipDataBase[index[0]], cap);
                        }
                    }
                }
            }
            if (valueCapped.isCapped) {
                this._showCappingAdvice(compareId, valueCapped.modifiers);
            }
            else {
                this._removeCappingAdvice(compareId);
            }
        };
        const setSpeedDegrees = () => {
            data.speedDegrees = data.speedDegrees.map((speed) => {
                const factor = 1 + this._modifierAmount.get("Max speed").percentage / 100;
                const newSpeed = speed > 0 ? speed * factor : speed / factor;
                return Math.max(Math.min(newSpeed, this._maxSpeed), this._minSpeed);
            });
        };
        this._modifierAmount = new Map();
        setModifierAmounts();
        adjustDataByModifiers();
        adjustDataByCaps();
        if (this._modifierAmount.has("Max speed")) {
            setSpeedDegrees();
        }
        return data;
    }
    _updateDifferenceProfileNeeded(id) {
        if (id !== "Base" && !isEmpty(this.selectedShips[id])) {
            ;
            this.selectedShips[id].updateDifferenceProfile();
        }
    }
    _updateSailingProfile(compareId) {
        this._updateDifferenceProfileNeeded(compareId);
        for (const otherCompareId of this.columnsCompare) {
            if (otherCompareId !== compareId) {
                this._updateDifferenceProfileNeeded(otherCompareId);
            }
        }
    }
    _refreshShips(compareId) {
        if (this._baseId === "ship-journey") {
            this.singleShipData = this._shipData.find((ship) => ship.id === this._shipIds[compareId]);
        }
        else {
            this._modulesSelected(compareId);
            const singleShipData = this._getShipData(compareId);
            if (compareId === "Base") {
                this._setSelectedShip(compareId, new ShipBase(compareId, singleShipData, this));
                for (const otherCompareId of this.columnsCompare) {
                    this._selectShip$[otherCompareId].removeAttr("disabled").selectpicker("refresh");
                    if (!isEmpty(this.selectedShips[otherCompareId])) {
                        this._setSelectedShip(otherCompareId, new ShipComparison(otherCompareId, singleShipData, this.selectedShips[otherCompareId].shipCompareData, this));
                    }
                }
            }
            else {
                this._setSelectedShip(compareId, new ShipComparison(compareId, this.selectedShips.Base.shipData, singleShipData, this));
            }
            this._updateSailingProfile(compareId);
        }
    }
    _enableCompareSelects() {
        for (const compareId of this.columnsCompare) {
            this._selectShip$[compareId].removeAttr("disabled").selectpicker("refresh");
        }
    }
    _modulesSelected(compareId) {
        this._selectedUpgradeIdsList[compareId] = [];
        this._selectedUpgradeIdsPerType[compareId] = {};
        for (const type of this._moduleTypes) {
            this._selectedUpgradeIdsPerType[compareId][type] = this._selectModule$[compareId][type].val();
            if (Array.isArray(this._selectedUpgradeIdsPerType[compareId][type])) {
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][type].map(Number);
            }
            else {
                this._selectedUpgradeIdsPerType[compareId][type] = this._selectedUpgradeIdsPerType[compareId][type]
                    ? [Number(this._selectedUpgradeIdsPerType[compareId][type])]
                    : [];
            }
            if (this._selectedUpgradeIdsPerType[compareId][type].length > 0) {
                this._selectedUpgradeIdsList[compareId] = this._selectedUpgradeIdsList[compareId].concat(this._selectedUpgradeIdsPerType[compareId][type]);
            }
        }
    }
    _setupSelectListener(compareId) {
        this._selectShip$[compareId].selectpicker({ title: "Ship" }).on("changed.bs.select", () => {
            this._shipIds[compareId] = Number(this._selectShip$[compareId].val());
            if (this._baseId !== "ship-journey") {
                this._setupModulesSelect(compareId);
            }
            this._refreshShips(compareId);
            if (compareId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects();
            }
            if (this._baseId !== "ship-journey") {
                this.woodCompare.enableSelects(compareId);
            }
        });
        if (this._baseId !== "ship-journey") {
            for (const type of ["frame", "trim"]) {
                this._selectWood$[compareId][type]
                    .on("changed.bs.select", () => {
                    this.woodCompare._woodSelected(compareId, type, this._selectWood$[compareId][type]);
                    this._refreshShips(compareId);
                })
                    .selectpicker({ title: `Wood ${type}`, width: "150px" });
            }
        }
    }
    _setShipAndWoodsSelects(ids) {
        let i = 0;
        this._columns.some((columnId) => {
            if (!this._shipData.find((ship) => ship.id === ids[i])) {
                return false;
            }
            this._shipIds[columnId] = ids[i];
            i += 1;
            CompareShips._setSelect(this._selectShip$[columnId], this._shipIds[columnId]);
            if (columnId === "Base" && this._baseId !== "ship-journey") {
                this._enableCompareSelects();
            }
            this.woodCompare.enableSelects(columnId);
            this._setupModulesSelect(columnId);
            if (ids[i]) {
                for (const type of ["frame", "trim"]) {
                    CompareShips._setSelect(this._selectWood$[columnId][type], ids[i]);
                    i += 1;
                    this.woodCompare._woodSelected(columnId, type, this._selectWood$[columnId][type]);
                }
            }
            else {
                i += 2;
            }
            this._refreshShips(columnId);
            return i >= ids.length;
        });
    }
    _setModuleSelects(urlParams) {
        for (const columnId of this._columns) {
            const columnIndex = this._columns.indexOf(columnId);
            let needRefresh = false;
            for (const type of [...this._moduleTypes]) {
                const typeIndex = [...this._moduleTypes].indexOf(type);
                if (urlParams.has(`${columnIndex}${typeIndex}`)) {
                    const moduleIds = hashids.decode(urlParams.get(`${columnIndex}${typeIndex}`));
                    if (!this._selectedUpgradeIdsPerType[columnId]) {
                        this._selectedUpgradeIdsPerType[columnId] = {};
                    }
                    if (!this._selectedUpgradeIdsList[columnId]) {
                        this._selectedUpgradeIdsList[columnId] = [];
                    }
                    this._selectedUpgradeIdsPerType[columnId][type] = moduleIds.map(Number);
                    CompareShips._setSelect(this._selectModule$[columnId][type], this._selectedUpgradeIdsPerType[columnId][type]);
                    this._selectedUpgradeIdsList[columnId].push(...this._selectedUpgradeIdsPerType[columnId][type]);
                    needRefresh = true;
                }
            }
            if (needRefresh) {
                this._refreshShips(columnId);
            }
        }
    }
    _getShipSelectId(columnId) {
        return `${this._baseId}-${columnId}-select`;
    }
    _getWoodSelectId(type, columnId) {
        return `${this._woodId}-${type}-${columnId}-select`;
    }
    _getModuleSelectId(type, columnId) {
        return `${this._moduleId}-${type.replace(/\s/, "")}-${columnId}-select`;
    }
    _setSelectedShip(columnId, ship) {
        this.selectedShips[columnId] = ship;
    }
}
//# sourceMappingURL=compare-ships.js.map