import { useEffect, useState } from 'react';
import { useEtcdControlStore } from '../store';
import { Button, Card, SegmentedControl,  TextArea } from '@blueprintjs/core';

const EtcdControl: React.FC = () => {
  const { etcdData, error, setEtcdDataInventory, getEtcdDataViewsKeys, getEtcdDataInventoriesKeys, getEtcdDataInventory, getEtcdDataUsers, setEtcdDataView, getEtcdDataView } = useEtcdControlStore();
  useEffect(() => {
    getEtcdDataViewsKeys();
  }, []);
  const [selectedEtcdValue, setSelectedEtcdValue] = useState<any>("");
  const [selectedKeyPath, setSelectedKeyPath] = useState('');
  const [selectedSegmentedControl, setSelectedSegmentedControl] = useState('plans-views');
  const selectedMap = {
    'plans-views': () => {getEtcdDataViewsKeys(); setSelectionEmpty(); console.log('plans-views') },
    'inventories': () => {getEtcdDataInventoriesKeys(); setSelectionEmpty(); console.log('inventories') },
    'users': () => {getEtcdDataUsers(); setSelectionEmpty(); console.log('users') },
  }
  const setSelectionEmpty = () => {
    setSelectedKeyPath('');
    setSelectedEtcdValue('');
  }
  const handleSave = () => {
    if (selectedKeyPath && selectedEtcdValue) {
      let etcd = etcdData[selectedKeyPath as unknown as number];
      if (selectedSegmentedControl === 'plans-views') {
        try {
          // Try to parse as JSON first, if it fails, use the raw value
          const parsedValue = JSON.parse(selectedEtcdValue);
          const keyValueArray = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
          setEtcdDataView(etcd.etcd_name, etcd.key_path, keyValueArray);
        } catch {
          // If parsing fails, use the raw value
          setEtcdDataView(etcd.etcd_name, etcd.key_path, [selectedEtcdValue]);
        }
      } else if (selectedSegmentedControl === 'inventories') {
        setEtcdDataInventory(etcd.etcd_name, etcd.key_path, selectedEtcdValue);
      }
    }
    setSelectionEmpty()
  };
  useEffect(() => {
    console.log(selectedSegmentedControl);
    selectedMap[selectedSegmentedControl as keyof typeof selectedMap]();
  }, [selectedSegmentedControl]);
  useEffect(() => {
    console.log(etcdData[selectedKeyPath]);
  }, [selectedKeyPath]);
  const loadSelectedKey = (keyPath: string) => {
    console.log(keyPath);
    if (etcdData[keyPath] === undefined) {
      setSelectionEmpty()
      return;
    }
    setSelectedKeyPath(keyPath);
    if (selectedSegmentedControl === 'plans-views') {
    getEtcdDataView(etcdData[keyPath].etcd_name, etcdData[keyPath].key_path).then((data) => {
      console.log(data);
      setSelectedEtcdValue(JSON.stringify(data));
    });
    } else if (selectedSegmentedControl === 'inventories') {
      getEtcdDataInventory(etcdData[keyPath].etcd_name, etcdData[keyPath].key_path).then((data) => {
        console.log(data);
        setSelectedEtcdValue(data);
      });
    }
  }
  return (
    <div className="bp5-dark">
      <SegmentedControl value={selectedSegmentedControl} onValueChange={(value) => setSelectedSegmentedControl(value)}
    options={[
        {
            label: "Plans Views",
            value: "plans-views",
        },
        {
            label: "Ansible Inventories",
            value: "inventories",
        },
        // {
        //     label: "Users",
        //     value: "users",
        // },
    ]}
    defaultValue="list"/>
      <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}>
        <select value={selectedKeyPath} onChange={(event) => loadSelectedKey(event.target.value)}>
          <option value="">Select an option</option>
          {etcdData && etcdData.map((option: any, index: number) => (
            <option key={index} value={index}>
              {option.key_path}
            </option>
          ))}
        </select>
        <TextArea autoResize={true} value={selectedEtcdValue} onChange={(event) => setSelectedEtcdValue(event.target.value)}/>
        <Button onClick={handleSave}>Save</Button>
      </Card>
    </div>
  );
};

export default EtcdControl;