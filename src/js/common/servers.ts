/*!
 * This file is part of na-map.
 *
 * @file      Game server data.
 * @module    servers
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

export const serverIds = ["eu1", "eu2"] as const
export type ServerId = typeof serverIds[number]

export interface Server {
    id: ServerId
    name: string
    type: string
}

export const servers = [
    { id: "eu1", name: "War", type: "PVP" },
    { id: "eu2", name: "Peace", type: "PVE" },
]

/* testbed
   server_base_name="clean"
   source_base_url="http://storage.googleapis.com/nacleandevshards/"
   server_names=(dev)
*/
