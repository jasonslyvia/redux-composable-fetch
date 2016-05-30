import { forOwn } from 'lodash';

/**
 * 模拟 timeout
 * @param {Promise} promise 原始 promise
 * @param {number} ms       timeout 时长
 */
export const setPromiseTimeout = function(promise, ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('request timeout');
    }, ms);
    promise.then(resolve, reject);
  });
};


/**
 * 拼接 params 到 url
 * @param {String} url 原始 url，可包含 param 和 hash
 * @param {Object} params 参数
 * @param {disableCache} disableCache 是否禁用缓存，默认为 false，如果禁用会在 params 结尾加上 _=timestamp
 * @param {onlyParams} disableCache 是否禁用缓存，默认为 false，如果禁用会在 params 结尾加上 _=timestamp
 */
export const addUrlParams = function(url, params = {}, disableCache = false, onlyParams = false) {
  let urlWithParams, urlPath, paramsPart, hashPart;
  urlPath = paramsPart = hashPart = '';
  if (url.indexOf('#') > 0) {
    hashPart = url.substring(url.indexOf('#'), url.length);
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

  // 如果禁用缓存就在结尾加上时间戳参数
  if (disableCache) {
    params['_'] = Date.now();
  }
  forOwn(params, (value, key) => {
    paramsPart += `&${key}=${onlyParams ? encodeURIComponent(value) : value}`;
  });

  if (paramsPart.length > 0) paramsPart = paramsPart.replace(/^\&/, '?');

  return onlyParams ? (paramsPart.slice(1)) : (urlPath + paramsPart + hashPart);
};
