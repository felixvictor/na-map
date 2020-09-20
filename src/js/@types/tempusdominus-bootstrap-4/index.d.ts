/* eslint-disable @typescript-eslint/no-explicit-any */

import { Dayjs } from "dayjs"

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

interface WidgetPositioningOptions {
    horizontal?: "auto" | "left" | "right"
    vertical?: "auto" | "top" | "bottom"
}

type ParseInputDateF = (inputDate: Dayjs) => Dayjs

interface DatetimepickerOption {
    allowInputToggle?: boolean
    allowMultidate?: boolean
    buttons?: Button
    calendarWeeks?: boolean
    collapse?: boolean
    daysOfWeekDisabled?: number[] | boolean
    dayViewHeaderFormat?: string
    debug?: boolean
    defaultDate?: boolean | Dayjs | Date | string
    disabledDates?: boolean | Array<Dayjs | Date | string> | any
    disabledHours?: boolean | number[] | any
    disabledTimeIntervals?: boolean | Dayjs[][]
    enabledDates?: boolean | Array<Dayjs | Date | string> | any
    enabledHours?: boolean | number[]
    extraFormats?: boolean | Array<string | Dayjs>
    focusOnShow?: boolean
    format?: boolean | string | Dayjs
    icons?: Icon
    ignoreReadonly?: boolean
    inline?: boolean
    keepInvalid?: boolean
    keepOpen?: boolean
    keyBinds?: { [key: string]: (widget: boolean | JQuery) => void }
    locale?: string
    maxDate?: boolean | Dayjs | Date | string
    minDate?: boolean | Dayjs | Date | string
    multidateSeparator?: string
    parseInputDate?: ParseInputDateF
    sideBySide?: boolean
    stepping?: number
    timeZone?: string
    toolbarPlacement?: "default" | "top" | "bottom"
    tooltips?: Tooltip
    useCurrent?: boolean | "year" | "month" | "day" | "hour" | "minute"
    useStrict?: boolean
    viewDate?: boolean | Dayjs | Date | string
    viewMode?: "times" | "days" | "months" | "years" | "decades"
    widgetParent?: string | JQuery
    widgetPositioning?: WidgetPositioningOptions
}

export interface DatetimepickerEvent extends JQuery.Event {
    date: Dayjs
}

interface JQuery {
    datetimepicker: ((options?: DatetimepickerOption) => void) & ((value: "viewDate") => Dayjs)
    /*
        on<TType extends string>(
            events: TType,
            handler: JQuery.TypeEventHandler<TElement, undefined, TElement, TElement, TType> |
                false
        ): this;
        */

    on: (events: "change.datetimepicker", handler: (eventobject: DatetimepickerEvent) => any) => JQuery
}
