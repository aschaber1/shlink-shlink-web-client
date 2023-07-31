import type { FC } from 'react';
import { FormGroup } from 'reactstrap';
import { LabeledFormGroup, SimpleCard, ToggleSwitch } from '../../shlink-frontend-kit/src';
import type { Settings } from '../../shlink-web-component';
import type { DateInterval } from '../../shlink-web-component/utils/dates/helpers/dateIntervals';
import { DateIntervalSelector } from '../utils/dates/DateIntervalSelector';
import { FormText } from '../utils/forms/FormText';

type VisitsSettingsConfig = Settings['visits'];

interface VisitsProps {
  settings: Settings;
  setVisitsSettings: (settings: VisitsSettingsConfig) => void;
}

const currentDefaultInterval = (settings: Settings): DateInterval => settings.visits?.defaultInterval ?? 'last30Days';

export const VisitsSettings: FC<VisitsProps> = ({ settings, setVisitsSettings }) => (
  <SimpleCard title="Visits" className="h-100">
    <FormGroup>
      <ToggleSwitch
        checked={!!settings.visits?.excludeBots}
        onChange={(excludeBots) => setVisitsSettings(
          { defaultInterval: currentDefaultInterval(settings), excludeBots },
        )}
      >
        Exclude bots wherever possible (this option&lsquo;s effect might depend on Shlink server&lsquo;s version).
        <FormText>
          The visits coming from potential bots will be <b>{settings.visits?.excludeBots ? 'excluded' : 'included'}</b>.
        </FormText>
      </ToggleSwitch>
    </FormGroup>
    <LabeledFormGroup noMargin label="Default interval to load on visits sections:">
      <DateIntervalSelector
        allText="All visits"
        active={currentDefaultInterval(settings)}
        onChange={(defaultInterval) => setVisitsSettings({ defaultInterval })}
      />
    </LabeledFormGroup>
  </SimpleCard>
);
