/**
 * Utility function, chain multiple middlewares of `redux-composable-fetch` into one
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
