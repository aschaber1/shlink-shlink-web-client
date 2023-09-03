import { changeThemeInMarkup } from '@shlinkio/shlink-frontend-kit';
import classNames from 'classnames';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppUpdateBanner } from '../common/AppUpdateBanner';
import { NotFound } from '../common/NotFound';
import type { ServersMap } from '../servers/data';
import type { AppSettings } from '../settings/reducers/settings';
import { forceUpdate } from '../utils/helpers/sw';
import './App.scss';

interface AppProps {
  fetchServers: () => void;
  servers: ServersMap;
  settings: AppSettings;
  resetAppUpdate: () => void;
  appUpdated: boolean;
}

export const App = (
  MainHeader: FC,
  Home: FC,
  ShlinkWebComponentContainer: FC,
  CreateServer: FC,
  EditServer: FC,
  SettingsComp: FC,
  ManageServers: FC,
  ShlinkVersionsContainer: FC,
) => ({ fetchServers, servers, settings, appUpdated, resetAppUpdate }: AppProps) => {
  const location = useLocation();
  const initialServers = useRef(servers);
  const isHome = location.pathname === '/';

  useEffect(() => {
    // Try to fetch the remote servers if the list is empty at first
    // We use a ref because we don't care if the servers list becomes empty later
    if (Object.keys(initialServers.current).length === 0) {
      fetchServers();
    }
  }, [fetchServers]);

  useEffect(() => {
    changeThemeInMarkup(settings.ui?.theme ?? 'light');
  }, [settings.ui?.theme]);

  return (
    <div className="container-fluid app-container">
      <MainHeader />

      <div className="app">
        <div className={classNames('shlink-wrapper', { 'd-flex d-md-block align-items-center': isHome })}>
          <Routes>
            <Route index element={<Home />} />
            <Route path="/settings/*" element={<SettingsComp />} />
            <Route path="/manage-servers" element={<ManageServers />} />
            <Route path="/server/create" element={<CreateServer />} />
            <Route path="/server/:serverId/edit" element={<EditServer />} />
            <Route path="/server/:serverId/*" element={<ShlinkWebComponentContainer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        <div className="shlink-footer">
          <ShlinkVersionsContainer />
        </div>
      </div>

      <AppUpdateBanner isOpen={appUpdated} toggle={resetAppUpdate} forceUpdate={forceUpdate} />
    </div>
  );
};
