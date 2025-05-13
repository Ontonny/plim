import React from 'react';

interface HiddenNormalProps {
    index: any
}

const HiddenNormal: React.FC<HiddenNormalProps> = ({index, name}) => {
    return (
    <div key={index}>
        {name}
    </div>
    );
};

export default HiddenNormal;