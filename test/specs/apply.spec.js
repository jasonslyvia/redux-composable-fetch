import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
const expect = chai.expect;
chai.use(sinonChai);
import { applyFetchMiddleware } from '../../src/applyFetchMiddleware';


describe('applyFetchMiddleware', () => {
  let middleware1;
  let middleware2;
  let middleware3;
  let middleware4;

  function spyConsoleWarning() {
    global.console.warn = sinon.spy(global.console, 'warn');
    return function restore() {
      global.console.warn.restore();
    };
  }

  let restore;
  beforeEach(() => {
    restore = spyConsoleWarning();
  });

  afterEach(() => {
    restore();
  });

  beforeEach(() => {
    middleware1 = {
      beforeFetch({ action }) {
        return Promise.resolve({ action });
      },
    };

    middleware2 = {
      beforeFetch({ action }) {
        return Promise.resolve({ action });
      },

      afterFetch({ action, result }) {
        return Promise.resolve({ action, result });
      },
    };

    middleware3 = {
      afterFetch({ action, result }) {
        return Promise.resolve({ action, result });
      },

      onReject({ action, error }) {
        return Promise.resolve({ action, result: `${error}? be happy then` });
      },
    };

    middleware4 = {
      afterFetch({ action }) {
        return Promise.reject({ action, error: 'unhapppy' });
      },

      onReject({ action, error }) {
        return Promise.resolve({ action, result: `${error}? be happy then` });
      },
    };
  });

  it('should chain all `beforeFetch` middleware', () => {
    const beforeFetch1 = sinon.spy(middleware1, 'beforeFetch');
    const beforeFetch2 = sinon.spy(middleware2, 'beforeFetch');

    const finalMiddleware = applyFetchMiddleware(
      middleware1,
      middleware2,
      middleware3,
    );

    const action = {
      type: 'TEST',
    };

    expect(finalMiddleware.beforeFetch).to.be.an('function');

    return finalMiddleware.beforeFetch({ action }).then(() => {
      try {
        expect(beforeFetch1).to.have.been.calledWith({ action });
        expect(beforeFetch2).to.have.been.calledWith({ action });
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    });
  });

  it('stop chain when one `beforeFetch` middleware reject', () => {
    const beforeFetch1 = sinon.spy(middleware1, 'beforeFetch');
    const beforeFetch2 = sinon.spy(middleware2, 'beforeFetch');
    const rejectBeforeFetch = sinon.spy(() => Promise.reject());

    const finalMiddleware = applyFetchMiddleware(
      {
        beforeFetch: rejectBeforeFetch,
      },
      middleware1,
      middleware2,
      middleware3,
    );

    const action = {
      type: 'TEST',
    };

    expect(finalMiddleware.beforeFetch).to.be.an('function');

    return finalMiddleware.beforeFetch({ action }).then(null, () => {
      try {
        expect(rejectBeforeFetch).to.have.been.calledWith({ action });
        expect(beforeFetch1).to.not.have.been.called;
        expect(beforeFetch2).to.not.have.been.called;
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    });
  });

  it('should chain all `afterFetch` middleware', () => {
    const afterFetch2 = sinon.spy(middleware2, 'afterFetch');
    const afterFetch3 = sinon.spy(middleware3, 'afterFetch');

    const finalMiddleware = applyFetchMiddleware(
      middleware1,
      middleware2,
      middleware3,
    );

    const action = {
      type: 'TEST',
    };

    expect(finalMiddleware.afterFetch).to.be.an('function');
    let result;

    return finalMiddleware.afterFetch({ action }).then(() => {
      try {
        expect(afterFetch2).to.have.been.calledWith({ action, result });
        expect(afterFetch3).to.have.been.calledWith({ action, result });
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    });
  });

  it('stop chain when one `afterFetch` middleware reject', () => {
    const afterFetch = sinon.spy(({ action }) => {
      return Promise.reject({ action, error: 'boom' });
    });
    const afterFetch2 = sinon.spy(middleware2, 'afterFetch');
    const afterFetch3 = sinon.spy(middleware3, 'afterFetch');
    const afterFetch4 = sinon.spy(middleware4, 'afterFetch');

    const finalMiddleware = applyFetchMiddleware(
      {
        afterFetch,
      },
      middleware1,
      middleware2,
      middleware3,
      middleware4,
    );

    const action = {
      type: 'TEST',
    };
    const result = 'result';

    expect(finalMiddleware.afterFetch).to.be.an('function');

    return finalMiddleware.afterFetch({ action, result }).then(null, () => {
      try {
        expect(afterFetch).to.have.been.calledWith({ action, result });
        expect(afterFetch2).to.not.have.been.called;
        expect(afterFetch3).to.not.have.been.called;
        expect(afterFetch4).to.not.have.been.called;
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    });
  });

  it('should chain all `onReject` middleware', () => {
    const onReject3 = sinon.spy(({ action, error }) => {
      return Promise.reject({ action, error });
    });
    const onReject4 = sinon.spy(({ action, error }) => {
      return Promise.reject({ action, error });
    });

    const finalMiddleware = applyFetchMiddleware(
      {
        onReject: onReject3,
      },
      {
        onReject: onReject4,
      },
      middleware1
    );

    const action = {
      type: 'TEST',
    };

    expect(finalMiddleware.onReject).to.be.an('function');
    const error = 'error';

    return finalMiddleware.onReject({ action, error }).then(null, () => {
      try {
        expect(onReject3).to.have.been.calledWith({ action, error });
        expect(onReject4).to.have.been.calledWith({ action, error });
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    });
  });

  it('stop chain when one `onReject` middleware resolve', () => {
    const action = {
      type: 'TEST',
    };
    const error = 'error';

    const onReject = sinon.spy(({ action }) => {
      return Promise.resolve({ action });
    });
    const onReject3 = sinon.spy(middleware3, 'onReject');
    const onReject4 = sinon.spy(middleware4, 'onReject');

    const finalMiddleware = applyFetchMiddleware(
      {
        onReject,
      },
      middleware3,
      middleware4,
    );

    expect(finalMiddleware.onReject).to.be.an('function');

    return finalMiddleware.onReject({ action, error }).then(() => {
      try {
        expect(onReject).to.have.been.calledWith({ action, error });
        expect(onReject3).to.not.have.been.called;
        expect(onReject4).to.not.have.been.called;
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    });
  });

  it('should warn if multiple `onResolve` are provided and only first one is respected', () => {
    const m1 = {
      onResolve() {
      },
    };
    const m2 = {
      onResolve() {

      },
    };

    const onResolve1 = sinon.spy(m1, 'onResolve');
    const onResolve2 = sinon.spy(m2, 'onResolve');

    const finalMiddleware = applyFetchMiddleware(
      m1, m2,
    );

    finalMiddleware.onResolve({});

    expect(global.console.warn).to.have.been.calledWithMatch(/onResolve/);
    expect(onResolve1).to.be.called.once;
    expect(onResolve2).not.to.be.called;
  });
});
