import { createSlice, PayloadAction, createAsyncThunk, SliceCaseReducers } from '@reduxjs/toolkit';
import { Dispatch } from 'redux';
import { AxiosError } from 'axios';
import { ShlinkDomainRedirects } from '../../api/types';
import { ShlinkApiClientBuilder } from '../../api/services/ShlinkApiClientBuilder';
import { GetState, ShlinkState } from '../../container/types';
import { ApiErrorAction } from '../../api/types/actions';
import { Domain, DomainStatus } from '../data';
import { hasServerData } from '../../servers/data';
import { replaceAuthorityFromUri } from '../../utils/helpers/uri';
import { EDIT_DOMAIN_REDIRECTS, EditDomainRedirectsAction } from './domainRedirects';
import { ProblemDetailsError } from '../../api/types/errors';
import { parseApiError } from '../../api/utils';
import { buildReducer } from '../../utils/helpers/redux';

export const LIST_DOMAINS_START = 'shlink/domainsList/LIST_DOMAINS_START';
export const LIST_DOMAINS_ERROR = 'shlink/domainsList/LIST_DOMAINS_ERROR';
export const LIST_DOMAINS = 'shlink/domainsList/LIST_DOMAINS';
export const FILTER_DOMAINS = 'shlink/domainsList/FILTER_DOMAINS';
export const VALIDATE_DOMAIN = 'shlink/domainsList/VALIDATE_DOMAIN';

export interface DomainsList {
  domains: Domain[];
  filteredDomains: Domain[];
  defaultRedirects?: ShlinkDomainRedirects;
  loading: boolean;
  error: boolean;
  errorData?: ProblemDetailsError;
}

type ListDomainsAction = PayloadAction<{
  domains: Domain[];
  defaultRedirects?: ShlinkDomainRedirects;
}>;

type FilterDomainsAction = PayloadAction<string>;

type ValidateDomain = PayloadAction<{
  domain: string;
  status: DomainStatus;
}>;

const initialState: DomainsList = {
  domains: [],
  filteredDomains: [],
  loading: false,
  error: false,
};

export type DomainsCombinedAction = ListDomainsAction
& ApiErrorAction
& FilterDomainsAction
& EditDomainRedirectsAction
& ValidateDomain;

export const replaceRedirectsOnDomain = (domain: string, redirects: ShlinkDomainRedirects) =>
  (d: Domain): Domain => (d.domain !== domain ? d : { ...d, redirects });

export const replaceStatusOnDomain = (domain: string, status: DomainStatus) =>
  (d: Domain): Domain => (d.domain !== domain ? d : { ...d, status });

const oldReducer = buildReducer<DomainsList, DomainsCombinedAction>({
  [LIST_DOMAINS_START]: () => ({ ...initialState, loading: true }),
  [LIST_DOMAINS_ERROR]: (_, { errorData }) => ({ ...initialState, error: true, errorData }),
  [LIST_DOMAINS]: (_, { payload }) => ({ ...initialState, searchTerm: payload, filteredDomains: payload.domains }),
  [FILTER_DOMAINS]: (state, { payload }) => ({
    ...state,
    filteredDomains: state.domains.filter(({ domain }) => domain.toLowerCase().match(payload.toLowerCase())),
  }),
  [EDIT_DOMAIN_REDIRECTS]: (state, { domain, redirects }) => ({
    ...state,
    domains: state.domains.map(replaceRedirectsOnDomain(domain, redirects)),
    filteredDomains: state.filteredDomains.map(replaceRedirectsOnDomain(domain, redirects)),
  }),
  [VALIDATE_DOMAIN]: (state, { payload }) => ({
    ...state,
    domains: state.domains.map(replaceStatusOnDomain(payload.domain, payload.status)),
    filteredDomains: state.filteredDomains.map(replaceStatusOnDomain(payload.domain, payload.status)),
  }),
}, initialState);

export default oldReducer;

export const listDomains = (buildShlinkApiClient: ShlinkApiClientBuilder) => () => async (
  dispatch: Dispatch,
  getState: GetState,
) => {
  dispatch({ type: LIST_DOMAINS_START });
  const { listDomains: shlinkListDomains } = buildShlinkApiClient(getState);

  try {
    const payload = await shlinkListDomains().then(({ data, defaultRedirects }) => ({
      domains: data.map((domain): Domain => ({ ...domain, status: 'validating' })),
      defaultRedirects,
    }));

    dispatch<ListDomainsAction>({ type: LIST_DOMAINS, payload });
  } catch (e: any) {
    dispatch<ApiErrorAction>({ type: LIST_DOMAINS_ERROR, errorData: parseApiError(e) });
  }
};

