import { useMenuStore } from '../store';
import { Button, ButtonGroup, EntityTitle } from '@blueprintjs/core';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';



const Sidebar: React.FC = () => {
  const { isAdmin } = useMenuStore();
  const onNavigate = useNavigate();
  useEffect(() => {
    onNavigate('/plans');
  }, []);
  return (
    <div>
      <ButtonGroup  minimal={true} vertical={true}>
        <Button  onClick={() => onNavigate('/plans')} >
        <EntityTitle icon={"fork"} title={"\u00A0\u00A0Plans"} ></EntityTitle>
        </Button>
        <Button onClick={() => onNavigate('/tree')} >
        <EntityTitle icon={"tree"} title={"\u00A0\u00A0Tree"} ></EntityTitle>
        </Button>
        {isAdmin && <Button onClick={() => onNavigate('/users')} >
          <EntityTitle icon={"user"} title={"\u00A0\u00A0Users"} ></EntityTitle>
          </Button>}
          <Button onClick={() => onNavigate('/logs')} >
        <EntityTitle icon={"list"} title={"\u00A0\u00A0My Logs"} ></EntityTitle>
        </Button>
        <Button onClick={() => onNavigate('/etcd')} >
        <EntityTitle icon={"database"} title={"\u00A0\u00A0Etcd"} ></EntityTitle>
        </Button>
        <Button onClick={() => onNavigate('/settings')} >
        <EntityTitle icon={"settings"} title={"\u00A0\u00A0Settings"} ></EntityTitle>
        </Button>
        {isAdmin && <Button onClick={() => onNavigate('/genPass')} >
        <EntityTitle icon={"key"} title={"\u00A0GenPasss"} ></EntityTitle>
          </Button>}
      </ButtonGroup>
    </div>
  );
};

export default Sidebar;
