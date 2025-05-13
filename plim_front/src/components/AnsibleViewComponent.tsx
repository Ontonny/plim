import { useAnsibleStore, usePlansStore } from '../store';
import { Checkbox, CheckboxCard, Classes, Drawer, Icon } from '@blueprintjs/core';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';



// TODO добавить поиск сделать оверлеем

function HostText(props: { hostName: string, children: React.ReactNode }) {
    const { selectedHosts, selectHost } = useAnsibleStore();
    const hostIsChecked = (hostName: string) => {
        return selectedHosts.includes(hostName);
    }
    return (
        <Checkbox onChange={() => selectHost(props.hostName)} checked={hostIsChecked(props.hostName)} style={{
            margin: 0,      // Remove margin
            padding: 0,     // Remove padding
            gap: 3
        }}>
            <br />
            <Icon icon="cloud-server" size={15} /><span className={classNames(Classes.TEXT_MUTED, Classes.TEXT_SMALL)}>{props.hostName}</span>
        </Checkbox>
    );
}

function AnsibleGroup(props: { groupName: string, children: React.ReactNode }) {
    const { selectedGroups, selectGroup } = useAnsibleStore();
    const groupIsChecked = (groupName: string) => {
        return selectedGroups.includes(groupName);
    }
    return (
        <div>
            <CheckboxCard style={{
                margin: 0,      // Remove margin
                padding: 10,     // Remove padding
            }} onChange={() => selectGroup(props.groupName)} checked={groupIsChecked(props.groupName)}>
                {props.groupName}
                {props.children}
            </CheckboxCard>
        </div>
    );
}

interface AnsibleViewComponentProps {
    showAnsibleDrawler: boolean
    setShowAnsibleDrawler: any
    selectedInventory: any
}

const AnsibleSelectSideBar: React.FC<AnsibleViewComponentProps> = ({selectedInventory, showAnsibleDrawler, setShowAnsibleDrawler}) => {
    const { ansibleData, getAnsibleGroups, selectGroup, selectHost, cleanAllSelected } = useAnsibleStore();
    const { activePlanData } = usePlansStore();
    useEffect(() =>{
        cleanAllSelected()
    },[])
    useEffect(

        () => {
        getAnsibleGroups(selectedInventory)
    }, [selectedInventory]);
const [searchingText, setSearchingText] = useState("");

const filterHostsNames = (name: string) => {
    return name.includes(searchingText)
};
    return (
        <Drawer className='bp5-dark'
            icon="info-sign"
            title="Ansible Panel"
            isOpen={showAnsibleDrawler}
            onClose={() => setShowAnsibleDrawler(!showAnsibleDrawler)}
        >
            <div className={Classes.DRAWER_BODY}>
                <div className={Classes.DIALOG_BODY}></div>
                   <input placeholder="Search host" type="text" value={searchingText} onChange={(e) => setSearchingText(e.target.value)} />
                {ansibleData.map((group, index) => (
                    <AnsibleGroup groupName={group.name} key={index + group.name}>
                        {group.hosts.map((host, index) => (
                            filterHostsNames(host.name) ? <HostText key={index + group.name} hostName={host.name}></HostText> : null
                        ))}
                    </AnsibleGroup>
                ))}
            </div>
            <div className={Classes.DRAWER_FOOTER}>Footer</div>
        </Drawer>
    );
};

export default AnsibleSelectSideBar;