/// <reference types="jquery"/>

import { Moment } from "moment"

interface Icon {
    time: string
    date: string
    up: string
    down: string
    previous: string
    next: string
    today: string
    clear: string
    close: string
}

interface Tooltip {
    today: string
    clear: string
    close: string
    selectMonth: string
    prevMonth: string
    nextMonth: string
    selectYear: string
    prevYear: string
    nextYear: string
    selectDecade: string
    prevDecade: string
    nextDecade: string
    prevCentury: string
    nextCentury: string
    pickHour: string
    incrementHour: string
    decrementHour: string
    pickMinute: string
    incrementMinute: string
    decrementMinute: string
    pickSecond: string
    incrementSecond: string
    decrementSecond: string
    togglePeriod: string
    selectTime: string
    selectDate: string
}

interface Button {
    showToday: boolean
    showClear: boolean
    showClose: boolean
}

type ParseInputDateF = (inputDate: Moment) => Moment

interface Options {
    allowInputToggle?: boolean
    allowMultidate?: boolean
    buttons?: Button
    calendarWeeks?: boolean
    collapse?: boolean
    daysOfWeekDisabled?: number[]
    dayViewHeaderFormat?: string
    debug?: boolean
    defaultDate?: Moment
    disabledDates?: Moment[]
    disabledHours?: number[]
    disabledTimeIntervals?: Moment[][]
    enabledDates?: Moment[]
    enabledHours?: number[]
    extraFormats?: string[]
    focusOnShow?: boolean
    format?: string
    icons?: Icon
    ignoreReadonly?: boolean
    inline?: boolean
    keepInvalid?: boolean
    keepOpen?: boolean
    keyBinds?: string
    locale?: string
    maxDate?: Moment | null
    minDate?: Moment | null
    multidateSeparator?: string
    parseInputDate?: ParseInputDateF
    sideBySide?: boolean
    stepping?: number
    timeZone?: string
    toolbarPlacement?: "default" | "top" | "bottom"
    tooltips?: Tooltip
    useCurrent?: "year" | "month" | "day" | "hour" | "minute"
    useStrict?: boolean
    viewDate?: Moment
    viewMode?: "times" | "days" | "months" | "years" | "decades"
    widgetParent?: string
    widgetPositioning?: string
}

interface JQuery {
    datetimepicker(options?: Options): void
}
