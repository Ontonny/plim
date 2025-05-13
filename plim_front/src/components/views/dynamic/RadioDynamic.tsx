import { clearBreakets, containsAtLeastOne } from '../../../utils';
import { Radio, RadioGroup } from '@blueprintjs/core';
import React from 'react';

interface RadioDynamicProps {
    component: any
    planValues: any
    setNewPlan: any
}

const RadioDynamic: React.FC<RadioDynamicProps> = ({component, planValues, setNewPlan}) => {

    const getRadioValue = (value: string) => {
        return value.split("[")[0]
    }
    return (
        <div>
            <RadioGroup label={component["text"]} onChange={(e) => setNewPlan(component["key"], getRadioValue(e.target.value))}>
                {component["data"] && component["data"].filter(
                    (comp:any) =>
                    containsAtLeastOne(comp, component["referenced_key"], planValues)
                )
                    .map((comp: any, i) => {
                    return <Radio label={clearBreakets(comp)} value={comp} key={i} />
                })}
            </RadioGroup>
        </div>
    );
};

export default RadioDynamic;