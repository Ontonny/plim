import { containsAtLeastOne } from '../../../utils';
import { Checkbox } from '@blueprintjs/core';
import React from 'react';

interface CheckboxDynamicProps {
    component: any
    planValues: any
    setNewPlan: any
    index: any
}

const CheckboxDynamic: React.FC<CheckboxDynamicProps> = ({component, index, planValues, setNewPlan}) => {
    const value = Boolean(planValues[component["key"]])
    return (
        <div>
            <label>
                {component["text"]}
                
                {component["data"] && component["data"].filter(
                    (comp:any) =>
                    containsAtLeastOne(comp, component["referenced_key"], planValues)
                )
                    .map((comp: any, i: any) => {
                    return <Checkbox label={component["key"]} checked={value} key={index} onChange={() =>setNewPlan(component["key"], !value)}/>
                })}
            </label>
        </div>
    );
};

export default CheckboxDynamic;