/*!
 * This file is part of na-map.
 *
 * @file      Types for xml game files.
 * @module    xml.d
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

interface MainUnderscoreAttributes<type> {
    Name: string
    Type: type | string
}
interface Attributes {
    Pair: PairEntity[]
}
export interface PairEntity {
    Key: TextEntity
    Value: Value
}
interface Value {
    _attributes: ValueUnderscoreAttributes
    Value: TextEntity | TangentEntity[]
}
export interface ValueUnderscoreAttributes {
    "xsi:type": string
    Action: string
    IsLocal: string
    IsPermanent: string
    IsNegative: string
}
export interface TangentEntity {
    Time: TextEntity
    Value: TextEntity
    TangentIn: TextEntity
    TangentOut: TextEntity
}
export interface TextEntity {
    _text: string
}

/****************************
 * Cannons
 */

export interface XmlGeneric {
    _attributes: MainUnderscoreAttributes<string>
    Attributes: Attributes
}

/****************************
 * Repairs
 */

export interface XmlRepair {
    _attributes: MainUnderscoreAttributes<"REPAIR_KIT">
    Attributes: Attributes
}
