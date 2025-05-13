import { Radio, RadioGroup } from '@blueprintjs/core';
import React from 'react';

interface RadioNormalProps {
    component: any
    planValues: any
    setNewPlan: any
}

const RadioNormal: React.FC<RadioNormalProps> = ({component, planValues, setNewPlan}) => {

    return (
        <div>
            <RadioGroup label={component["text"]} onChange={(e) => setNewPlan(component["key"], e.target.value)} selectedValue={planValues[component["key"]]}>
                {component["data"] && component["data"].map((comp: any, i: any) => {
                    return <Radio label={comp} value={comp} key={i} />
                })}
            </RadioGroup>
        </div>
    );
};

export default RadioNormal;
