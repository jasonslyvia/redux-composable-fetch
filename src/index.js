const defaultBeforeFetch = ({ action }) => Promise.resolve({ action });
const defaultAfterFetch = ({ action, result }) => Promise.resolve({ action, result });
const rejectHandler = ({ action, error }) => Promise.reject({ action, error });
// For unify the action being dispatched, you might NOT need it!
// `result` might be the payload or the error, depending how the request end up
const resolveHandler = ({ action, type, payload, error }) => ({ ...action, type, payload, error });

function hasOwn(obj, ...properties) {
  return properties.every(p => obj.hasOwnProperty(p));
}

function noop() {}

/**
 * Create a fetch middleware
 *
 * @param {object} options     Options for creating fetch middleware
 *   @param  {function} beforeFetch Injection point before sending request, it should return a Promise
 *   @param  {function} afterFetch  Injection point after receive response, it should return a Promise
 *   @param  {function} onReject    Injection point when anything goes wrong, it should return a Promise
 * @param {bool}   promiseMode Enable promise mode, will not check action have certain keys
 * @return {function}
 */
export default function createFetchMiddleware(options = {}, promiseMode = false) {
  const {
    beforeFetch = defaultBeforeFetch,
    afterFetch = defaultAfterFetch,
    onReject = rejectHandler,
    onResolve = resolveHandler,
  } = options;

  return () => (next = noop) => action => {
    if (!promiseMode && (!action.url || !action.types)) {
      return next(action);
    }

    if (promiseMode && !action.url) {
      throw new Error('[fetch-middleware] Missing required key: `url`');
    }

    let loadingType;
    let successType;
    let failureType;

    if (!promiseMode) {
      [loadingType, successType, failureType] = action.types;
    }

    if (loadingType) {
      try {
        next({
          ...action,
          type: loadingType,
        });
      } catch (err) {
        console.error(`[fetch-middleware] Uncaught error while dispatching \`${loadingType}\`\n`, err.stack);
      }
    }

    let beforeFetchResult;
    try {
      beforeFetchResult = beforeFetch({ action });
    } catch (err) {
      throw new Error('[fetch-middleware] Uncaught error in `beforeFetch` middleware', err.stack);
    }

    if (!(beforeFetchResult instanceof Promise)) {
      throw new TypeError('[fetch-middleware] `beforeFetch` middleware returned a non-Promise object, instead got:',
                          beforeFetchResult);
    }

    return beforeFetchResult
    .then(args => {
      if (!args || typeof args !== 'object' || !hasOwn(args, 'action')) {
        console.error('[fetch-middleware] `beforeFetch` should resolve an object containing `action` key, instead got:',
                      args);
        return Promise.reject(args);
      }
      return args;
    })
    .then(
      ({ action }) => {
        const { url, types, ...options } = action; // eslint-disable-line
        return fetch(url, options).then(
          result => {
            return Promise.resolve({
              action,
              result,
            });
          },
          err => {
            return Promise.reject({
              action,
              error: err,
            });
          }
        );
      }
    )
    .then(
      ({ action, result }) => {
        let afterFetchResult;
        try {
          afterFetchResult = afterFetch({ action, result });
        } catch (err) {
          console.error('[fetch-middleware] Uncaught error in `afterFetch` middleware\n', err.stack);
        }

        if (!(afterFetchResult instanceof Promise)) {
          console.error('[fetch-middleware] `afterFetch` middleware returned a non-Promise object');
          return Promise.reject();
        }

        return afterFetchResult;
      }
    )
    .then(args => {
      if (!args || typeof args !== 'object' || !hasOwn(args, 'action', 'result')) {
        console.error('[fetch-middleware] `afterFetch` should resolve an object ' +
                      'containing `action` and `result` key, instead got',
                      args);
        return Promise.reject(args);
      }
      return args;
    })
    .catch(err => {
      if (err instanceof Error || typeof err !== 'object' || !hasOwn(err, 'action', 'error')) {
        return onReject({
          action,
          error: err,
        });
      }

      return onReject(err);
    })
    .then(
      ({ action, result }) => {
        try {
          next(onResolve({
            action,
            type: successType,
            payload: result,
            error: false,
          }));
        } catch (err) {
          console.error(`[fetch-middleware] Uncaught error while dispatching \`${successType}\`\n`, err.stack);
        }

        return Promise.resolve(result);
      }
    )
    .catch(
      ({ action, error }) => {
        if (failureType) {
          try {
            next(onResolve({
              action,
              type: failureType,
              payload: error,
              error: true,
            }));
          } catch (err) {
            console.error(`[fetch-middleware] Uncaught error while dispatching \`${failureType}\`\n`, err.stack);
          }
        } else {
          // only reject when no `failureType` is provided, which means errors
          // are probably not handled in reducer
          return Promise.reject(error);
        }
      }
    );
  };
}

export { applyFetchMiddleware } from './applyFetchMiddleware';
