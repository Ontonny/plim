import React from 'react';

interface SelectNormalProps {
    component: any
    planValues: any
    setNewPlan: any
}

const SelectNormal: React.FC<SelectNormalProps> = ({component, planValues, setNewPlan}) => {
    return (
        <div>
            <label>
                {component["text"]}
                <div />
                <select value={planValues[component["key"]]} onChange={(e) =>setNewPlan(component["key"], e.target.value)}>
                    {component["data"] && component["data"].map((comp: any, i) => {
                        return <option value={comp} key={i}>{comp}</option>
                    })}
                </select>
            </label>
        </div>
    );
};

export default SelectNormal;