export const filterDomains = (searchTerm: string): FilterDomainsAction => ({
  type: FILTER_DOMAINS,
  payload: searchTerm,
});

export const checkDomainHealth = (buildShlinkApiClient: ShlinkApiClientBuilder) => (domain: string) => async (
  dispatch: Dispatch,
  getState: GetState,
) => {
  const { selectedServer } = getState();

  if (!hasServerData(selectedServer)) {
    dispatch<ValidateDomain>({
      type: VALIDATE_DOMAIN,
      payload: { domain, status: 'invalid' },
    });

    return;
  }

  try {
    const { url, ...rest } = selectedServer;
    const { health } = buildShlinkApiClient({
      ...rest,
      url: replaceAuthorityFromUri(url, domain),
    });

    const { status } = await health();

    dispatch<ValidateDomain>({
      type: VALIDATE_DOMAIN,
      payload: { domain, status: status === 'pass' ? 'valid' : 'invalid' },
    });
  } catch (e) {
    dispatch<ValidateDomain>({
      type: VALIDATE_DOMAIN,
      payload: { domain, status: 'invalid' },
    });
  }
};

export const domainsReducerCreator = (buildShlinkApiClient: ShlinkApiClientBuilder) => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const listDomains = createAsyncThunk<{
    domains: Domain[];
    defaultRedirects?: ShlinkDomainRedirects;
  }, void, { state: ShlinkState }>(
    LIST_DOMAINS,
    async (_, { getState }) => {
      const { listDomains: shlinkListDomains } = buildShlinkApiClient(getState);
      const { data, defaultRedirects } = await shlinkListDomains();

      return {
        domains: data.map((domain): Domain => ({ ...domain, status: 'validating' })),
        defaultRedirects,
      };
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const checkDomainHealth = createAsyncThunk<{ domain: string; status: DomainStatus }, string, { state: ShlinkState }>(
    VALIDATE_DOMAIN,
    async (domain: string, { getState }) => {
      const { selectedServer } = getState();

      if (!hasServerData(selectedServer)) {
        return { domain, status: 'invalid' };
      }

      try {
        const { url, ...rest } = selectedServer;
        const { health } = buildShlinkApiClient({
          ...rest,
          url: replaceAuthorityFromUri(url, domain),
        });

        const { status } = await health();

        return { domain, status: status === 'pass' ? 'valid' : 'invalid' };
      } catch (e) {
        return { domain, status: 'invalid' };
      }
    },
  );

  const { actions, reducer } = createSlice<DomainsList, SliceCaseReducers<DomainsList>>({
    name: 'domainsList',
    initialState,
    reducers: {
      filterDomains: (state, { payload }) => {
        // eslint-disable-next-line no-param-reassign
        state.filteredDomains = state.domains.filter(
          ({ domain }) => domain.toLowerCase().match(payload.toLowerCase()),
        );
      },
    },
    extraReducers: (builder) => {
      builder.addCase(listDomains.pending, () => ({ ...initialState, loading: true }));
      builder.addCase(listDomains.rejected, (_, { error }) => (
        { ...initialState, error: true, errorData: parseApiError(error as AxiosError<ProblemDetailsError>) } // TODO Fix this casting
      ));
      builder.addCase(listDomains.fulfilled, (_, { payload }) => (
        { ...initialState, ...payload, filteredDomains: payload.domains }
      ));

      builder.addCase(checkDomainHealth.fulfilled, (state, { payload }) => {
        // eslint-disable-next-line no-param-reassign
        state.domains = state.domains.map(replaceStatusOnDomain(payload.domain, payload.status));
        // eslint-disable-next-line no-param-reassign
        state.filteredDomains = state.filteredDomains.map(replaceStatusOnDomain(payload.domain, payload.status));
      });

      builder.addCase(EDIT_DOMAIN_REDIRECTS, (state, { domain, redirects }: any) => { // TODO Fix this "any"
        // eslint-disable-next-line no-param-reassign
        state.domains = state.domains.map(replaceRedirectsOnDomain(domain, redirects));
        // eslint-disable-next-line no-param-reassign
        state.filteredDomains = state.filteredDomains.map(replaceRedirectsOnDomain(domain, redirects));
      });
    },
  });

  return {
    reducer,
    listDomains,
    checkDomainHealth,
    ...actions,
  };
};
