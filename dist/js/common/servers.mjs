/*!
 * This file is part of na-map.
 *
 * @file      Game server data.
 * @module    servers
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
export const serverIds = ["eu1", "eu2"];
export const servers = [
    { id: "eu1", name: "War", type: "PVP", icon: "war" },
    { id: "eu2", name: "Peace", type: "PVE", icon: "peace" },
];
export const getServerType = (serverId) => servers.find((server) => server.id === serverId).type;
//# sourceMappingURL=servers.js.map