/*!
 * This file is part of na-map.
 *
 * @file      Game server data.
 * @module    servers
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
export const servers = [
    { id: "eu1", name: "War", type: "PVP" },
    { id: "eu2", name: "Peace", type: "PVE" },
];
export const serverNames = servers.map((server) => server.id);
//# sourceMappingURL=servers.js.map