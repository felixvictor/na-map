/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-var
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import servers from "../../../dist/js/common/servers.js";
export const GA_TRACKING_ID = "UA-109520372-1";
export const apiBaseFiles = ["ItemTemplates", "Ports", "Shops"];
export const serverNames = servers.map((server) => server.id);
export const serverTwitterNames = new Set(["eu1"]);
export const serverMaintenanceHour = 10;
export const mapSize = 8192;
export const distanceMapSize = 8192;
export const portBattleCooldown = 48;
export const flagValidity = 144;
//# sourceMappingURL=common-var.js.map