import React from 'react';

interface FooterProps {
    
}
const currentEnviroment = import.meta.env.MODE

const Footer: React.FC<FooterProps> = () => {
    return (
        <div>
        <pre style={{ fontSize: "10px", textAlign: "center", padding: "0px" }} className="bp5-code-block">Plan Launcher for your Infrastructure Management.<br></br> running in {currentEnviroment} mode</pre>
        </div>
    );
};

export default Footer;
