import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import createFetchMiddleware from '../../src/index';
const expect = chai.expect;
chai.use(sinonChai);

function genFakeFetch(data, error = false) {
  return function fakeFetch() {
    // For the sake of simplifying tests, here we omit the `response` object
    // and `.json()` or `.blob()` method
    return error ? Promise.reject(data) : Promise.resolve(data);
  };
}

function noop() {}

// inject `fetch`
global.fetch = genFakeFetch();

const targetAction = {
  url: '/api/user.json',
  types: ['LOADING', 'SUCCESS', 'ERROR'],
};

function spyConsoleError() {
  global.console.error = sinon.spy(global.console, 'error');
  return function restore() {
    global.console.error.restore();
  };
}


/* =============================
         SETUP COMPLETE
============================= */
let restore;
beforeEach(() => {
  restore = spyConsoleError();
});

afterEach(() => {
  restore();
});

describe('fetch middleware', () => {
  describe('basic setup', () => {
    it('should create a middleware', () => {
      const middleware = createFetchMiddleware();

      expect(middleware).to.be.an('function');
      expect(middleware()).to.be.an('function');
      expect(middleware()()).to.be.an('function');
      expect(middleware()()).to.throw(TypeError);
    });

    it('should only concern action with `url` and `types` fields', () => {
      const middleware = createFetchMiddleware();
      const next = sinon.spy();
      const action = {
        type: 'FOO',
      };

      middleware()(next)(action);
      expect(next).to.have.been.calledWith(action);

      const newNext = sinon.spy();
      middleware()(newNext)({
        ...targetAction,
        types: [null, null, null],
      });
      expect(newNext).to.not.have.been.called;
    });

    it('should return a promise', () => {
      const middleware = createFetchMiddleware();
      expect(middleware()(noop)(targetAction)).to.be.an.instanceOf(Promise);
    });

    it('should not return a rejected promise when anything wrong but `failureType` is provided', () => {
      const middleware = createFetchMiddleware();
      return middleware()(noop)(targetAction);
    });

    it('should return a rejected promise when anything wrong and no `failureType` provided', () => {
      const middleware = createFetchMiddleware();

      // make `fetch` reject
      global.fetch = genFakeFetch({}, true);
      return middleware()(noop)({
        ...targetAction,
        types: [null, 'SUCCESS', null],
      }).then(() => Promise.reject('THIS SHOULD NOT BE CALLED'), () => Promise.resolve());
    });


    it('should return a rejected promise when anything wrong and `failureType` provided and `rejectHard` set to true', () => {
      const middleware = createFetchMiddleware(undefined, { rejectHard: true });

      // make `fetch` reject
      global.fetch = genFakeFetch({}, true);
      return middleware()(noop)(targetAction).then(() => Promise.reject('THIS SHOULD NOT BE CALLED'), () => Promise.resolve());
    });

    it('should dispatch `LOADING` and `SUCCESS` type if specified when everything okay', () => {
      const middleware = createFetchMiddleware();
      const next = sinon.spy();
      const result = {
        name: 'Jon',
      };

      global.fetch = genFakeFetch(result);
      const promise = middleware()(next)(targetAction);

      expect(next).to.have.been.calledWith({
        ...targetAction,
        type: 'LOADING',
      });

      return promise.then(data => {
        try {
          expect(next).to.have.been.calledWith({
            ...targetAction,
            payload: data,
            type: 'SUCCESS',
            error: false,
          });
        } catch (err) {
          return Promise.reject(err);
        }

        return Promise.resolve();
      }, err => Promise.reject(err));
    });

    it('should dispatch `LOADING` and `ERROR` type if specified when anything wrong', () => {
      const middleware = createFetchMiddleware();
      const next = sinon.spy();
      const result = {
        name: 'Jon',
      };

      // `fetch` will return a rejected promise
      global.fetch = genFakeFetch(result, true);
      const promise = middleware()(next)(targetAction);

      expect(next).to.have.been.calledWith({
        ...targetAction,
        type: 'LOADING',
      });

      return promise.then(() => {
        try {
          expect(next).to.have.been.calledWith({
            ...targetAction,
            error: true,
            payload: result,
            type: 'ERROR',
          });
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });
  });

  describe('before fetch', () => {
    it('should inject `beforeFetch` middleware', () => {
      const middlewareOfMiddleware = {
        beforeFetch({ action }) {
          return Promise.resolve({ action });
        },
      };
      sinon.spy(middlewareOfMiddleware, 'beforeFetch');

      const middleware = createFetchMiddleware(middlewareOfMiddleware);
      global.fetch = genFakeFetch();

      return middleware()(noop)(targetAction).then(() => {
        try {
          expect(middlewareOfMiddleware.beforeFetch).to.have.been.calledWith({ action: targetAction });
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });

    it('should stop fetch if `beforeFetch` throws', (done) => {
      const middlewareOfMiddleware = {
        beforeFetch() {
          throw new Error('wrong');
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      global.fetch = sinon.spy(genFakeFetch());

      expect(() => {
        middleware()(noop)(targetAction);
      }).to.throw(Error, /beforeFetch/);

      setTimeout(() => {
        expect(global.fetch).to.not.have.been.called;
        done();
      }, 200);
    });

    it('should throw if `beforeFetch` return a non-Promise object', () => {
      const middlewareOfMiddleware = {
        beforeFetch({ action }) {
          return { action };
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      expect(() => {
        middleware()(noop)(targetAction);
      }).to.throw(TypeError, /beforeFetch/);
    });

    it('should log error if `beforeFetch` resolve an object without `action` key', () => {
      const middlewareOfMiddleware = {
        beforeFetch({ action }) {
          return Promise.resolve({ crzay: action });
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(noop)(targetAction).then(() => {
        try {
          expect(global.console.error).to.have.been.calledWithMatch(/key/);
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });

    it('should be capable of changing `action`', () => {
      global.fetch = sinon.spy(genFakeFetch());
      const middlewareOfMiddleware = {
        beforeFetch({ action }) {
          return Promise.resolve({
            action: {
              ...action,
              // alter the original url
              url: '/api/article.json',
            },
          });
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(noop)(targetAction).then(() => {
        expect(global.fetch.firstCall.args[0]).to.have.string('/api/article.json');
      });
    });

    it('should stop a fetch by rejecting', () => {
      global.fetch = sinon.spy(genFakeFetch());
      const middlewareOfMiddleware = {
        beforeFetch({ action }) {
          return Promise.reject({
            action,
            error: 'unhapppy',
          });
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(noop)(targetAction).then(
        () => {
          try {
            expect(global.fetch).to.not.have.been.called;
          } catch (e) {
            return Promise.reject(e);
          }
          return Promise.resolve();
        }
      );
    });
  });

  describe('after fetch', () => {
    it('should inject `afterFetch`', () => {
      const middlewareOfMiddleware = {
        afterFetch({ action, result }) {
          return Promise.resolve({ action, result });
        },
      };
      sinon.spy(middlewareOfMiddleware, 'afterFetch');

      const middleware = createFetchMiddleware(middlewareOfMiddleware);
      const data = { a: 1 };
      global.fetch = genFakeFetch(data);

      return middleware()(noop)(targetAction).then(() => {
        try {
          expect(middlewareOfMiddleware.afterFetch).to.have.been.calledWith({
            action: targetAction,
            result: data,
          });
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });

    it('should log error if `afterFetch` return a non-Promise object', () => {
      const middlewareOfMiddleware = {
        afterFetch({ action, result }) {
          return { action, result };
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(noop)(targetAction).then(null, () => {
        try {
          expect(global.console.error).to.have.been.calledWithMatch(/non-Promise/);
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });

    it('should log error if `afterFetch` throws', () => {
      const middlewareOfMiddleware = {
        afterFetch() {
          doNotExist(); // eslint-disable-line
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(noop)(targetAction).then(null, () => {
        try {
          expect(global.console.error).to.have.been.calledWithMatch(/Uncaught/, /ReferenceError/);
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });

    it('should log error if `afterFetch` resolve an object without `action` or `result` key', () => {
      const middlewareOfMiddleware = {
        afterFetch({ action }) {
          return Promise.resolve({ crzay: action });
        },
      };
      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(noop)(targetAction).then(() => {
        try {
          expect(global.console.error).to.have.been.calledWithMatch(/key/);
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });
  });

  describe('on reject', () => {
    it('should inject `onReject` middleware', () => {
      const middlewareOfMiddleware = {
        onReject({ action, error }) {
          return Promise.reject({ action, error });
        },
      };
      sinon.spy(middlewareOfMiddleware, 'onReject');

      const middleware = createFetchMiddleware(middlewareOfMiddleware);
      const error = { a: 1 };
      global.fetch = genFakeFetch(error, true);

      return middleware()(noop)(targetAction).catch(() => {
        try {
          expect(middlewareOfMiddleware.onReject).to.have.been.calledWith({
            action: targetAction,
            error,
          });
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });
  });

  describe('on resolve', () => {
    it('should be able to modify the shape of `action` before being dispatched', () => {
      const middlewareOfMiddleware = {
        onResolve({ action, type, payload, error }) {
          return {
            ...action,
            type,
            payload,
            error,
            touched: true,
          };
        },
      };

      const middleware = createFetchMiddleware(middlewareOfMiddleware);
      const next = sinon.spy();
      const result = {
        name: 'Jon',
      };

      global.fetch = genFakeFetch(result);
      const promise = middleware()(next)(targetAction);

      expect(next).to.have.been.calledWith({
        ...targetAction,
        type: 'LOADING',
      });

      return promise.then(data => {
        try {
          expect(next).to.have.been.calledWith({
            ...targetAction,
            payload: data,
            type: 'SUCCESS',
            error: false,
            touched: true,
          });
        } catch (err) {
          return Promise.reject(err);
        }

        return Promise.resolve();
      }, err => Promise.reject(err));
    });
  });

  describe('fetch flow', () => {
    it('when `beforeFetch` reject, no `fetch` call, no `afterFetch`, only `onReject` should be called', () => {
      global.fetch = sinon.spy(genFakeFetch());
      const middlewareOfMiddleware = {
        beforeFetch({ action }) {
          return Promise.reject({
            action,
            error: 'unhapppy',
          });
        },
        afterFetch({ action, result }) {
          return Promise.resolve({ action, result });
        },
        onReject({ action, error }) {
          return Promise.resolve({
            action,
            result: `although rejected with ${error}, it should work`,
          });
        },
      };

      const next = sinon.spy();
      const beforeFetch = sinon.spy(middlewareOfMiddleware, 'beforeFetch');
      const afterFetch = sinon.spy(middlewareOfMiddleware, 'afterFetch');
      const onReject = sinon.spy(middlewareOfMiddleware, 'onReject');

      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(next)(targetAction).then(
        () => {
          try {
            expect(global.fetch).to.not.have.been.called;
            expect(beforeFetch).to.have.been.called;
            expect(onReject).to.have.been.calledWith({
              action: targetAction,
              error: 'unhapppy',
            });
            expect(afterFetch).to.not.have.been.called;
            expect(next).to.have.been.called.calledTwice;
            expect(next.secondCall.args[0]).to.have.property(
              'payload',
              'although rejected with unhapppy, it should work'
            );
          } catch (e) {
            return Promise.reject(e);
          }
          return Promise.resolve();
        }
      );
    });

    it('when `afterFetch` reject, `onReject` should be called', () => {
      global.fetch = sinon.spy(genFakeFetch());
      const middlewareOfMiddleware = {
        afterFetch({ action }) {
          return Promise.reject({
            action,
            error: 'unhapppy',
          });
        },
        onReject({ action, error }) {
          return Promise.resolve({
            action,
            result: `although rejected with ${error}, it should work`,
          });
        },
      };

      const next = sinon.spy();
      const afterFetch = sinon.spy(middlewareOfMiddleware, 'afterFetch');
      const onReject = sinon.spy(middlewareOfMiddleware, 'onReject');

      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(next)(targetAction).then(
        () => {
          try {
            expect(global.fetch).to.have.been.called;
            expect(afterFetch).to.have.been.called;
            expect(onReject).to.have.been.calledWith({
              action: targetAction,
              error: 'unhapppy',
            });
            expect(next).to.have.been.called.calledTwice;
            expect(next.secondCall.args[0]).to.have.property(
              'payload',
              'although rejected with unhapppy, it should work'
            );
          } catch (e) {
            return Promise.reject(e);
          }
          return Promise.resolve();
        }
      );
    });

    it('when `onReject` reject, it should dispatch failureType', () => {
      global.fetch = sinon.spy(genFakeFetch());
      const middlewareOfMiddleware = {
        afterFetch({ action }) {
          return Promise.reject({
            action,
            error: 'unhapppy',
          });
        },
        onReject({ action, error }) {
          return Promise.reject({
            action,
            error: `${error} indeed`,
          });
        },
      };

      const next = sinon.spy();
      const afterFetch = sinon.spy(middlewareOfMiddleware, 'afterFetch');
      const onReject = sinon.spy(middlewareOfMiddleware, 'onReject');

      const middleware = createFetchMiddleware(middlewareOfMiddleware);

      return middleware()(next)(targetAction).then(
        null,
        () => {
          try {
            expect(global.fetch).to.have.been.called;
            expect(afterFetch).to.have.been.called;
            expect(onReject).to.have.been.calledWith({
              action: targetAction,
              error: 'unhapppy',
            });
            expect(next).to.have.been.called.calledTwice;
            expect(next.secondCall.args[0]).to.have.property(
              'error',
              'unhapppy indeed'
            );
            expect(next.secondCall.args[0]).to.have.property(
              'type',
              'ERROR'
            );
          } catch (e) {
            return Promise.reject(e);
          }
          return Promise.resolve();
        }
      );
    });

    it('should log error when dispatching successType throws', () => {
      const middleware = createFetchMiddleware();
      const next = sinon.spy((data) => {
        if (data.payload) {
          throw new Error('blah');
        }
      });
      const result = {
        name: 'Jon',
      };

      global.fetch = genFakeFetch(result);
      const promise = middleware()(next)(targetAction);

      expect(next).to.have.been.calledWith({
        ...targetAction,
        type: 'LOADING',
      });

      return promise.then(data => {
        try {
          expect(next).to.have.been.calledWith({
            ...targetAction,
            payload: data,
            type: 'SUCCESS',
            error: false,
          });
          expect(global.console.error).to.have.been.calledWithMatch(/Uncaught/, /blah/);
        } catch (err) {
          return Promise.reject(err);
        }

        return Promise.resolve();
      }, err => Promise.reject(err));
    });

    it('should log error when dispatching failureType throws', () => {
      const middleware = createFetchMiddleware();
      const next = sinon.spy((data) => {
        if (data.error) {
          throw new Error('blah');
        }
      });
      const result = {
        name: 'Jon',
      };

      global.fetch = genFakeFetch(result, true);
      const promise = middleware()(next)(targetAction);

      return promise.then(() => {
        try {
          expect(global.console.error).to.have.been.calledWithMatch(/Uncaught/, /blah/);
        } catch (err) {
          return Promise.reject(err);
        }

        return Promise.resolve();
      });
    });
  });

  describe('error handling', () => {
    it('should not interrupt fetch flow if dispatching new action throws', () => {
      const throwNext = sinon.spy(() => {
        throw new Error('boom');
      });

      const middleware = createFetchMiddleware();
      global.fetch = sinon.spy(genFakeFetch());
      const promise = middleware()(throwNext)(targetAction);

      return promise.then(() => {
        try {
          expect(global.fetch).to.have.been.called;
          expect(throwNext).to.have.been.calledTwice;
        } catch (e) {
          return Promise.reject(e);
        }
        return Promise.resolve();
      });
    });
  });
});
