import { Checkbox } from '@blueprintjs/core';
import React from 'react';

interface CheckboxListProps {
    component: {
      keys: string[];
      text: string;
    };
    index: number;
    planValues: Record<string, boolean>;
    setNewPlan: (key: string, value: boolean) => void;
  }

const CheckboxList: React.FC<CheckboxListProps> = ({component, index, planValues, setNewPlan}) => {
    const keys = component["keys"];
    return (
        <div>
            <label>
            {component["text"]}
            {keys && keys.map((key: string, i: number) => {
                return (
                    <Checkbox checked={planValues[key] ?? false} key={index + i} onChange={() =>setNewPlan(key, !planValues[key])}>
                        {key.toLowerCase()}
                    </Checkbox>
                )
            })}
            </label>
        </div>
    );
};

export default CheckboxList;
