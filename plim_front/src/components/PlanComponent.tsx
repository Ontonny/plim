import { useAnsibleStore, useGitlabStore, usePlansStore } from "../store";
import { AnchorButton, Button, ButtonGroup, Card, Checkbox, Classes, CompoundTag, ControlGroup, Divider, EntityTitle, FormGroup, H1, H4, H5, Intent, Menu, MenuItem, NumericInput, Overlay, Overlay2, OverlaysProvider, Popover, Radio, RadioGroup, Switch, Tag, TagInput } from "@blueprintjs/core";
import { ReactNode, useCallback, useEffect, useState } from "react";
import CheckboxNormal from "./views/CheckboxNormal";
import RadioNormal from "./views/RadioNormal";
import SelectNormal from "./views/SelectNormal";
import InputFieldNormal from "./views/InputFieldNormal";
import HiddenNormal from "./views/HiddenNormal";
import PasswordInputFieldNormal from "./views/PasswordInputFieldNormal";
import CheckboxDynamic from "./views/dynamic/CheckboxDynamic";
import RadioDynamic from "./views/dynamic/RadioDynamic";
import DatePickerNormal from "./views/DatePickerNormal";
import AnsibleSelectSideBar from "./AnsibleViewComponent";
import React from "react";

import CheckboxList from "./views/list/CheckboxList";
import AnsibleMainMenu from "./AnsibleMainMenu";
import AnsibleGroupSelect from "./AnsibleGroupSelect";
import { ItemRendererProps, Select } from "@blueprintjs/select";
import { PlanToaster } from "./PlanToaster";
import SelectDynamic from "./views/dynamic/SelectDynamic";

interface PlanComponentProps {
    isOpen: boolean
    setIsOpen: void
    planValues: any
    activePipelineName: any
    openNewPanel: any
}

const StyledDiv = ({ className, children, style }) => {
    return (
        <div className={className} style={style}>
            {children}
        </div>
    );
};

const PlanRowComponent = ({ children, WrapperDiv }) => {
    return (
        <WrapperDiv>
            {children}
        </WrapperDiv>
    );
};


const PopoverRunMenu: React.FC<PlanComponentProps> = ({ isOpen, setIsOpen, planValues, activePipelineName, openNewPanel, ansibleValues, gitlabRef }) => {
    const { triggerPipeline, activePlanData } = usePlansStore();
    const { selectedGroups, selectedHosts } = useAnsibleStore();
    const [runIsDisabled, setRunIsDisabled] = useState(true);

    const ansibleHostsIsEmpty = () => {
        if (selectedGroups.length > 0 || selectedHosts.length > 0) {
            return false
        }
        return true
    }

    useEffect(() => {
        if (activePlanData?.type === "gitlab-ansible-base64") {
            setRunIsDisabled(ansibleHostsIsEmpty())
        } else {
            setRunIsDisabled(false)
        }
    }, [selectedGroups, selectedHosts, activePlanData?.type])
    
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Popover
                content={
                    <div key="text" style={{ padding: '20px' }}>
                        <H5>Confirm execution</H5>
                        <p>Are you sure you want to run? You won't be able to stop this.</p>
                        <H4 hidden={!runIsDisabled} style={{ color: "red" }}>NO HOSTS SELECTED</H4>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 15 }}>
                            <Button className={Classes.POPOVER_DISMISS} style={{ marginRight: 10 }} onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => {
                                triggerPipeline(planValues, activePipelineName, ansibleValues, gitlabRef)
                                openNewPanel()
                            }}
                                intent={Intent.DANGER} className={Classes.POPOVER_DISMISS} disabled={runIsDisabled}>
                                RUN
                            </Button>
                        </div>
                    </div>
                }
                renderTarget={({ isOpen, ...props }) => (
                    <Button {...props} active={isOpen} intent={Intent.PRIMARY} text="RUN PIPELENE PLAN" rightIcon="arrow-right" />
                    )}
                enforceFocus={false}
                interactionKind="click"
                isOpen={isOpen}
                onInteraction={state => {
                    setIsOpen(state)
                }}
                placement="top"
            >
            </Popover>
        </div>
    );
};

