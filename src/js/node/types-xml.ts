/**
 * This file is part of na-map.
 *
 * @file      Types for xml game files.
 * @module    types-xml
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

// https://jvilk.com/MakeTypes/

export interface XmlCannon {
    ModuleTemplate: ModuleTemplate
}
interface ModuleTemplate {
    _attributes: UnderscoreAttributes
    Attributes: Attributes
}
interface UnderscoreAttributes {
    Name: string
}
interface Attributes {
    Pair: PairEntity[]
}
export interface PairEntity {
    Key: TextEntity
    Value: Value
}
interface Value {
    Value: TextEntity | ValueEntity[]
}
export interface ValueEntity {
    Time: TextEntity
    Value: TextEntity
    TangentIn: TextEntity
    TangentOut: TextEntity
}
interface TextEntity {
    _text: string
}
