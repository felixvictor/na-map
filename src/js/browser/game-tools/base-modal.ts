/*!
 * This file is part of na-map.
 *
 * @file      base modal class.
 * @module    game-tools/base-modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { HtmlString } from "common/interface"

export class BaseModal {
    readonly serverId: string
    readonly baseName: string
    readonly baseId: HtmlString
    readonly buttonId: HtmlString
    readonly modalId: HtmlString

    constructor(serverId: string, title: string) {
        this.serverId = serverId
        this.baseName = title
        this.baseId = title.toLocaleLowerCase().replaceAll(" ", "-")
        this.buttonId = `button-${this.baseId}`
        this.modalId = `modal-${this.baseId}`
    }
}
