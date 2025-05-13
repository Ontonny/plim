import { clearBreakets, containsAtLeastOne } from '../../../utils';
import React from 'react';

interface SelectDynamicProps {
    component: any
    planValues: any
    setNewPlan: any
}

const SelectDynamic: React.FC<SelectDynamicProps> = ({component, planValues, setNewPlan}) => {

    const getSelectValue = (value: string) => {
        return value.split("[")[0]
    }
    return (
        <div>
            <select label={component["text"]} onChange={(e) => setNewPlan(component["key"], getSelectValue(e.target.value))}>
                {component["data"] && component["data"].filter(
                    (comp:any) =>
                    containsAtLeastOne(comp, component["referenced_key"], planValues)
                )
                    .map((comp: any, i) => {
                    return <option label={clearBreakets(comp)} value={comp} key={i} />
                })}
            </select>
        </div>
    );
};

export default SelectDynamic;