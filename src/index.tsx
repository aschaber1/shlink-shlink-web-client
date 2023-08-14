import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import pack from '../package.json';
import { container } from './container';
import { setUpStore } from './container/store';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import './index.scss';
import 'leaflet/dist/leaflet.css';
import 'react-datepicker/dist/react-datepicker.css';

const store = setUpStore(container);
const { App, ScrollToTop, ErrorHandler, appUpdateAvailable } = container;

createRoot(document.getElementById('root')!).render( // eslint-disable-line @typescript-eslint/no-non-null-assertion
  <Provider store={store}>
    <BrowserRouter basename={pack.homepage}>
      <ErrorHandler>
        <ScrollToTop>
          <App />
        </ScrollToTop>
      </ErrorHandler>
    </BrowserRouter>
  </Provider>,
);

// Learn more about service workers: https://cra.link/PWA
registerServiceWorker({
  onUpdate() {
    store.dispatch(appUpdateAvailable());
  },
});
