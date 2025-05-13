import { Checkbox } from '@blueprintjs/core';
import React from 'react';

interface CheckboxNormalProps {
    component: any
    planValues: any
    setNewPlan: any
    index: any
}

const CheckboxNormal: React.FC<CheckboxNormalProps> = ({component, index, planValues, setNewPlan}) => {
    const checked = Boolean(planValues[component["key"]]);
    return (
        <div>
            <label>
            {component["text"]}
                <Checkbox checked={checked} key={index} onChange={() =>setNewPlan(component["key"], !checked)}>
                    {component["key"].toLowerCase()}
                </Checkbox>
            </label>
        </div>
    );
};

export default CheckboxNormal;