const PlanComponent: React.FC = ({ openNewPanel }) => {
    const components: ReactNode[] = [];
    const { activeProjectId, activePipelineName, triggerPipeline, activePlanData, getPlan, ref } = usePlansStore();
    const [isOpen, setIsOpen] = useState(false);
    const toggleOverlay = useCallback(() => setIsOpen(open => !open), [setIsOpen]);
    const wrapperClass = Card;
    const [showAnsibleDrawler, setShowAnsibleDrawler] = useState(false);
    const { refs, getRefs } = useGitlabStore();
    const [planValues, setPlanValues] = useState({});
    const setNewPlanValue = (key: any, value: any) => {
        setPlanValues(planValues => ({
            ...planValues,
            [key]: value,
        }));
    };
    useEffect(() => {
        getPlan(activePipelineName)
    }, [])
    useEffect(() => {
        setSelectedRef(ref)
    }, [ref])
    useEffect(() => {
        if (activePlanData !== undefined) {
            setPlanValues({})
            getRefs(activePipelineName)
            activePlanData["views"].map((comp: any) => {
                if (comp["key"] !== undefined) {
                    setNewPlanValue(comp["key"], comp["value"])
                }
                if (comp["keys"] !== undefined) {
                    comp["keys"].map((key: any, i: any) => {
                        setNewPlanValue(key, comp["values"][i])
                    })
                }
            })
        }
    }, [activePlanData]);

    if (activePlanData !== undefined) {
        console.log(planValues);
        activePlanData["views"].map((component: any, index: any) => {
            const comp_type = component["type"]
            switch (comp_type) {
                case "date-picker":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <DatePickerNormal component={component} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    );
                    break;
                case "checkbox":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <CheckboxNormal component={component} index={index} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    );
                    break;
                case "checkbox-list":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <CheckboxList component={component} index={index} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    );
                    break;
                case "radio":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <RadioNormal component={component} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    )
                    break;
                case "select":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <SelectNormal component={component} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    )
                    break;
                case "input-field":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <InputFieldNormal component={component} index={index} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    )
                    break;
                case "password-input-field":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <PasswordInputFieldNormal component={component} index={index} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>
                    )
                    break;
                case "hidden":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index} style={{ display: 'none' }}>
                            <HiddenNormal index={index} name={component["text"]} />
                        </PlanRowComponent>
                    )
                    break;
                case "checkbox-dynamic":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <CheckboxDynamic component={component} index={index} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>)
                    break;
                case "radio-dynamic":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <RadioDynamic component={component} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>)
                    break;
                case "select-dynamic":
                    components.push(
                        <PlanRowComponent WrapperDiv={wrapperClass} key={comp_type + index}>
                            <SelectDynamic component={component} planValues={planValues} setNewPlan={setNewPlanValue} />
                        </PlanRowComponent>)
                    break;
                default:
                    break;
            }
        })
    }
    useEffect(() => {
        if (activePlanData && activePlanData.hasOwnProperty("ansible")) {
            setAnsibleValues(activePlanData["ansible"]);
            setSelectedInventory(activePipelineName);
            // console.log("selectedInventory: " + activePipelineName + JSON.stringify(activePlanData))
        }
    }, [activePlanData]);
    const [ansibleValues, setAnsibleValues] = useState();
    const [selectedInventory, setSelectedInventory] = useState();

    const setNewAnsible = (key: any, value: any) => {
        setAnsibleValues(planValues => ({
            ...planValues,
            [key]: value,
        }));
    };
    const getAnsibleVerbosity = () => {
        if (ansibleValues == undefined) return undefined
        return ansibleValues.verbosity == 0 ? undefined : ansibleValues.verbosity
    };

    const showAnsiblePanel = (planData: any) => {

        if (planData == undefined) {
            return null
        }
        if (planData.type == "gitlab-ansible-base64") {
            return (
                <>
                    <ControlGroup>
                        <Button onClick={() => setShowAnsibleDrawler(!showAnsibleDrawler)} rightIcon="arrow-right">Open ansible panel</Button>
                        <Divider />
                        <NumericInput min={0} max={4} style={{ width: '35px' }} fill={false} intent={"success"} placeholder="-v" value={getAnsibleVerbosity()} onValueChange={(e) => setNewAnsible("verbosity", e)} />
                        <Divider />
                        <Switch inline={true} innerLabelChecked="--diff" innerLabel="no diff" large={true} checked={ansibleValues !== undefined ? ansibleValues.diff : false} onChange={() => setNewAnsible("diff", !ansibleValues["diff"])} />
                        <Divider />
                        <Switch innerLabelChecked="--check" innerLabel="no check" inline={true} large={true} checked={ansibleValues !== undefined ? ansibleValues.check : false} onChange={() => setNewAnsible("check", !ansibleValues["check"])} />
                    </ControlGroup>
                    <ControlGroup>
                        <AnsibleGroupSelect />
                        <br />
                        <AnsibleMainMenu />
                        <AnsibleSelectSideBar selectedInventory={selectedInventory} showAnsibleDrawler={showAnsibleDrawler} setShowAnsibleDrawler={setShowAnsibleDrawler} />
                    </ControlGroup>
                </>
            )
        }
        return null
    }
    const [selectedRef, setSelectedRef] = useState<string | undefined>(ref);
    const renderRef = (item: { key: string; tag: string }, { handleClick, handleFocus, query }) => {
        return <MenuItem key={item.key} text={item.tag} onClick={handleClick} onFocus={handleFocus} query={query} />;
    };
    const filterRef = (query: string, item: any) => {
        return item.tag.toLowerCase().includes(query.toLowerCase());
    };
    const { copyPlanLinkToClipboard } = usePlansStore();
    const showCopyAnsibleCmdSuccess = async () => {
        (await PlanToaster).show({ message: "Ansible command is copied to clipboard", intent: "success", timeout: 500 });
    };
    const { getAnsibleCmd } = useAnsibleStore();
    return (
        <div style={{ width: '70%' }}>
            <Card style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <EntityTitle icon={"fork"} title={"Plan: " + activePipelineName} heading={H4} subtitle={"Select parameters and click the button to run the pipeline plan."}></EntityTitle>
            <Button icon="clipboard" intent={Intent.SUCCESS} text="Copy link" onClick={() => copyPlanLinkToClipboard()}/>
            </div>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Select<{ key: string; tag: string }>
                items={refs}
                itemRenderer={renderRef}
                itemPredicate={filterRef}
                onItemSelect={ (item) => {
                    setSelectedRef(item.tag)
                }}>
                <Button icon="git-branch" text={selectedRef ?? "Select ref"} intent="success"/>  
            </Select>
            {activePlanData && activePlanData.type === "gitlab-ansible-base64" && (
                    <Button active={isOpen} intent={Intent.WARNING} text="Copy Ansible Command" rightIcon="clipboard" onClick={() => {
                        getAnsibleCmd(planValues, ansibleValues)
                        showCopyAnsibleCmdSuccess()
                    }} />
                )}
            </div>
            </Card>
            {showAnsiblePanel(activePlanData)}
            {components}
            <br />
            <br />
            <PopoverRunMenu isOpen={isOpen} openNewPanel={openNewPanel} setIsOpen={setIsOpen} planValues={planValues} activePipelineName={activePipelineName} ansibleValues={ansibleValues} gitlabRef={selectedRef} />
        </div>
    );
};

export default PlanComponent;