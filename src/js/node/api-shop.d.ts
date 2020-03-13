/*!
 * This file is part of na-map.
 *
 * @file      Types for api port json.
 * @module    api-shop.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

/****************************
 * Shops
 */

export interface APIShop {
    Id: string
    Created: string
    Modified: string
    RegularItems: RegularItemsEntity[]
    ResourcesProduced: ProducedOrConsumedEntity[]
    ResourcesAdded: AddedEntity[]
    ResourcesConsumed: ProducedOrConsumedEntity[]
}
interface RegularItemsEntity {
    TemplateId: number
    Quantity: number
    SellPrice: number
    BuyPrice: number
    BuyContractQuantity: number
    SellContractQuantity: number
}
interface ProducedOrConsumedEntity {
    Key: number
    Value: number
}
interface AddedEntity {
    Template: number
    Amount: number
    Chance: number
    IsTrading: boolean
    Source: string
}
