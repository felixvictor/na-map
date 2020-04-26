/*!
 * This file is part of na-map.
 *
 * @file      Get position.
 * @module    get-position
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _modal$, _ports, _baseId, _baseName, _buttonId, _input, _modalId, _NumberOfInputs, _numbers, _select, _selector;
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap-select/js/bootstrap-select";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../analytics";
import { copyF11ToClipboard } from "../util";
import Toast from "../util/toast";
import { convertInvCoordX, convertInvCoordY } from "../../common/common-math";
import { circleRadiusFactor, insertBaseModal } from "../../common/common-browser";
import { sortBy } from "../../common/common-node";
const sqr = (a) => a * a;
const norm = (a) => Math.sqrt(sqr(a.x) + sqr(a.y) + sqr(a.z));
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vectorSubtract = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
});
const vectorAdd = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
});
const vectorDivide = (a, b) => ({
    x: a.x / b,
    y: a.y / b,
    z: a.z / b,
});
const vectorMultiply = (a, b) => ({
    x: a.x * b,
    y: a.y * b,
    z: a.z * b,
});
const vectorCross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
});
const trilaterate = (p1, p2, p3, returnMiddle = false) => {
    const ex = vectorDivide(vectorSubtract(p2, p1), norm(vectorSubtract(p2, p1)));
    const i = dot(ex, vectorSubtract(p3, p1));
    let a = vectorSubtract(vectorSubtract(p3, p1), vectorMultiply(ex, i));
    const ey = vectorDivide(a, norm(a));
    const ez = vectorCross(ex, ey);
    const d = norm(vectorSubtract(p2, p1));
    const j = dot(ey, vectorSubtract(p3, p1));
    const x = (sqr(p1.r) - sqr(p2.r) + sqr(d)) / (2 * d);
    const y = (sqr(p1.r) - sqr(p3.r) + sqr(i) + sqr(j)) / (2 * j) - (i / j) * x;
    let b = sqr(p1.r) - sqr(x) - sqr(y);
    if (Math.abs(b) < 0.0000000001) {
        b = 0;
    }
    const z = Math.sqrt(b);
    if (Number.isNaN(z)) {
        return null;
    }
    a = vectorAdd(p1, vectorAdd(vectorMultiply(ex, x), vectorMultiply(ey, y)));
    const p4a = vectorAdd(a, vectorMultiply(ez, z));
    const p4b = vectorSubtract(a, vectorMultiply(ez, z));
    if (z === 0 || returnMiddle) {
        return a;
    }
    return [p4a, p4b];
};
export default class TrilateratePosition {
    constructor(ports) {
        _modal$.set(this, {});
        _ports.set(this, void 0);
        _baseId.set(this, void 0);
        _baseName.set(this, void 0);
        _buttonId.set(this, void 0);
        _input.set(this, []);
        _modalId.set(this, void 0);
        _NumberOfInputs.set(this, void 0);
        _numbers.set(this, void 0);
        _select.set(this, []);
        _selector.set(this, []);
        __classPrivateFieldSet(this, _ports, ports);
        __classPrivateFieldSet(this, _NumberOfInputs, 3);
        __classPrivateFieldSet(this, _numbers, [...new Array(__classPrivateFieldGet(this, _NumberOfInputs)).keys()]);
        __classPrivateFieldSet(this, _baseName, "Get position");
        __classPrivateFieldSet(this, _baseId, "get-position");
        __classPrivateFieldSet(this, _buttonId, `button-${__classPrivateFieldGet(this, _baseId)}`);
        __classPrivateFieldSet(this, _modalId, `modal-${__classPrivateFieldGet(this, _baseId)}`);
        for (const inputNumber of __classPrivateFieldGet(this, _numbers)) {
            __classPrivateFieldGet(this, _select)[inputNumber] = `${__classPrivateFieldGet(this, _baseId)}-${inputNumber}-select`;
            __classPrivateFieldGet(this, _input)[inputNumber] = `${__classPrivateFieldGet(this, _baseId)}-${inputNumber}-input`;
        }
        this._setupListener();
    }
    _navbarClick(event) {
        registerEvent("Menu", "Get position");
        event.stopPropagation();
        this._positionSelected();
    }
    _setupListener() {
        var _a;
        (_a = document.querySelector(`#${__classPrivateFieldGet(this, _buttonId)}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (event) => this._navbarClick(event));
    }
    _injectModal() {
        insertBaseModal({ id: __classPrivateFieldGet(this, _modalId), title: __classPrivateFieldGet(this, _baseName), size: "", buttonText: "Go" });
        const body = d3Select(`#${__classPrivateFieldGet(this, _modalId)} .modal-body`);
        body.append("div").attr("class", "alert alert-primary").attr("role", "alert").text("Use in-game trader tool.");
        const form = body.append("form");
        const dataList = form.append("datalist").attr("id", "defaultDistances");
        for (const distance of [5, 10, 15, 20, 30, 50, 100, 200]) {
            dataList.append("option").attr("value", distance);
        }
        for (const inputNumber of __classPrivateFieldGet(this, _numbers)) {
            const formRow = form.append("div").attr("class", "form-row");
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("label")
                .append("select")
                .attr("name", __classPrivateFieldGet(this, _select)[inputNumber])
                .attr("id", __classPrivateFieldGet(this, _select)[inputNumber])
                .attr("class", "selectpicker");
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("input")
                .attr("id", __classPrivateFieldGet(this, _input)[inputNumber])
                .attr("name", __classPrivateFieldGet(this, _input)[inputNumber])
                .attr("type", "number")
                .attr("class", "form-control")
                .attr("placeholder", "Distance in k")
                .attr("step", 1)
                .attr("list", "defaultDistances")
                .attr("min", 0)
                .attr("max", 1000);
        }
    }
    _setupSelects() {
        const selectPorts = __classPrivateFieldGet(this, _ports).portDataDefault
            .map((d) => ({
            id: d.id,
            coord: [d.coordinates[0], d.coordinates[1]],
            name: d.name,
            nation: d.nation,
        }))
            .sort(sortBy(["name"]));
        const options = `${selectPorts
            .map((port) => `<option data-subtext="${port.nation}">${port.name}</option>`)
            .join("")}`;
        for (const inputNumber of __classPrivateFieldGet(this, _numbers)) {
            __classPrivateFieldGet(this, _selector)[inputNumber] = document.querySelector(`#${__classPrivateFieldGet(this, _select)[inputNumber]}`);
            __classPrivateFieldGet(this, _selector)[inputNumber].insertAdjacentHTML("beforeend", options);
            $(__classPrivateFieldGet(this, _selector)[inputNumber]).selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Select port",
                virtualScroll: true,
            });
        }
    }
    _initModal() {
        this._injectModal();
        this._setupSelects();
    }
    _showAndGoToPosition() {
        const circles = __classPrivateFieldGet(this, _ports).portData.map((port) => {
            var _a;
            return ({
                x: port.coordinates[0],
                y: port.coordinates[1],
                z: 0,
                r: (_a = port.distance) !== null && _a !== void 0 ? _a : 0,
            });
        });
        const position = trilaterate(circles[0], circles[1], circles[2], true);
        if (position) {
            position.x = Math.round(position.x);
            position.y = Math.round(position.y);
            __classPrivateFieldGet(this, _ports).map.f11.printCoord(position.x, position.y);
            __classPrivateFieldGet(this, _ports).map.zoomAndPan(position.x, position.y, 1);
            const coordX = Math.round(convertInvCoordX(position.x, position.y) / -1000);
            const coordY = Math.round(convertInvCoordY(position.x, position.y) / -1000);
            copyF11ToClipboard(coordX, coordY, __classPrivateFieldGet(this, _modal$));
            new Toast("Get position", "Coordinates copied to clipboard.");
        }
        else {
            new Toast("Get position", "No intersection found.");
        }
    }
    _useUserInput() {
        const roundingFactor = 1.04;
        const ports = new Map();
        for (const inputNumber of __classPrivateFieldGet(this, _numbers)) {
            const port = __classPrivateFieldGet(this, _selector)[inputNumber].selectedIndex
                ? __classPrivateFieldGet(this, _selector)[inputNumber].options[__classPrivateFieldGet(this, _selector)[inputNumber].selectedIndex].text
                : "";
            const distance = Number(document.querySelector(`#${__classPrivateFieldGet(this, _input)[inputNumber]}`).value);
            if (distance && port !== "") {
                ports.set(port, distance * roundingFactor * circleRadiusFactor);
            }
        }
        if (ports.size === __classPrivateFieldGet(this, _NumberOfInputs)) {
            __classPrivateFieldGet(this, _ports).setShowRadiusSetting("position");
            __classPrivateFieldGet(this, _ports).portData = __classPrivateFieldGet(this, _ports).portDataDefault
                .filter((port) => ports.has(port.name))
                .map((port) => {
                port.distance = ports.get(port.name);
                return port;
            });
            __classPrivateFieldGet(this, _ports).update();
            this._showAndGoToPosition();
        }
        else {
            new Toast("Get position", "Not enough data.");
        }
    }
    _positionSelected() {
        if (!document.querySelector(`#${__classPrivateFieldGet(this, _modalId)}`)) {
            this._initModal();
            __classPrivateFieldSet(this, _modal$, $(`#${__classPrivateFieldGet(this, _modalId)}`));
        }
        __classPrivateFieldGet(this, _modal$).modal("show").one("hidden.bs.modal", () => {
            this._useUserInput();
        });
    }
}
_modal$ = new WeakMap(), _ports = new WeakMap(), _baseId = new WeakMap(), _baseName = new WeakMap(), _buttonId = new WeakMap(), _input = new WeakMap(), _modalId = new WeakMap(), _NumberOfInputs = new WeakMap(), _numbers = new WeakMap(), _select = new WeakMap(), _selector = new WeakMap();
//# sourceMappingURL=get-position.js.map