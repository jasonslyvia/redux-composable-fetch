import forOwn from 'lodash/forOwn';

/**
 * Simulate promise timeout
 * @param {Promise} promise Original promise
 * @param {number}  timeout Timeout in ms
 */
export function setPromiseTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('request timeout');
    }, ms);
    promise.then(resolve, reject);
  });
}


/**
 * Add params to url
 *
 * @param {string} url          Original url, might contain query and hash
 * @param {object} params       Params for sending request
 * @param {bool}   disableCache If true, `_=timestamp` is added
 */
export function addUrlParams(url, params = {}, disableCache = false) {
  let urlWithParams;
  let urlPath = '';
  let paramsPart = '';

  if (url.indexOf('#') > 0) {
    urlWithParams = url.substring(0, url.indexOf('#'));
  } else {
    urlWithParams = url;
  }

  if (urlWithParams.indexOf('?') > 0) {
    urlPath = urlWithParams.substring(0, url.indexOf('?'));
    paramsPart = urlWithParams.substring(urlWithParams.indexOf('?'), urlWithParams.length);
  } else {
    urlPath = urlWithParams;
  }

  let finalParams = params;
  // For disabling cache
  if (disableCache) {
    finalParams = {
      ...params,
      _: Date.now(),
    };
  }

  forOwn(finalParams, (value, key) => {
    paramsPart += `&${key}=${value}`;
  });

  if (paramsPart.length > 0) {
    paramsPart = paramsPart.replace(/^&/, '?');
  }

  return urlPath + paramsPart;
}
