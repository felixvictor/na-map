/*!
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { initAnalytics, registerPage } from "./analytics";
import { servers } from "../common/servers";
import Cookie from "./util/cookie";
import RadioButton from "./util/radio-button";
import "../../scss/main.scss";
import { putImportError } from "./common/common-file";
SVGAnimatedString.prototype.indexOf = function () {
    return this.baseVal.indexOf.apply(this.baseVal, arguments);
};
const baseId = "server-name";
const radioButtonValues = servers.map((server) => server.id);
const cookie = new Cookie({ id: baseId, values: radioButtonValues });
const radios = new RadioButton(baseId, radioButtonValues);
const getServerName = () => {
    const r = cookie.get();
    radios.set(r);
    return r;
};
const getSearchParams = () => new URL(document.location.href).searchParams;
const serverNameSelected = () => {
    const serverId = radios.get();
    cookie.set(serverId);
    document.location.reload();
};
const setupListener = () => {
    ;
    document.getElementById(baseId).addEventListener("change", () => serverNameSelected());
    $(".dropdown-menu [data-toggle='dropdown']").on("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const element = $(event.currentTarget);
        element.siblings().toggleClass("show");
        if (!element.next().hasClass("show")) {
            element
                .parents(".dropdown-menu")
                .first()
                .find(".show")
                .removeClass("show");
        }
        element.parents(".nav-item.dropdown.show").on("hidden.bs.dropdown", () => {
            $(".dropdown-submenu .show").removeClass("show");
        });
    });
};
const loadMap = async (serverId, searchParams) => {
    try {
        const Map = await import("./browser/map/NAMap");
        const map = new Map.NAMap(serverId, searchParams);
        await map.MapInit();
        window.addEventListener("resize", () => {
            map.resize();
        });
    }
    catch (error) {
        putImportError(error);
    }
};
const loadGameTools = async (serverId, searchParams) => {
    try {
        const gameTools = await import("./browser/game-tools");
        gameTools.init(serverId, searchParams);
    }
    catch (error) {
        putImportError(error);
    }
};
const load = async () => {
    const serverId = getServerName();
    const searchParams = getSearchParams();
    history.replaceState("", document.title, window.location.origin + window.location.pathname);
    await loadMap(serverId, searchParams);
    if (searchParams.get("v")) {
        loadGameTools(serverId, searchParams);
    }
    else {
        ;
        document.getElementById("game-tools-dropdown").addEventListener("click", () => loadGameTools(serverId, searchParams), { once: true });
    }
};
const main = () => {
    initAnalytics();
    registerPage("Homepage");
    setupListener();
    load();
};
main();
//# sourceMappingURL=main.js.map