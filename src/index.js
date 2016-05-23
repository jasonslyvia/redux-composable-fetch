import { fetchSimple } from './utils/fetch';

const defaultBeforeFetch = ({ action }) => Promise.resolve({ action });
const defaultAfterFetch = ({ action, result }) => Promise.resolve({ action, result });
const rejectHandler = ({ error }) => Promise.reject({ error });

const normalizeAction = action => action.meta ? { ...action, ...action.meta } : action;

/**
 * Create a new fetch middleware
 *
 * Target `action` object contains `url` AND `types` field
 *
 *
 * @param {object} options
 *   @param {function} beforeFetch Hook before sending request, it should return a Promise
 *   @param {function} afterFetch  Hook after response, it should return a Promise
 *   @param {function} onReject    Hook for exceptions, usually useless, but built-in cache middleware used it to
 *                                 determine a cache hit, it can return a Promise
  * @return {function}     A brand new fetch-middleware for Redux, note this middleware will return a Promise
  *                        which you can take advantage of, a detailed demo has been documented in docs.
  *
  *                        Example usage:
  *                          import { appleMiddleware } from 'redux';
  *                          import createFetchMiddleware, { applyFetchMiddleware } from 'redux-composable-fetch';
  *
  *                          appleMiddleware(createFetchMiddleware(applyFetchMiddleware(middleware1, middleware2)));
 */
export default function createFetchMiddleware(options = {}) {
  const { beforeFetch = defaultBeforeFetch, afterFetch = defaultAfterFetch, onReject = rejectHandler } = options;
  return () => next => action => {
    // Be compatible with FSA
    if (action.meta && (typeof action.meta.url !== 'string' || !Array.isArray(action.meta.types))) {
      return next(action);
    } else if (!action.url || !action.types) {
      return next(action);
    }

    const [loadingType, successType, failureType] = normalizeAction(action).types;

    if (loadingType) {
      try {
        next({
          ...action,
          type: loadingType,
        });
      } catch (err) {
        console.error(`[redux-composable-fetch] Uncaught error during dispatching ${loadingType}`, err.stack);
      }
    }

    return beforeFetch({ action })
    .then(({ action }) => {
      const { url, params, method, timeout, credentials } = normalizeAction(action);
      return fetchSimple(url, params, method, timeout, credentials);
    })
    .then(result => afterFetch({ action, result }))
    .catch(err => {
      if (err.stack) {
        return Promise.reject(err);
      }

      // Built-in timeout support
      if (err === 'request timeout') {
        return onReject({
          action,
          error: err,
        });
      }

      return onReject({
        action: err.action,
        error: err.error,
      });
    })
    .then(({ result, action }) => {
      try {
        next({
          ...action,
          payload: result,
          type: successType,
        });
      } catch (err) {
        console.error(`[redux-composable-fetch] Uncaught error during dispatching ${successType}`, err.stack);
      }

      // Allow dirty but efficient direct result access
      return Promise.resolve(result);
    })
    .catch(e => {
      if (e && e.stack) {
        console.error(e && e.stack);
        return Promise.reject(e);
      }

      if (failureType) {
        next({
          ...action,
          type: failureType,
        });
      }

      return Promise.reject(e);
    });
  };
}


/**
 * Utility function, compose multiple hooks, works like `appleMiddleware` in Redux
 * @param  {...object}  middlewares
 * @return {object}
 */
export function applyFetchMiddleware(...middlewares) {
  return {
    beforeFetch({ action }) {
      return middlewares.reduce((chain, middleware) => {
        if (typeof middleware.beforeFetch === 'function') {
          return chain.then(({ action }) => middleware.beforeFetch({ action }));
        }
        return chain;
      }, Promise.resolve({ action }));
    },

    afterFetch({ action, result }) {
      return middlewares.reduce((chain, middleware) => {
        if (typeof middleware.afterFetch === 'function') {
          return chain.then(({ action, result }) => middleware.afterFetch({ action, result }));
        }
        return chain;
      }, Promise.resolve({ action, result }));
    },

    onReject({ action, error }) {
      return middlewares.reduce((chain, middleware) => {
        if (typeof middleware.onReject === 'function') {
          return chain.catch(({ action, error }) => middleware.onReject({ action, error }));
        }
        return chain;
      }, Promise.reject({ action, error }));
    },
  };
}
