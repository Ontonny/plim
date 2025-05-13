import React from 'react';

interface PasswordInputFieldNormalProps {
    component: any
    planValues: any
    setNewPlan: any
    index: any
}

const PasswordInputFieldNormal: React.FC<PasswordInputFieldNormalProps> = ({component, index, planValues, setNewPlan}) => {
    const value = String(planValues[component["key"]]);
    return (
        <div>
            <div>
                <label>
                    {component["text"]}
                    <div />
                    <input key={index} value={value} type="password" placeholder="Enter your password..." onChange={(e) =>setNewPlan(component["key"], e.target.value)}/>
                </label>
            </div>
        </div>
    );
};

export default PasswordInputFieldNormal;