import Cookies from 'js-cookie';

export const back_url = import.meta.env.VITE_PLIM_BACKEND_URL; // TODO make build variable

export type Headers = Record<string, string>;

export const baseHeaders: Headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

export const getHeaders = (includeAuth = false): Headers => {
  const headers = { ...baseHeaders };
  if (includeAuth) {
    headers['Authorization'] = `Bearer ${Cookies.get('token')}`;
  }
  return headers;
};
