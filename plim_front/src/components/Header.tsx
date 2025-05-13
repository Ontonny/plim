import { CompoundTag, Icon, IconSize, Tag } from '@blueprintjs/core';
import { useAuthenticationStore, useMenuStore, useSettingsStore } from '../store';
import React, { useEffect } from 'react';
import useHealthcheck from './Healthcheck';

const Header: React.FC = () => {
  const { logoutUser } = useAuthenticationStore();
  const { data, searchingPlanName, setSearchingPlanName } = useMenuStore();
  const logoSize = 25;
  const { getUserInfo } = useMenuStore();
  const { settings, getHealthcheckUrl } = useSettingsStore();
  const { healthcheckStatus } = useHealthcheck(getHealthcheckUrl(), settings.healthcheckInterval);
  useEffect(() => {
    getUserInfo();
  }, []);
  return (
    <header style={styles.header}>
    <h1 style={{fontSize:logoSize}}><Icon intent='warning' icon="wrench" size={logoSize}/> PLIM</h1>
      <CompoundTag intent={data.username == "admin" ? "danger" : "success"} leftContent={"Hello: "}>{data.full_name}</CompoundTag>
      <CompoundTag leftContent={"Email: "}>{data.email}</CompoundTag>
      <CompoundTag leftContent={"Groups: "}> {data.groups.join(', ')}</CompoundTag>
      <input placeholder="Search plan" type="text" value={searchingPlanName} onChange={(e) => setSearchingPlanName(e.target.value)} />
      <div>
        <CompoundTag intent={healthcheckStatus == "error" ? "danger" : "success"} leftContent={"Healthcheck: "}> {healthcheckStatus}</CompoundTag>
        <button style={styles.button} onClick={logoutUser}>Logout</button>
      </div>
    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#282c34',
    color: 'white',
  },
  button: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    marginLeft: '10px',
  },
};

export default Header;
