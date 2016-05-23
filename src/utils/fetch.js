import 'fetch-detector';
import 'fetch-ie8';
import { setPromiseTimeout, addUrlParams } from './utils';

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_CONTENT_TYPE = 'application/json, text/plain;charset=UTF-8';
const DEFAULT_ACCEPT = 'application/json, text/plain';

/*
 * @param  {object}   options Options specified in action
 * @return {promise}
 */
export const fetchSimple = (options = {}) => {
  const { url, params, method = 'GET', timeout = DEFAULT_TIMEOUT, credentials = 'include', headers,
          ...restOptions } = options;

  let promise;

  if (method.toUpperCase().indexOf('POST') !== -1) {
    const body = JSON.stringify(params);

    promise = fetch(url, {
      method: 'POST',
      headers: {
        Accept: DEFAULT_ACCEPT,
        'Content-Type': DEFAULT_CONTENT_TYPE,
        ...headers,
      },
      body,
      credentials,
      ...restOptions,
    }).then(response => response.json());
  } else {
    // 第3个参数 true 表示禁止缓存
    promise = fetch(addUrlParams(url, params, true), {
      method,
      credentials,
    }).then(response => response.json());
  }

  return setPromiseTimeout(promise, timeout);
};
