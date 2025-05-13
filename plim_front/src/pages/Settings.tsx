import { useEffect, useState } from 'react';
import { usePlansStore, useSettingsStore } from '../store';
import { Button, Card, Divider, EntityTitle, H5, Radio, RadioGroup, Slider } from '@blueprintjs/core';

const Settings: React.FC = () => {
  const { settings, setSettings } = useSettingsStore();
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [healthcheckIntervalInSec, setHealthcheckIntervalInSec] = useState(settings.healthcheckInterval ? settings.healthcheckInterval / 1000 : 30);
  useEffect(() => {
    setSettings({ dateFormat: dateFormat });
    console.log(settings);
  }, [dateFormat]);
  const { cleanLogs } = usePlansStore();
  const setHealthcheckInterval = (value: number) => {
    setHealthcheckIntervalInSec(value);
    //set interval in ms
    setSettings({ healthcheckInterval: value * 1000 });
  }
  return (
    <div className="bp5-dark">
      <Card>
      <EntityTitle icon={"cog"} title={"Settings Management"} heading={ H5 } subtitle={"Here you can change stateless settings"}></EntityTitle>
      </Card>
      <Card>
      <RadioGroup label="Log date format" onChange={(e) => setDateFormat(e.target.value)} selectedValue={dateFormat}>
        <Radio label="US" value="en-US" />
        <Radio label="RU" value="ru-RU" />
      </RadioGroup>
      </Card>
      <Card>
      <Button intent="primary" text="Clean logs" onClick={() => cleanLogs()} />
      </Card>
      <Card>
      <H5>Healthcheck of backend interval in seconds:</H5>
      <Slider
        min={10}
        max={300}
        stepSize={10}
        labelStepSize={10}
        onChange={ (e) => setHealthcheckInterval(e) }
        value={healthcheckIntervalInSec}
    />
      </Card>
    </div>
  );
};

export default Settings;