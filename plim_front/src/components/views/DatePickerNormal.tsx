import React, { useCallback, useEffect, useState } from 'react';
import { DateInput3 } from "@blueprintjs/datetime2";
import enUS from "date-fns/locale/en-US";

interface DatePickerProps {
    component: any
    planValues: any
    setNewPlan: any
}

// const loadDateFnsLocale: (localeCode: string) => Promise<Locale> = async (
//     localeCode,
//   ) => {
//     const localeModule = await import(
//       `../../../node_modules/date-fns/esm/locale/${localeCode}/index.js`
//     );
//     return localeModule.default;
//   };
const DatePickerNormal: React.FC<DatePickerProps> = ({component, planValues, setNewPlan}) => {
    const formatDate = useCallback((date: Date) => date.toLocaleString(), []);
    const parseDate = useCallback((str: string) => new Date(str), []);

    useEffect(() => {
        setNewPlan(component["key"], planValues[component["key"]])
    }, []);

    return (
        <>
            <label>
                {component["text"]}
            <DateInput3 style={{ marginLeft: '500px'}}
                formatDate={formatDate}
                locale={enUS}
                highlightCurrentDay={true}
                // shortcuts={true}
                // dateFnsLocaleLoader={loadDateFnsLocale}
                onChange={(e) =>setNewPlan(component["key"], e)}
                // onChange={ (e)=> console.log(e)}
                parseDate={parseDate}
                placeholder="M/D/YYYY"
                value={planValues[component["key"]]}
             />
            </label>
        </>
    );
};

export default DatePickerNormal;