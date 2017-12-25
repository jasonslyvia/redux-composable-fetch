'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// 获取当前时间戳
var getNow = function getNow() {
  return new Date().getTime();
};
// 获取16位随机数
var getRandomNumber = function getRandomNumber() {
  return Math.random().toString().substr(2);
};
// 删除节点元素
var removeElement = function removeElement(elem) {
  var parent = elem.parentNode;

  if (parent && parent.nodeType !== 11) {
    parent.removeChild(elem);
  }
};
// url组装
var parseUrl = function parseUrl(url, params) {
  var paramsStr = '';

  if (typeof params === 'string') {
    paramsStr = params;
  } else if ((typeof params === 'undefined' ? 'undefined' : _typeof(params)) === 'object') {
    Object.keys(params).forEach(function (key) {
      if (url.indexOf(key + '=') < 0) {
        paramsStr += '&' + key + '=' + encodeURIComponent(params[key]);
      }
    });
  }
  // 加个时间戳，防止缓存
  paramsStr += '&_time=' + getNow();

  if (paramsStr[0] === '&') {
    paramsStr = paramsStr.substr(1);
  }

  return url + (url.indexOf('?') === -1 ? '?' : '&') + paramsStr;
};
/**
 * jsonp connection
 * @param {String} url     The request url
 * @param {Object} options method, credentials, body, headers, params, type
 */
function getJSONP(url, options) {
  return new Promise(function (resolve, reject) {
    if (!url) {
      reject(new Error('No request url'));
    }

    var _ref = options || {},
        _ref$params = _ref.params,
        params = _ref$params === undefined ? {} : _ref$params,
        _ref$timeout = _ref.timeout,
        timeout = _ref$timeout === undefined ? 15000 : _ref$timeout;
    // 函数名称


    var name = void 0;
    var timer = void 0;
    var requestUrl = parseUrl(url, params);
    // 检测callback的函数名是否已经定义
    var match = /callback=(\w+)/.exec(requestUrl);

    if (match && match[1]) {
      name = match[1];
    } else {
      // 如果未定义函数名的话随机成一个函数名
      // 随机生成的函数名通过时间戳拼16位随机数的方式，重名的概率基本为0
      // 如:jsonp_1355750852040_8260732076596469
      name = 'jsonp_' + getNow() + '_' + getRandomNumber();
      requestUrl += '&callback=' + name;
    }

    // 创建一个script元素
    var script = document.createElement('script');
    script.type = 'text/javascript';
    // 设置要远程的url
    script.src = requestUrl;
    // 设置id，为了后面可以删除这个元素
    script.id = 'id_' + name;

    var cleanUp = function cleanUp() {
      // 执行这个函数后，要销毁这个函数
      window[name] = undefined;
      // 获取这个script的元素
      var elem = document.getElementById('id_' + name);
      // 删除head里面插入的script，这三步都是为了不影响污染整个DOM啊
      removeElement(elem);

      if (timer) {
        clearTimeout(timer);
      }
    };

    if (timeout) {
      timer = setTimeout(function () {
        cleanUp();
        reject(new Error('Timeout'));
      }, timeout);
    }

    // 把传进来的函数重新组装，并把它设置为全局函数，远程就是调用这个函数
    window[name] = function (json) {
      cleanUp();
      // 执行传入的的函数
      resolve(json);
    };

    // 在head里面插入script元素
    var head = document.getElementsByTagName('head');

    if (head && head[0]) {
      head[0].appendChild(script);
    }
  });
}

exports.default = getJSONP;