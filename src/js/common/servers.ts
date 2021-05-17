/*!
 * This file is part of na-map.
 *
 * @file      Game server data.
 * @module    servers
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

export const serverIds = ["eu1", "eu2"]!
export type ServerId = typeof serverIds[number]
export type ServerType = "PVE" | "PVP"

export interface Server {
    id: ServerId
    name: string
    type: ServerType
    icon: string
}

// If changed check also webpack.config
export const servers: Server[] = [
    { id: "eu1", name: "War", type: "PVP", icon: "war" },
    { id: "eu2", name: "Peace", type: "PVE", icon: "peace" },
]

/* testbed
   server_base_name="clean"
   source_base_url="http://storage.googleapis.com/nacleandevshards/"
   server_names=(dev)
*/

export const getServerType = (serverId: ServerId): ServerType => servers.find((server) => server.id === serverId)!.type
