
import { Button, ControlGroup, HTMLSelect, InputGroup } from '@blueprintjs/core';
import React, { useEffect } from 'react';
import  {usePlansStore } from '../store';

const PipelinesRender: React.FC = props => {
  const { pipeineName } = props;
    const { data, loading, error, getPipeline } = usePlansStore();
    useEffect(() => {
        getPipeline(pipeineName)
      }, []);
  return (
    <div>
      {data}
    </div>
  );
};

export default PipelinesRender;