'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyFetchMiddleware = applyFetchMiddleware;
/**
 * Utility function, chain multiple middlewares of `redux-composable-fetch` into one
 * @param  {...object}  middlewares
 * @return {object}
 */
function applyFetchMiddleware() {
  for (var _len = arguments.length, middlewares = Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  var middlewaresWithOnResolve = middlewares.filter(function (m) {
    return typeof m.onResolve === 'function';
  });
  if (middlewaresWithOnResolve.length > 1) {
    console.warn('[fetch-middleware] Only one single `onResolve` handler is supported, but you provided %d', middlewaresWithOnResolve.length);
  }

  return {
    beforeFetch: function beforeFetch(_ref) {
      var action = _ref.action;

      return middlewares.reduce(function (chain, middleware) {
        if (typeof middleware.beforeFetch === 'function') {
          return chain.then(function (_ref2) {
            var action = _ref2.action;
            return middleware.beforeFetch({ action: action });
          });
        }
        return chain;
      }, Promise.resolve({ action: action }));
    },
    afterFetch: function afterFetch(_ref3) {
      var action = _ref3.action;
      var result = _ref3.result;

      return middlewares.reduce(function (chain, middleware) {
        if (typeof middleware.afterFetch === 'function') {
          return chain.then(function (_ref4) {
            var action = _ref4.action;
            var result = _ref4.result;
            return middleware.afterFetch({ action: action, result: result });
          });
        }
        return chain;
      }, Promise.resolve({ action: action, result: result }));
    },
    onReject: function onReject(_ref5) {
      var action = _ref5.action;
      var error = _ref5.error;

      return middlewares.reduce(function (chain, middleware) {
        if (typeof middleware.onReject === 'function') {
          return chain.catch(function (_ref6) {
            var action = _ref6.action;
            var error = _ref6.error;
            return middleware.onReject({ action: action, error: error });
          });
        }
        return chain;
      }, Promise.reject({ action: action, error: error }));
    },


    onResolve: middlewaresWithOnResolve[0] ? middlewaresWithOnResolve[0].onResolve : undefined
  };
}