# redux-composable-fetch [![Build Status](https://travis-ci.org/jasonslyvia/redux-composable-fetch.svg)](https://travis-ci.org/jasonslyvia/redux-composable-fetch) [![npm version](https://badge.fury.io/js/redux-composable-fetch.svg)](http://badge.fury.io/js/redux-composable-fetch) [![Coverage Status](https://coveralls.io/repos/github/jasonslyvia/redux-composable-fetch/badge.svg?branch=master)](https://coveralls.io/github/jasonslyvia/redux-composable-fetch?branch=master)

👏👏👏The missing fetch middleware for enterprise Redux apps, with multiple injection point for implementing cache, log, response unification or any request related functionalities.👏👏👏

**WORK IN PROGRESS, USE AT YOUR OWN RISK**

## How it works

![redux composable fetch](http://ww1.sinaimg.cn/mw690/831e9385gw1f4a3fqyg13j20bx0ioabu.jpg)

## Usage

```bash
$ npm install -S redux-composable-fetch
```

`redux-composable-fetch` provides a factory method `createFetchMiddleware` and a utility function `applyFetchMiddleware`, here's how you will use them:

```javascript
import { applyMiddleware, createStore, compose } from 'redux';
import createFetchMiddleware, { applyFetchMiddleware } from 'redux-composable-fetch';

// import all your middlewares for `fetch`, you will see what is a `middleware for fetch` in the following content
import cacheMiddleware from './cacheMiddleware';
import logMiddleware from './logMiddleware';

// build our final fetch middleware first
const finalFetchMiddleware = applyFetchMiddleware(
  cacheMiddleware,
  logMiddleware,
);

// then it's all redux thingy
const finalCreateStore = compose(
  applyMiddleware(finalFetchMiddleware)
)(createStore);
```
