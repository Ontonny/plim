import React from 'react';

interface InputFieldNormalProps {
    component: any
    planValues: any
    setNewPlan: any
    index: any
}

const InputFieldNormal: React.FC<InputFieldNormalProps> = ({component, index, planValues, setNewPlan}) => {
    const value = String(planValues[component["key"]]);
    return (
        <div>
            <label>
                {component["text"]}
                <div />
                <input key={index} value={value} type="text" placeholder="Filter histogram..." onChange={(e) =>setNewPlan(component["key"], e.target.value)}/>
            </label>
        </div>
    );
};

export default InputFieldNormal;