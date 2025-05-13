
import { Button, Collapse, CompoundTag, ControlGroup, Divider, H5, H6, HTMLSelect, InputGroup, MenuItem, PanelStack2, Pre, Switch, UL } from '@blueprintjs/core';
import React, { useEffect, useRef, useState } from 'react';
import { usePlansStore } from '../store';
import {
    Intent,
    type Panel,
    type PanelProps,

} from "@blueprintjs/core";
import {  ItemRendererProps, Select } from "@blueprintjs/select";
import PlanListComponent from '../components/PlanListComponent';
import PlanComponent from '../components/PlanComponent';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface Panel1Info {
}

const panelStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: '1 0 auto',
    padding: '10px',
    boxSizing: 'border-box' // this is added to make sure that the padding and border are included in the element's total width and height
  };

const PanelTitle = () => {
    const { activeProjectId, ref, triggerFormat, planType } = usePlansStore();
    return (
        <div style={{display: 'flex'}}>  
            <CompoundTag intent='primary' leftContent={"ProjectId: "}>{activeProjectId}&nbsp;&nbsp;</CompoundTag>
            <Divider />
            <CompoundTag intent='warning' leftContent={"Ref: "}>{ref}&nbsp;&nbsp;</CompoundTag>
            <Divider />
            <CompoundTag intent='success' leftContent={"PlanType: "}>{planType}&nbsp;&nbsp;</CompoundTag>
            <Divider />
            <CompoundTag color='black' leftContent={"TriggerApiFormat: "}>{triggerFormat}&nbsp;&nbsp;</CompoundTag>
        </div>
    );
};

const PlanSelectScreen: React.FC<PanelProps<Panel1Info>> = props => {
    const { activeProjectId, ref, triggerFormat, activePipelineName, setActivePlan } = usePlansStore();
    const { planName } = useParams();
    const panelIsOpen = useRef(false);
    const openNewPanel = () => {
        if (!panelIsOpen.current) {
            props.openPanel({
                renderPanel: ChoosePlanParametersScreen,
                title: <PanelTitle />
            });
            panelIsOpen.current = true;
        }
        console.log("Select plan screen props:", activePipelineName);
    };

    useEffect(() => {
        if (planName) {
            setActivePlan(planName);
            openNewPanel();
        }
    }, []);

    return (
        <div style={panelStyle}>
            <PlanListComponent/>
            <Button
                disabled={!activePipelineName}
                intent={Intent.PRIMARY}
                onClick={openNewPanel}
                text={`Go to selected plan`}
            />
        </div>
    );
};

interface Panel2Info {
    counter: number;
}

const ChoosePlanParametersScreen: React.FC<PanelProps<Panel2Info>> = props => {
    const openNewPanel = () => {
        props.openPanel({
            renderPanel: PlanExecutedScreen,
            title: `Plan Executed`,
        });
    };

    return (
        <div style={panelStyle}>
            <PlanComponent openNewPanel={openNewPanel} />
        </div>
    );
};

interface Panel3Info {
    intent: Intent;
}

const PlanExecutedScreen: React.FC<PanelProps<Panel3Info>> = props => {
    const openNewPanel = () => {
        props.openPanel({
            renderPanel: PlanSelectScreen,
            title: `Panel 1`,
        });
    };
    const { executedPipelineData, activePlanData, errorMessage, statusOk } = usePlansStore();

    
    const views = Object.keys(activePlanData?.views).map((view) => (
        <div key={view}>
            {JSON.stringify(activePlanData?.views[view])}
        </div>
    ));
    const ansible = activePlanData?.type === "gitlab-ansible-base64" ? Object.keys(activePlanData?.ansible).map((key) => (
        <div key={key}>
            {key} : {JSON.stringify(activePlanData?.ansible[key])}
        </div>
    )) : null;
    const [collapsePlanViewsIsOpen, setCollapsePlanViewsIsOpen] = React.useState(false);
    const pipelineData = executedPipelineData ? (
        <div>
            {executedPipelineData?.url && <a href={executedPipelineData?.url}>OPEN PIPELINE IN GITLAB - {executedPipelineData?.url}</a>}
            {executedPipelineData && <Pre key="pipelineData">
                ref: {executedPipelineData.ref} <br/>
                status: {executedPipelineData.status} <br/>
                tag: {executedPipelineData.tag?.toString()} <br/>
                yaml_errors: {executedPipelineData.yaml_errors} <br/>
                created_at: {executedPipelineData.created_at} <br/>
                user: {executedPipelineData.user.name} <br/>
                user_state: {executedPipelineData.user.state} <br/>
                user_username: {executedPipelineData.user.username} <br/>
                user_locked: {executedPipelineData.user.locked?.toString()} <br/>
                
            </Pre>}
        </div>
    ) : null;
    const backToPlanSelect = () => {
        props.openPanel({
            renderPanel: PlanSelectScreen,
        });
    }
    return (
        <div style={panelStyle}>
            <Button intent={Intent.PRIMARY} onClick={() => setCollapsePlanViewsIsOpen(!collapsePlanViewsIsOpen)} text="Show Plan Data" />
            <Collapse isOpen={collapsePlanViewsIsOpen}>
                <Pre key="views" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {views}
                </Pre>
                {ansible && <Pre key="ansible" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {ansible}
                </Pre>}
            </Collapse>
            {pipelineData && <Pre key="pipelineData">
                {pipelineData}
            </Pre>}
            {statusOk && <CompoundTag intent='success' leftContent={"status"}>OK</CompoundTag>}
            {!statusOk && <CompoundTag intent='danger' leftContent={"status"}>FAIL</CompoundTag>}
            {!statusOk && <CompoundTag intent='danger' leftContent={"Error"}>{errorMessage}</CompoundTag>}
            <Button intent={props.intent} onClick={backToPlanSelect} text="Back to Plan select" />
            {/* <Link to="/plans">Back to Plan select</Link> */}
        </div>
    );
};

const initialPanel: Panel<Panel1Info> = {
    props: {
        panelNumber: 1,
    },
    renderPanel: PlanSelectScreen,
    title: "Select PLAN to run",
};

const PlansWizard: React.FC<any> = (props) => {
    const { setActivePlan } = usePlansStore();
    const [currentPanelStack, setCurrentPanelStack] = useState<
        Array<Panel<Panel1Info | Panel2Info | Panel3Info>>
    >([initialPanel]);
    const addToPanelStack = React.useCallback(
        (plansWiz: Panel<Panel1Info | Panel2Info | Panel3Info>) => setCurrentPanelStack(stack => [...stack, plansWiz]),
        [],
    );
    const removeFromPanelStack = React.useCallback(() => setCurrentPanelStack(stack => stack.slice(0, -1)), []);
    const { planName } = useParams();
    useEffect(() => {
        console.log("PlanSelectScreen props:", planName);
        if (planName) {
            console.log("DIRECT EXECUTED:", planName);
            setActivePlan(planName);
        }
    }, []);
    return (
        <PanelStack2 key={planName}
            className='panel-wizard-style'
            onOpen={addToPanelStack}
            onClose={removeFromPanelStack}
            showPanelHeader={true}
            stack={currentPanelStack}
        />
    );
};
export default PlansWizard;