(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const {BakongKHQR, khqrData} = require("bakong-khqr");
const optionalData = {
    currency: khqrData.currency.khr,
    amount: 100000,
    billNumber: "#0001",
    mobileNumber: "85587575857",
    storeLabel: "Devit Huotkeo",
    terminalLabel: "Devit I",
};

const individualInfo = new IndividualInfo(
    "devit@abaa",
    khqrData.currency.khr,
    "devit",
    "Battambang",
    optionalData
);

const khqr = new BakongKHQR();
const response = khqr.generateIndividual(individualInfo);

console.log(response);
},{"bakong-khqr":59}],2:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":4}],3:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var cookies = require('./../helpers/cookies');
var buildURL = require('./../helpers/buildURL');
var buildFullPath = require('../core/buildFullPath');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var defaults = require('../defaults');
var Cancel = require('../cancel/Cancel');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || defaults.transitional;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (!request) {
          return;
        }
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

},{"../cancel/Cancel":5,"../core/buildFullPath":10,"../core/createError":11,"../defaults":17,"./../core/settle":15,"./../helpers/buildURL":20,"./../helpers/cookies":22,"./../helpers/isURLSameOrigin":25,"./../helpers/parseHeaders":27,"./../utils":30}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');
axios.VERSION = require('./env/data').version;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":5,"./cancel/CancelToken":6,"./cancel/isCancel":7,"./core/Axios":8,"./core/mergeConfig":14,"./defaults":17,"./env/data":18,"./helpers/bind":19,"./helpers/isAxiosError":24,"./helpers/spread":28,"./utils":30}],5:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],6:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel);
    }
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Subscribe to the cancel signal
 */

CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * Unsubscribe from the cancel signal
 */

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":5}],7:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],8:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');
var validator = require('../helpers/validator');

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"../helpers/buildURL":20,"../helpers/validator":29,"./../utils":30,"./InterceptorManager":9,"./dispatchRequest":12,"./mergeConfig":14}],9:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":30}],10:[function(require,module,exports){
'use strict';

var isAbsoluteURL = require('../helpers/isAbsoluteURL');
var combineURLs = require('../helpers/combineURLs');

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

},{"../helpers/combineURLs":21,"../helpers/isAbsoluteURL":23}],11:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":13}],12:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var Cancel = require('../cancel/Cancel');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/Cancel":5,"../cancel/isCancel":7,"../defaults":17,"./../utils":30,"./transformData":16}],13:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  };
  return error;
};

},{}],14:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};

},{"../utils":30}],15:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":11}],16:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var defaults = require('./../defaults');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

},{"./../defaults":17,"./../utils":30}],17:[function(require,module,exports){
(function (process){(function (){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');
var enhanceError = require('./core/enhanceError');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false
  },

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw enhanceError(e, this, 'E_JSON_PARSE');
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this)}).call(this,require('_process'))
},{"./adapters/http":3,"./adapters/xhr":3,"./core/enhanceError":13,"./helpers/normalizeHeaderName":26,"./utils":30,"_process":71}],18:[function(require,module,exports){
module.exports = {
  "version": "0.24.0"
};
},{}],19:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],20:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":30}],21:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],22:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

},{"./../utils":30}],23:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],24:[function(require,module,exports){
'use strict';

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
module.exports = function isAxiosError(payload) {
  return (typeof payload === 'object') && (payload.isAxiosError === true);
};

},{}],25:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

},{"./../utils":30}],26:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":30}],27:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":30}],28:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],29:[function(require,module,exports){
'use strict';

var VERSION = require('../env/data').version;

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')));
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt);
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
};

},{"../env/data":18}],30:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (toString.call(val) !== '[object Object]') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
};

},{"./helpers/bind":19}],31:[function(require,module,exports){
class CRCValidation {
    constructor(valid) {
        this.isValid = valid
    }
}

module.exports = CRCValidation

},{}],32:[function(require,module,exports){
const { errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class CRC extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined)
            throw KHQRResponse(null, errorCode.CRC_TAG_REQUIRED)
        else if (value.length > 4)
            throw KHQRResponse(null, errorCode.CRC_LENGTH_INVALID)
            
        super(tag, value)
    }
}

module.exports = CRC

},{"../constant":50,"../model":60,"../tagLengthString":63}],33:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class AdditionalData extends TagLengthString {
    constructor(tag, additionalData) {
        if (additionalData == null)
            additionalData = {
                billNumberInput: null,
                mobileNumberInput: null,
                storeLabelInput: null,
                terminalLabelInput: null,
            };

        // Getting information from additionalData
        const billNumberInput = additionalData.billNumber;
        const mobileNumberInput = additionalData.mobileNumber;
        const storeLabelInput = additionalData.storeLabel;
        const terminalLabelInput = additionalData.terminalLabel;
        const purposeOfTransaction = additionalData.purposeOfTransaction;

        let billNumber;
        let mobileNumber;
        let storeLabel;
        let terminalLabel;

        // Create additional data tag by combine all three sub tags
        let additionalDataString = "";
        if (billNumberInput != undefined) {
            billNumber = new BillNumber(emv.BILLNUMBER_TAG, billNumberInput);
            additionalDataString += billNumber.toString();
        }
        if (mobileNumberInput != undefined) {
            mobileNumber = new MobileNumber(
                emv.ADDITIONAL_DATA_FIELD_MOBILE_NUMBER,
                mobileNumberInput
            );
            additionalDataString += mobileNumber.toString();
        }
        if (storeLabelInput != undefined) {
            storeLabel = new StoreLabel(emv.STORELABEL_TAG, storeLabelInput);
            additionalDataString += storeLabel.toString();
        }
        if (terminalLabelInput != undefined) {
            terminalLabel = new TerminalLabel(
                emv.TERMINAL_TAG,
                terminalLabelInput
            );
            additionalDataString += terminalLabel.toString();
        }

        if (purposeOfTransaction != undefined) {
            const purpose = new PurposeOfTransaction(emv.PURPOSE_OF_TRANSACTION, purposeOfTransaction)
            additionalDataString += purpose.toString()
        }

        super(tag, additionalDataString);

        // class inherit the billNumber, storeLabel, terminalLabel
        this.billNumber = billNumber;
        this.mobileNumber = mobileNumber;
        this.storeLabel = storeLabel;
        this.terminalLabel = terminalLabel;
        this.data = {
            billNumber: billNumber,
            mobileNumber: mobileNumber,
            storeLabel: storeLabel,
            terminalLabel: terminalLabel,
            purposeOfTransaction: purposeOfTransaction
        };
    }
}

class BillNumber extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.BILL_NUMBER || value == "")
            throw KHQRResponse(null, errorCode.BILL_NUMBER_LENGTH_INVALID);
        super(tag, value);
    }
}

class StoreLabel extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.STORE_LABEL || value == "")
            throw KHQRResponse(null, errorCode.STORE_LABEL_LENGTH_INVALID);
        super(tag, value);
    }
}

class TerminalLabel extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.TERMINAL_LABEL || value == "")
            throw KHQRResponse(null, errorCode.TERMINAL_LABEL_LENGTH_INVALID);
        super(tag, value);
    }
}

class MobileNumber extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.MOBILE_NUMBER || value == "")
            throw KHQRResponse(null, errorCode.MOBILE_NUMBER_LENGTH_INVALID);
        super(tag, value);
    }
}

class PurposeOfTransaction extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.PURPOSE_OF_TRANSACTION || value == "")
            throw KHQRResponse(null, errorCode.PURPOSE_OF_TRANSACTION_LENGTH_INVALID);
        super(tag, value);
    }
}

module.exports = AdditionalData;

},{"../constant":50,"../model":60,"../tagLengthString":63}],34:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class CountryCode extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined) 
            throw KHQRResponse(null, errorCode.COUNTRY_CODE_TAG_REQUIRED)
        else if (value.length > emv.INVALID_LENGTH.COUNTRY_CODE) 
            throw KHQRResponse(null, errorCode.COUNTRY_CODE_LENGTH_INVALID)
        super(tag, value);
    }
}

module.exports = CountryCode;

},{"../constant":50,"../model":60,"../tagLengthString":63}],35:[function(require,module,exports){
const TagLengthString = require("../tagLengthString");
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");

// tag should be 29, 30
class GlobalUniqueIdentifier extends TagLengthString {
    constructor(tag, valueObject) {
        if (valueObject == null)
            throw KHQRResponse(null, errorCode.MERCHANT_TYPE_REQUIRED);

        if (valueObject == null)
            valueObject = {
                bakongAccountID: null,
                merchantID: null,
                acquiringBank: null,
                accountInformation: null,
            };

        // Get value from props object
        const bakongAccountID = valueObject.bakongAccountID;
        const merchantID = valueObject.merchantID;
        const acquiringBank = valueObject.acquiringBank;

        const isMerchant = valueObject.isMerchant;
        const accountInformation = valueObject.accountInformation;

        // Creating 3 instances
        // BakongAccountID: 00
        // MerchantID: 01
        // AcquiringBankName: 02
        const bakongAccountId = new BakongAccountID(
            emv.BAKONG_ACCOUNT_IDENTIFIER,
            bakongAccountID
        );

        let globalUniqueIdentifier = bakongAccountId.toString();

        if (isMerchant) {
            const merchantId = new MerchantId(
                emv.MERCHANT_ACCOUNT_INFORMATION_MERCHANT_ID,
                merchantID
            );
            const acquiringBankName = new AcquiringBank(
                emv.MERCHANT_ACCOUNT_INFORMATION_ACQUIRING_BANK,
                acquiringBank
            );


            if (merchantID != undefined)
                globalUniqueIdentifier += merchantId.toString();
            if (acquiringBank != undefined)
                globalUniqueIdentifier += acquiringBankName.toString();

            super(tag, globalUniqueIdentifier);

            this.merchantID = merchantId;
            this.acquiringBank = acquiringBankName;
            this.data = {
                bakongAccountID: bakongAccountId,
                merchantID: merchantId,
                acquiringBank: acquiringBankName,
            };
        } else {
            if (accountInformation != undefined) {
                const accInformation = new AccountInformation(
                    emv.INDIVIDUAL_ACCOUNT_INFORMATION,
                    accountInformation
                );
                globalUniqueIdentifier += accInformation.toString();
            }

            if (acquiringBank != undefined) {
                const acquiringBankName = new AcquiringBank(
                    emv.MERCHANT_ACCOUNT_INFORMATION_ACQUIRING_BANK,
                    acquiringBank
                );
                globalUniqueIdentifier += acquiringBankName.toString();
            }

            super(tag, globalUniqueIdentifier);

            this.accountInformation = accountInformation;
            this.data = {
                bakongAccountID: bakongAccountId,
                accountInformation: accountInformation,
            };
        }
        this.bakongAccountID = bakongAccountId;
    }
}

class BakongAccountID extends TagLengthString {
    constructor(tag, bakongAccountID) {
        // Throw validation if there is
        // 1. No tag
        // 2. empty value of bakong account
        if (
            bakongAccountID == "" ||
            bakongAccountID == null ||
            bakongAccountID == undefined
        )
            throw KHQRResponse(null, errorCode.BAKONG_ACCOUNT_ID_REQUIRED);

        // Validating the bakong account is it is correct
        // name@bank_domain
        const bakongAccountDivide = bakongAccountID.split("@");

        // Validate on length of the bakong account
        if (bakongAccountID.length > emv.INVALID_LENGTH.BAKONG_ACCOUNT)
            throw KHQRResponse(
                null,
                errorCode.BAKONG_ACCOUNT_ID_LENGTH_INVALID
            );
        else if (bakongAccountDivide.length < 2)
            throw KHQRResponse(null, errorCode.BAKONG_ACCOUNT_ID_INVALID);
        super(tag, bakongAccountID);
    }
}

class AccountInformation extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.ACCOUNT_INFORMATION)
            throw KHQRResponse(null, errorCode.ACCOUNT_INFORMATION_LENGTH_INVALID);
        super(tag, value)
    }
}

class MerchantId extends TagLengthString {
    constructor(tag, value) {
        if (value == "" || value == null || value == undefined)
            throw KHQRResponse(null, errorCode.MERCHANT_ID_REQUIRED);
        else if (value.length > emv.INVALID_LENGTH.MERCHANT_ID)
            throw KHQRResponse(null, errorCode.MERCHANT_ID_LENGTH_INVALID);
        super(tag, value);
    }
}

class AcquiringBank extends TagLengthString {
    constructor(tag, value) {
        if (value == "" || value == null || value == undefined)
            throw KHQRResponse(null, errorCode.ACQUIRING_BANK_REQUIRED);
        else if (value.length > emv.INVALID_LENGTH.ACQUIRING_BANK)
            throw KHQRResponse(null, errorCode.ACQUIRING_BANK_LENGTH_INVALID);
        super(tag, value);
    }
}

module.exports = GlobalUniqueIdentifier;

},{"../constant":50,"../model":60,"../tagLengthString":63}],36:[function(require,module,exports){
const PointOfInitiationMethod = require("./pointOfInitiationMethod");
const PayloadFormatIndicator = require("./payloadFormatIndicator");
const CRC = require("./CRC");
const GlobalUnqiueIdentifier = require("./globalUniqueIdentifier");
const TransactionCurrency = require("./transactionCurrency");
const CountryCode = require("./countryCode");
const MerchantCity = require("./merchantCity");
const MerchantCategoryCode = require("./merchantCategoryCode");
const TransactionAmount = require("./transactionAmount");
const MerchantName = require("./merchantName");
const TimeStamp = require("./timeStamp");
const MerchantInformationLanguageTemplate = require("./merchantInformationLanguageTemplate")
const UnionpayMerchantAccount = require("./unionPayMerchant")
const AdditionalData = require("./additionalData");

module.exports = {
    PointOfInitiationMethod,
    PayloadFormatIndicator,
    CRC,
    GlobalUnqiueIdentifier,
    TransactionCurrency,
    CountryCode,
    MerchantCity,
    MerchantCategoryCode,
    TransactionAmount,
    MerchantName,
    TimeStamp,
    MerchantInformationLanguageTemplate,
    UnionpayMerchantAccount,
    AdditionalData,
};

},{"./CRC":32,"./additionalData":33,"./countryCode":34,"./globalUniqueIdentifier":35,"./merchantCategoryCode":37,"./merchantCity":38,"./merchantInformationLanguageTemplate":39,"./merchantName":40,"./payloadFormatIndicator":41,"./pointOfInitiationMethod":42,"./timeStamp":43,"./transactionAmount":44,"./transactionCurrency":45,"./unionPayMerchant":46}],37:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class MerchantCategoryCode extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined)
            throw KHQRResponse(null, errorCode.MERCHANT_CATEGORY_TAG_REQUIRED)
        else if (value.length > emv.INVALID_LENGTH.MERCHANT_CATEGORY_CODE)
            throw KHQRResponse(null, errorCode.MERCHANT_CODE_LENGTH_INVALID)
        super(tag, value);
    }
}

module.exports = MerchantCategoryCode;

},{"../constant":50,"../model":60,"../tagLengthString":63}],38:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class MerchantCity extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined)
            throw KHQRResponse(null, errorCode.MERCHANT_CITY_TAG_REQUIRED)
        else if (value.length > emv.INVALID_LENGTH.MERCHANT_CITY)
            throw KHQRResponse(null, errorCode.MERCHANT_CITY_LENGTH_INVALID)
        super(tag, value);
    }
}

module.exports = MerchantCity;

},{"../constant":50,"../model":60,"../tagLengthString":63}],39:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class MerchantInformationLanguageTemplate extends TagLengthString {
    constructor(tag, value) {
        if (value == null) {
            value = {
                languagePreference: null,
                merchantNameAlternateLanguage: null,
                merchantCityAlternateLanguage: null
            }
        }

        if (value.languagePreference && !value.merchantNameAlternateLanguage)
            throw KHQRResponse(null, errorCode.MERCHANT_NAME_ALTERNATE_LANGUAGE_REQUIRED);

        let merchantInformationLanguageTemplateString = "";

        const perference = new LanguagePreference(emv.LANGUAGE_PREFERENCE, value.languagePreference);
        merchantInformationLanguageTemplateString += perference.toString();

        if (value.merchantNameAlternateLanguage != undefined) {
            const alterName = new MerchantNameAlternateLanguage(emv.MERCHANT_NAME_ALTERNATE_LANGUAGE, value.merchantNameAlternateLanguage);
            merchantInformationLanguageTemplateString += alterName.toString();
        }

        if (value.merchantCityAlternateLanguage != undefined) {
            const alterCity = new MerchantCityAlternateLanguage(emv.MERCHANT_CITY_ALTERNATE_LANGUAGE, value.merchantCityAlternateLanguage);
            merchantInformationLanguageTemplateString += alterCity.toString();
        }

        super(tag, merchantInformationLanguageTemplateString);

        this.data = value
    }
}

class LanguagePreference extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.LANGUAGE_PREFERENCE || value == "")
            throw KHQRResponse(null, errorCode.LANGUAGE_PREFERENCE_LENGTH_INVALID);
        super(tag, value);
    }
}

class MerchantNameAlternateLanguage extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.MERCHANT_NAME_ALTERNATE_LANGUAGE || value == "")
            throw KHQRResponse(null, errorCode.MERCHANT_NAME_ALTERNATE_LANGUAGE_LENGTH_INVALID);
        super(tag, value);
    }
}

class MerchantCityAlternateLanguage extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.MERCHANT_CITY_ALTERNATE_LANGUAGE || value== "")
            throw KHQRResponse(null, errorCode.MERCHANT_CITY_ALTERNATE_LANGUAGE_LENGTH_INVALID);
        super(tag, value);
    }
}

module.exports = MerchantInformationLanguageTemplate;

},{"../constant":50,"../model":60,"../tagLengthString":63}],40:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class MerchantName extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined) 
            throw KHQRResponse(null, errorCode.MERCHANT_NAME_REQUIRED)
        else if (value.length > emv.INVALID_LENGTH.MERCHANT_NAME) 
            throw KHQRResponse(null, errorCode.MERCHANT_NAME_LENGTH_INVALID)
        super(tag, value);
    }
}

module.exports = MerchantName;

},{"../constant":50,"../model":60,"../tagLengthString":63}],41:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class PayloadFormatIndicator extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined)
            throw KHQRResponse(null, errorCode.PAYLOAD_FORMAT_INDICATOR_TAG_REQUIRED);
        else if (value.length > 2)
            throw KHQRResponse(null, errorCode.PAYLOAD_FORMAT_INDICATOR_LENGTH_INVALID);
        super(tag, value)
    }
}

module.exports = PayloadFormatIndicator
},{"../constant":50,"../model":60,"../tagLengthString":63}],42:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class PointOfInitiationMethod extends TagLengthString {
    constructor(tag, value) {
        if (value.length > 2) 
            throw KHQRResponse(null, errorCode.POINT_INITIATION_LENGTH_INVALID);
        super(tag, value)
    }
}

module.exports = PointOfInitiationMethod

},{"../constant":50,"../model":60,"../tagLengthString":63}],43:[function(require,module,exports){
const TagLengthString = require("../tagLengthString");

class TimeStamp extends TagLengthString {
    constructor(tag) {
        const milisecondTimeStamp = Math.floor(Date.now());
        const timeStamp = new TimeStampMiliSecond("00", milisecondTimeStamp);
        const value = timeStamp.toString();

        super(tag, value);
    }
}

class TimeStampMiliSecond extends TagLengthString {
    constructor(tag, value) {
        super(tag, value)
    }
}

module.exports = TimeStamp;

},{"../tagLengthString":63}],44:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class TransactionAmount extends TagLengthString {
    constructor(tag, value) {
        if (
            String(value).length > emv.INVALID_LENGTH.AMOUNT ||
            String(value).includes("-") ||
            value == "" ||
            value == undefined ||
            value == null
        )
            throw KHQRResponse(null, errorCode.TRANSACTION_AMOUNT_INVALID);

        super(tag, value);
    }
}

module.exports = TransactionAmount;

},{"../constant":50,"../model":60,"../tagLengthString":63}],45:[function(require,module,exports){
const { emv, errorCode, khqrData } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class TransactionCurrency extends TagLengthString {
    constructor(tag, value) {
        if (value == ""  || value ==  null || value == undefined)
            throw KHQRResponse(null, errorCode.CURRENCY_TYPE_REQUIRED);
        else if (value.length > 3)
            throw KHQRResponse(null, errorCode.TRANSACTION_CURRENCY_LENGTH_INVALID);
        else if (![khqrData.currency.khr, khqrData.currency.usd].includes(parseInt(value)))
            throw KHQRResponse(null, errorCode.UNSUPPORTED_CURRENCY)
        super(tag, value);
    }
}

module.exports = TransactionCurrency

},{"../constant":50,"../model":60,"../tagLengthString":63}],46:[function(require,module,exports){
const { emv, errorCode } = require("../constant");
const { KHQRResponse } = require("../model");
const TagLengthString = require("../tagLengthString");

class UnionpayMerchantAccount extends TagLengthString {
    constructor(tag, value) {
        if (value.length > emv.INVALID_LENGTH.UPI_MERCHANT)
            throw KHQRResponse(null, errorCode.UPI_ACCOUNT_INFORMATION_LENGTH_INVALID);
        super(tag, value)
    }
}

module.exports = UnionpayMerchantAccount
},{"../constant":50,"../model":60,"../tagLengthString":63}],47:[function(require,module,exports){
const { emv } = require(".");

module.exports = {
    input: [
        {
            tag: "29",
            data: {
                bakongAccountID: null,
                accountInformation: null,
            },
        },
        {
            tag: "30",
            data: {
                bakongAccountID: null,
                merchantID: null,
                acquiringBank: null,
            },
        },
        {
            tag: "62",
            data: {
                billNumber: null,
                mobileNumber: null,
                storeLabel: null,
                terminalLabel: null,
                purposeOfTransaction: null
            },
        },
        {
            tag: "64",
            data: {
                languagePreference: null,
                merchantNameAlternateLanguage: null,
                merchantCityAlternateLanguage: null
            },
        },
    ],
    compare: [
        {
            tag: "29",
            subTag: emv.BAKONG_ACCOUNT_IDENTIFIER,
            name: "bakongAccountID",
        },
        {
            tag: "29",
            subTag: emv.MERCHANT_ACCOUNT_INFORMATION_MERCHANT_ID,
            name: "accountInformation",
        },
        {
            tag: "29",
            subTag: emv.MERCHANT_ACCOUNT_INFORMATION_ACQUIRING_BANK,
            name: "acquiringBank",
        },
        {
            tag: "62",
            subTag: emv.BILLNUMBER_TAG,
            name: "billNumber",
        },
        {
            tag: "62",
            subTag: emv.ADDITIONAL_DATA_FIELD_MOBILE_NUMBER,
            name: "mobileNumber",
        },
        {
            tag: "62",
            subTag: emv.STORELABEL_TAG,
            name: "storeLabel",
        },
        {
            tag: "62",
            subTag: emv.PURPOSE_OF_TRANSACTION,
            name: "purposeOfTransaction",
        },
        {
            tag: "62",
            subTag: emv.TERMINAL_TAG,
            name: "terminalLabel",
        },
        {
            tag: "64",
            subTag: emv.LANGUAGE_PREFERENCE,
            name: "languagePreference",
        },
        {
            tag: "64",
            subTag: emv.MERCHANT_NAME_ALTERNATE_LANGUAGE,
            name: "merchantNameAlternateLanguage",
        },
        {
            tag: "64",
            subTag: emv.MERCHANT_CITY_ALTERNATE_LANGUAGE,
            name: "merchantCityAlternateLanguage",
        },
    ],
};

},{".":50}],48:[function(require,module,exports){
// Merchant class
const {
    PointOfInitiationMethod,
    PayloadFormatIndicator,
    TransactionCurrency,
    MerchantCategoryCode,
    CountryCode,
    MerchantCity,
    TransactionAmount,
    MerchantName,
    TimeStamp,
    AdditionalData,
    CRC,
    GlobalUnqiueIdentifier,
    MerchantInformationLanguageTemplate,
    UnionpayMerchantAccount
} = require("../MerchantCode");

module.exports = [
    {
        tag: "00",
        type: "payloadFormatIndicator",
        required: true,
        instance: PayloadFormatIndicator,
    },
    {
        tag: "01",
        type: "pointofInitiationMethod",
        required: false,
        instance: PointOfInitiationMethod,
    },
    {
        tag: "15",
        type: "unionPayMerchant",
        required: false,
        instance: UnionpayMerchantAccount,
    },
    {
        sub: true,
        tag: "29",
        type: "globalUnqiueIdentifier",
        required: true,
        instance: GlobalUnqiueIdentifier,
    },
    {
        tag: "52",
        type: "merchantCategoryCode",
        required: true,
        instance: MerchantCategoryCode,
    },
    {
        tag: "53",
        type: "transactionCurrency",
        required: true,
        instance: TransactionCurrency,
    },
    {
        tag: "54",
        type: "transactionAmount",
        required: false,
        instance: TransactionAmount,
    },
    {
        tag: "58",
        type: "countryCode",
        required: true,
        instance: CountryCode,
    },
    {
        tag: "59",
        type: "merchantName",
        required: true,
        instance: MerchantName,
    },
    {
        tag: "60",
        type: "merchantCity",
        required: true,
        instance: MerchantCity,
    },
    {
        tag: "62",
        sub: true,
        type: "additionalData",
        required: false,
        instance: AdditionalData,
    },
    {
        tag: "64",
        sub: true,
        type: "merchantInformationLanguageTemplate",
        required: false,
        instance: MerchantInformationLanguageTemplate,
    },
    {
        tag: "99",
        type: "timestamp",
        required: false,
        instance: TimeStamp,
    },
    {
        tag: "63",
        type: "crc",
        required: true,
        instance: CRC,
    },
];

},{"../MerchantCode":36}],49:[function(require,module,exports){
const errorCode = {
    BAKONG_ACCOUNT_ID_REQUIRED: {
        code: 1,
        message: "Bakong Account ID cannot be null or empty",
    },
    MERCHANT_NAME_REQUIRED: {
        code: 2,
        message: "Merchant name cannot be null or empty",
    },
    BAKONG_ACCOUNT_ID_INVALID: {
        code: 3,
        message: "Bakong Account ID is invalid",
    },
    TRANSACTION_AMOUNT_INVALID: {
        code: 4,
        message: "Amount is invalid",
    },
    MERCHANT_TYPE_REQUIRED: {
        code: 5,
        message: "Merchant type cannot be null or empty",
    },
    BAKONG_ACCOUNT_ID_LENGTH_INVALID: {
        code: 6,
        message: "Bakong Account ID Length is Invalid",
    },
    MERCHANT_NAME_LENGTH_INVALID: {
        code: 7,
        message: "Merchant Name Length is invalid",
    },
    KHQR_INVALID: {
        code: 8,
        message: "KHQR provided is invalid",
    },
    CURRENCY_TYPE_REQUIRED: {
        code: 9,
        message: "Currency type cannot be null or empty",
    },
    BILL_NUMBER_LENGTH_INVALID: {
        code: 10,
        message: "Bill Name Length is invalid",
    },
    STORE_LABEL_LENGTH_INVALID: {
        code: 11,
        message: "Store Label Length is invalid",
    },
    TERMINAL_LABEL_LENGTH_INVALID: {
        code: 12,
        message: "Terminal Label Length is invalid",
    },
    CONNECTION_TIMEOUT: {
        code: 13,
        message:
            "Cannot reach Bakong Open API service. Please check internet connection",
    },
    INVALID_DEEP_LINK_SOURCE_INFO: {
        code: 14,
        message: "Source Info for Deep Link is invalid",
    },
    INTERNAL_SREVER: {
        code: 15,
        message: "Internal server error",
    },
    PAYLOAD_FORMAT_INDICATOR_LENGTH_INVALID: {
        code: 16,
        message: "Payload Format indicator Length is invalid",
    },
    POINT_INITIATION_LENGTH_INVALID: {
        code: 17,
        message: "Point of initiation Length is invalid",
    },
    MERCHANT_CODE_LENGTH_INVALID: {
        code: 18,
        message: "Merchant code Length is invalid",
    },
    TRANSACTION_CURRENCY_LENGTH_INVALID: {
        code: 19,
        message: "Transaction currency Length is invalid",
    },
    COUNTRY_CODE_LENGTH_INVALID: {
        code: 20,
        message: "Country code Length is invalid",
    },
    MERCHANT_CITY_LENGTH_INVALID: {
        code: 21,
        message: "Merchant city Length is invalid",
    },
    CRC_LENGTH_INVALID: {
        code: 22,
        message: "CRC Length is invalid",
    },
    PAYLOAD_FORMAT_INDICATOR_TAG_REQUIRED: {
        code: 23,
        message: "Payload format indicator tag required",
    },
    CRC_TAG_REQUIRED: {
        code: 24,
        message: "CRC tag required",
    },
    MERCHANT_CATEGORY_TAG_REQUIRED: {
        code: 25,
        message: "Merchant category tag required",
    },
    COUNTRY_CODE_TAG_REQUIRED: {
        code: 26,
        message: "Country Code cannot be null or empty",
    },
    MERCHANT_CITY_TAG_REQUIRED: {
        code: 27,
        message: "Merchant City cannot be null or empty",
    },
    UNSUPPORTED_CURRENCY: {
        code: 28,
        message: "Unsupported currency",
    },
    INVALID_DEEP_LINK_URL: {
        code: 29,
        message: "Deep Link URL is not valid",
    },
    MERCHANT_ID_REQUIRED: {
        code: 30,
        message: "Merchant ID cannot be null or empty",
    },
    ACQUIRING_BANK_REQUIRED: {
        code: 31,
        message: "Acquiring Bank cannot be null or empty",
    },
    MERCHANT_ID_LENGTH_INVALID: {
        code: 32,
        message: "Merchant ID Length is invalid",
    },
    ACQUIRING_BANK_LENGTH_INVALID: {
        code: 33,
        message: "Acquiring Bank Length is invalid",
    },
    MOBILE_NUMBER_LENGTH_INVALID: {
        code: 34,
        message: "Mobile Number Length is invalid",
    },
    ACCOUNT_INFORMATION_LENGTH_INVALID: {
        code: 35,
        message: "Account Information Length is invalid",
    },
    TAG_NOT_IN_ORDER: { code: 36, message: "Tag is not in order" },
    LANGUAGE_PREFERENCE_REQUIRED: {
        code: 37,
        message: "Language Preference cannot be null or empty",
    },
    LANGUAGE_PREFERENCE_LENGTH_INVALID: {
        code: 38,
        message: "Language Preference Length is invalid",
    },
    MERCHANT_NAME_ALTERNATE_LANGUAGE_REQUIRED: {
        code: 39,
        message: "Merchant Name Alternate Language cannot be null or empty",
    },
    MERCHANT_NAME_ALTERNATE_LANGUAGE_LENGTH_INVALID: {
        code: 40,
        message: "Merchant Name Alternate Language Length is invalid",
    },
    MERCHANT_CITY_ALTERNATE_LANGUAGE_LENGTH_INVALID: {
        code: 41,
        message: "Merchant City Alternate Language Length is invalid",
    },
    PURPOSE_OF_TRANSACTION_LENGTH_INVALID: {
        code: 42,
        message: "Purpose of Transaction Length is invalid",
    },
    UPI_ACCOUNT_INFORMATION_LENGTH_INVALID: {
        code: 43,
        message: "Upi Account Information Length is invalid",
    },
    UPI_ACCOUNT_INFORMATION_INVALID_CURRENCY: {
        code: 44,
        message: "Upi Account Information Length does not accept USD",
    },
};

module.exports = errorCode;

},{}],50:[function(require,module,exports){
const khqrData = require("./khqrData");
const errorCode = require("./errorCode")

const emv = {
    PAYLOAD_FORMAT_INDICATOR: "00",
    DEFAULT_PAYLOAD_FORMAT_INDICATOR: "01",
    POINT_OF_INITIATION_METHOD: "01",
    STATIC_QR: "11",
    DYNAMIC_QR: "12",
    MERCHANT_ACCOUNT_INFORMATION_INDIVIDUAL: "29",
    MERCHANT_ACCOUNT_INFORMATION_MERCHANT: "30",
    BAKONG_ACCOUNT_IDENTIFIER: "00",
    MERCHANT_ACCOUNT_INFORMATION_MERCHANT_ID: "01",
    INDIVIDUAL_ACCOUNT_INFORMATION: "01",
    MERCHANT_ACCOUNT_INFORMATION_ACQUIRING_BANK: "02",
    MERCHANT_CATEGORY_CODE: "52",
    DEFAULT_MERCHANT_CATEGORY_CODE: "5999",
    TRANSACTION_CURRENCY: "53",
    TRANSACTION_AMOUNT: "54",
    DEFAULT_TRANSACTION_AMOUNT: "0",
    COUNTRY_CODE: "58",
    DEFAULT_COUNTRY_CODE: "KH",
    MERCHANT_NAME: "59",
    MERCHANT_CITY: "60",
    DEFAULT_MERCHANT_CITY: "Phnom Penh",
    CRC: "63",
    CRC_LENGTH: "04",
    ADDITIONAL_DATA_TAG: "62",
    BILLNUMBER_TAG: "01",
    ADDITIONAL_DATA_FIELD_MOBILE_NUMBER: "02",
    STORELABEL_TAG: "03",
    TERMINAL_TAG: "07",
    PURPOSE_OF_TRANSACTION: "08",
    TIMESTAMP_TAG: "99",
    MERCHANT_INFORMATION_LANGUAGE_TEMPLATE: "64",
    LANGUAGE_PREFERENCE: "00",
    MERCHANT_NAME_ALTERNATE_LANGUAGE: "01",
    MERCHANT_CITY_ALTERNATE_LANGUAGE: "02",
    UNIONPAY_MERCHANT_ACCOUNT: "15",
    INVALID_LENGTH: {
        KHQR: 12,
        MERCHANT_NAME: 25,
        BAKONG_ACCOUNT: 32,
        AMOUNT: 13,
        COUNTRY_CODE: 3,
        MERCHANT_CATEGORY_CODE: 4,
        MERCHANT_CITY: 15,
        TIMESTAMP: 13,
        TRANSACTION_AMOUNT: 14,
        TRANSACTION_CURRENCY: 3,
        TIMESTAMP: 13,
        BILL_NUMBER: 25,
        STORE_LABEL: 25,
        TERMINAL_LABEL: 25,
        PURPOSE_OF_TRANSACTION: 25,
        MERCHANT_ID: 32,
        ACQUIRING_BANK: 32,
        MOBILE_NUMBER: 25,
        ACCOUNT_INFORMATION: 32,
        MERCHANT_INFORMATION_LANGUAGE_TEMPLATE: 99,
        UPI_MERCHANT: 99,
        LANGUAGE_PREFERENCE: 2,
        MERCHANT_NAME_ALTERNATE_LANGUAGE: 25,
        MERCHANT_CITY_ALTERNATE_LANGUAGE: 15
    },
};

module.exports = { emv, errorCode, khqrData };

},{"./errorCode":49,"./khqrData":51}],51:[function(require,module,exports){
const KHQRData = {
    currency: {
        usd: 840,
        khr: 116,
    },
    merchantType: {
        merchant: "merchant",
        individual: "individual",
    },
};

module.exports = KHQRData;

},{}],52:[function(require,module,exports){
const KHQRSubtag = require("../constant/KHQRSubtag");
const KHQRTag = require("../constant/KHQRTag");
const cutString = require("../helper/cutString");

/**
 * Decode helper function
 * This decode funcition has a flow of
 * 1. Slice the string as each KHQR tag and store into memory
 * 2. Check if the required field exist
 * 3. Check if the KHQR Code given is in order or not
 * 4. Get the value of each tag and if there is subtag repeat number 1
 * @param {string} KHQRStringdecode
 */
function decodeKHQR(KHQRString) {
    const allField = KHQRTag.map((el) => el.tag);
    const subtag = KHQRTag.filter((el) => el.sub == true).map((obj) => obj.tag);
    let requiredField = KHQRTag.filter((el) => el.required == true).map(
        (el) => el.tag
    );
    const subTagInput = KHQRSubtag.input;
    const subTagCompare = KHQRSubtag.compare;

    let tags = {};
    let merchantType = null;
    let lastTag = "";
    let isMerchantTag = false;

    while (KHQRString) {
        sliceTagObject = cutString(KHQRString);
        let { tag, value, slicedString } = sliceTagObject;

        if (tag == lastTag) break;

        const isMerchant = tag == "30";

        if (isMerchant) {
            merchantType = "30";
            tag = "29";
            isMerchantTag = true
        } else if (tag == "29") merchantType = "29";

        if (allField.includes(tag)) {
            tags[tag] = value;
            requiredField = requiredField.filter((el) => el != tag);
        }

        KHQRString = slicedString;
        lastTag = tag;
    }

    let decodeValue = {
        merchantType: merchantType,
    };

    subTagInput
        .map((el) => el.data)
        .forEach((obj) => (decodeValue = { ...decodeValue, ...obj }));
    KHQRTag.forEach((khqrTag) => {
        const tag = khqrTag.tag;
        const khqr = KHQRTag.find((el) => el.tag == tag);
        let value = tags[tag] == undefined ? null : tags[tag];
        let inputValue = value;
        if (subtag.includes(tag)) {
            const inputdata = cloneObject(findTag(subTagInput, tag).data);
            while (value) {
                cutsubstring = cutString(value);
                const subtag = cutsubstring.tag;
                const subtagValue = cutsubstring.value;
                const slicedsubtag = cutsubstring.slicedString;

                let nameSubtag = subTagCompare
                    .filter((el) => el.tag == tag)
                    .find((el) => el.subTag == subtag);

                if (nameSubtag != undefined) {
                    nameSubtag = nameSubtag.name;
                    if (isMerchantTag && nameSubtag == "accountInformation") nameSubtag = "merchantID";
                    inputdata[nameSubtag] = subtagValue;
                    inputValue = inputdata;
                }
                value = slicedsubtag;
            }
            decodeValue = { ...decodeValue, ...inputValue };
            try {
                new khqr.instance(tag, inputValue);
            } catch (error) {}
        } else {
            decodeValue[khqr.type] = value;
            if (tag == "99" && value == null) decodeValue[khqr.type] = null;
        }
    });

    return decodeValue;
}

/**
 * Helper function for decode
 * It query from the object where tag is the same
 */
const findTag = (object, tag) => object.find((el) => el.tag == tag);

/**
 * Check if the array is in order algorithm
 */
const isInorder = (a) => a.slice(1).every((e, i) => e > a[i]);
const cloneObject = (obj) => JSON.parse(JSON.stringify(obj));

module.exports = decodeKHQR;

},{"../constant/KHQRSubtag":47,"../constant/KHQRTag":48,"../helper/cutString":57}],53:[function(require,module,exports){
const { errorCode } = require("../constant");
const KHQRSubtag = require("../constant/KHQRSubtag");
const KHQRTag = require("../constant/KHQRTag");
const cutString = require("../helper/cutString");
const { KHQRResponse } = require("../model");

/**
 * Decode helper function
 * This decode funcition has a flow of
 * 1. Slice the string as each KHQR tag and store into memory
 * 2. Check if the required field exist
 * 3. Check if the KHQR Code given is in order or not
 * 4. Get the value of each tag and if there is subtag repeat number 1
 * @param {string} KHQRString
 * @returns object of KHQR decode
 */
function decodeKHQRValidation(KHQRString) {
    const allField = KHQRTag.map((el) => el.tag);
    const subtag = KHQRTag.filter((el) => el.sub == true).map((obj) => obj.tag);
    let requiredField = KHQRTag.filter((el) => el.required == true).map(
        (el) => el.tag
    );
    const subTagInput = KHQRSubtag.input;
    const subTagCompare = KHQRSubtag.compare;

    let tags = [];
    let merchantType = "individual";
    let lastTag = "";

    while (KHQRString) {
        sliceTagObject = cutString(KHQRString);
        let { tag, value, slicedString } = sliceTagObject;

        if (tag == lastTag) break;

        const isMerchant = tag == "30";

        if (isMerchant) {
            merchantType = "merchant";
            tag = "29";
        }

        if (allField.includes(tag)) {
            tags.push({ tag: tag, value: value });
            // if (tag != "29" && tag != "30" && tag != "62") {
            //     const KHQRInstanceTest = KHQRTag.find(
            //         (el) => el.tag == tag
            //     ).instance;
            //     new KHQRInstanceTest(tag, value);
            // }
            requiredField = requiredField.filter((el) => el != tag);
        }

        KHQRString = slicedString;
        lastTag = tag;
    }

    const requiredFieldNotExist = requiredField.length != 0;
    if (requiredFieldNotExist) {
        const requiredTag = requiredField[0];
        const missingInstance = findTag(KHQRTag, requiredTag).instance;
        new missingInstance(requiredTag, null);
    }

    // const khqrInOrder = isInorder(
    //     tags.map((e) => parseInt(e.tag)).splice(-1, 1)
    // );

    // if (!khqrInOrder) throw KHQRResponse(null, errorCode.TAG_NOT_IN_ORDER);

    let decodeValue = {
        merchantType: merchantType,
    };

    subTagInput
        .map((el) => el.data)
        .forEach((obj) => (decodeValue = { ...decodeValue, ...obj }));
    tags.forEach((khqrTag) => {
        const tag = khqrTag.tag;
        const khqr = KHQRTag.find((el) => el.tag == tag);
        let value = khqrTag.value;
        let inputValue = value;
        if (subtag.includes(tag)) {
            const inputdata = cloneObject(findTag(subTagInput, tag).data);
            while (value) {
                cutsubstring = cutString(value);
                const subtag = cutsubstring.tag;
                const subtagValue = cutsubstring.value;
                const slicedsubtag = cutsubstring.slicedString;

                let nameSubtag = subTagCompare
                    .filter((el) => el.tag == tag)
                    .find((el) => el.subTag == subtag);

                if (nameSubtag != undefined) {
                    nameSubtag = nameSubtag.name;
                    inputdata[nameSubtag] = subtagValue;
                    inputValue = inputdata;
                }
                value = slicedsubtag;
            }
            decodeValue = { ...decodeValue, ...inputValue };
            const add = new khqr.instance(tag, inputValue);
        } else {
            const instance = new khqr.instance(tag, inputValue);
            decodeValue[khqr.type] = instance.value;
        }
    });

    return decodeValue;
}

/**
 * Helper function for decode
 * It query from the object where tag is the same
 */
const findTag = (object, tag) => object.find((el) => el.tag == tag);

/**
 * Check if the array is in order algorithm
 */
const isInorder = (a) => a.slice(1).every((e, i) => e > a[i]);
const cloneObject = (obj) => JSON.parse(JSON.stringify(obj));

module.exports = decodeKHQRValidation;

},{"../constant":50,"../constant/KHQRSubtag":47,"../constant/KHQRTag":48,"../helper/cutString":57,"../model":60}],54:[function(require,module,exports){
const { emv, khqrData, errorCode } = require("../constant");
const crc16 = require("../helper/crc16");
const {
    PointOfInitiationMethod,
    PayloadFormatIndicator,
    GlobalUnqiueIdentifier,
    TransactionCurrency,
    CountryCode,
    MerchantCity,
    MerchantCategoryCode,
    TransactionAmount,
    MerchantName,
    TimeStamp,
    MerchantInformationLanguageTemplate,
    AdditionalData,
    UnionpayMerchantAccount,
} = require("../MerchantCode");
const { KHQRResponse } = require("../model");

/**
 * Generate KHQR helper Function
 * 1. create object of subtags elements
 * 2. create the string by passing tag and value to the instances
 * 3. calculate CRC
 * 4. return the value
 * @param {object} information 
 * @param {string} type 
 * @returns string of KHQR
 */
function generateKHQR(information, type) {
    // Getting information from information instance
    // If the merchant QR, there will be the merchantID and acquiring bank
    let merchantInfo = {
        bakongAccountID: information.bakongAccountID,
        isMerchant: false
    };

    if (type == "merchant")
        merchantInfo = {
            bakongAccountID: information.bakongAccountID,
            merchantID: information.merchantID,
            acquiringBank: information.acquiringBank,
            isMerchant: true
        };
    else
        merchantInfo = {
            bakongAccountID: information.bakongAccountID,
            accountInformation: information.accountInformation,
            acquiringBank: information.acquiringBank,
            isMerchant: false,
        };

    const additionalDataInformation = {
        billNumber: information.billNumber,
        mobileNumber: information.mobileNumber,
        storeLabel: information.storeLabel,
        terminalLabel: information.terminalLabel,
        purposeOfTransaction: information.purposeOfTransaction
    };

    const languageInformation = {
        languagePreference: information.languagePreference,
        merchantNameAlternateLanguage: information.merchantNameAlternateLanguage,
        merchantCityAlternateLanguage: information.merchantCityAlternateLanguage
    }
    
    try {
        const amount = information.amount

        // Creating each tag
        const payloadFormatIndicator = new PayloadFormatIndicator(
            emv.PAYLOAD_FORMAT_INDICATOR,
            emv.DEFAULT_PAYLOAD_FORMAT_INDICATOR
        );

        // Static QR is when QR Code has no amount tag
        // in this case the amount is 0
        let QRType = emv.DYNAMIC_QR;

        if (amount == undefined || amount == 0) QRType = emv.STATIC_QR
        const pointOfInitiationMethod = new PointOfInitiationMethod(
            emv.POINT_OF_INITIATION_METHOD,
            QRType
        );

        let upi;
        if (information.upiMerchantAccount)
            upi = new UnionpayMerchantAccount(emv.UNIONPAY_MERCHANT_ACCOUNT, information.upiMerchantAccount)

        // Setting tag for merchant account type
        let KHQRType = emv.MERCHANT_ACCOUNT_INFORMATION_INDIVIDUAL;
        if (type == "merchant")
            KHQRType = emv.MERCHANT_ACCOUNT_INFORMATION_MERCHANT;

        const globalUniqueIdentifier = new GlobalUnqiueIdentifier(
            KHQRType,
            merchantInfo
        );

        const merchantCategoryCode = new MerchantCategoryCode(
            emv.MERCHANT_CATEGORY_CODE,
            emv.DEFAULT_MERCHANT_CATEGORY_CODE
        );

        const currency = new TransactionCurrency(
            emv.TRANSACTION_CURRENCY,
            information.currency
        );

        if (information.currency == khqrData.currency.usd && upi) throw KHQRResponse(null, errorCode.UPI_ACCOUNT_INFORMATION_INVALID_CURRENCY);

        // Array of KHQR tags to loop and get the string of tags
        const KHQRInstances = [
            payloadFormatIndicator,
            pointOfInitiationMethod,
            upi || "",
            globalUniqueIdentifier,
            merchantCategoryCode,
            currency
        ];

        if (!(amount == undefined || amount == 0)) {
            let amountInput = information.amount;
            if (information.currency == khqrData.currency.khr) {
                if (amountInput % 1 == 0) amountInput = Math.round(amountInput)
                else throw KHQRResponse(null, errorCode.TRANSACTION_AMOUNT_INVALID);
            } else {
                const amountSplit = String(amountInput).split(".")
                const precision = amountSplit[1]
                if (precision != undefined && precision.length > 2)
                    throw KHQRResponse(null, errorCode.TRANSACTION_AMOUNT_INVALID);
                if (precision != undefined)
                    amountInput = parseFloat(amountInput).toFixed(2);
            }
            const amount = new TransactionAmount(
                emv.TRANSACTION_AMOUNT,
                amountInput
            );
            KHQRInstances.push(amount)
        }

        const countryCode = new CountryCode(
            emv.COUNTRY_CODE,
            emv.DEFAULT_COUNTRY_CODE
        );
        KHQRInstances.push(countryCode);

        const merchantName = new MerchantName(
            emv.MERCHANT_NAME,
            information.merchantName
        );
        KHQRInstances.push(merchantName);

        const merchantCity = new MerchantCity(
            emv.MERCHANT_CITY,
            information.merchantCity
        );
        KHQRInstances.push(merchantCity);

        // Additional data wont be added if there is undefined
        let additionalData;
        const isEmptyAdditionalData = Object.values(
            additionalDataInformation
        ).every((el) => el == null || el == undefined || el == "");

        if (!isEmptyAdditionalData) {
            additionalData = new AdditionalData(
                emv.ADDITIONAL_DATA_TAG,
                additionalDataInformation
            );
            KHQRInstances.push(additionalData);
        }

        const isEmptyLanguageTEmplate = Object.values(
            languageInformation
        ).every((el) => el == null || el == undefined || el == "");

        if (!isEmptyLanguageTEmplate) {
            const languageTemplate = new MerchantInformationLanguageTemplate(emv.MERCHANT_INFORMATION_LANGUAGE_TEMPLATE, languageInformation)
            KHQRInstances.push(languageTemplate);
        }


        const timeStamp = new TimeStamp(emv.TIMESTAMP_TAG);
        KHQRInstances.push(timeStamp);

        let khqrNoCrc = "";

        for (let i = 0; i < KHQRInstances.length; i++) {
            khqrNoCrc += KHQRInstances[i].toString();
        }

        khqr = khqrNoCrc + emv.CRC + emv.CRC_LENGTH;
        khqr += crc16(khqr);

        return khqr;
    } catch (error) {
        return error;
    }
}

module.exports = generateKHQR;

},{"../MerchantCode":36,"../constant":50,"../helper/crc16":56,"../model":60}],55:[function(require,module,exports){
const { KHQRResponse } = require("../model");
const { errorCode, emv } = require("../constant");
const axios = require("axios");

async function isAccountIDExist(url, accountID) {
    // Check account ID length
    if (accountID.length > emv.INVALID_LENGTH.BAKONG_ACCOUNT)
        throw KHQRResponse(null, errorCode.BAKONG_ACCOUNT_ID_LENGTH_INVALID);
        
    if (accountID.split("@").length != 2)
        throw KHQRResponse(null, errorCode.BAKONG_ACCOUNT_ID_INVALID);

    // fetch from URL
    try {
        let response = await axios.post(
            url,
            { accountId: accountID },
            {
                header: {
                    "Content-Type": "application/json",
                },
                timeout: 45 * 1000,
            }
        );

        const respData = response.data;

        // Getting Response
        const responseCode = respData.responseCode;
        const error = respData.errorCode;

        if (error == 11) return { bakongAccountExisted: false };
        if (error == 12)
            throw KHQRResponse(null, errorCode.BAKONG_ACCOUNT_ID_INVALID);

        // Return value
        if (responseCode == 0) return { bakongAccountExisted: true };
        else return { bakongAccountExisted: false };
    } catch (error) {
        if (error.code === 'ECONNABORTED')
            throw KHQRResponse(null, errorCode.CONNECTION_TIMEOUT);
        throw KHQRResponse(null, errorCode.CONNECTION_TIMEOUT);
    }
}

module.exports = isAccountIDExist;

},{"../constant":50,"../model":60,"axios":2}],56:[function(require,module,exports){
const Buffer = require("buffer").Buffer;

var crcTable = [
        0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50A5, 0x60C6, 0x70E7,
        0x8108, 0x9129, 0xA14A, 0xB16B, 0xC18C, 0xD1AD, 0xE1CE, 0xF1EF,
        0x1231, 0x0210, 0x3273, 0x2252, 0x52B5, 0x4294, 0x72F7, 0x62D6,
        0x9339, 0x8318, 0xB37B, 0xA35A, 0xD3BD, 0xC39C, 0xF3FF, 0xE3DE,
        0x2462, 0x3443, 0x0420, 0x1401, 0x64E6, 0x74C7, 0x44A4, 0x5485,
        0xA56A, 0xB54B, 0x8528, 0x9509, 0xE5EE, 0xF5CF, 0xC5AC, 0xD58D,
        0x3653, 0x2672, 0x1611, 0x0630, 0x76D7, 0x66F6, 0x5695, 0x46B4,
        0xB75B, 0xA77A, 0x9719, 0x8738, 0xF7DF, 0xE7FE, 0xD79D, 0xC7BC,
        0x48C4, 0x58E5, 0x6886, 0x78A7, 0x0840, 0x1861, 0x2802, 0x3823,
        0xC9CC, 0xD9ED, 0xE98E, 0xF9AF, 0x8948, 0x9969, 0xA90A, 0xB92B,
        0x5AF5, 0x4AD4, 0x7AB7, 0x6A96, 0x1A71, 0x0A50, 0x3A33, 0x2A12,
        0xDBFD, 0xCBDC, 0xFBBF, 0xEB9E, 0x9B79, 0x8B58, 0xBB3B, 0xAB1A,
        0x6CA6, 0x7C87, 0x4CE4, 0x5CC5, 0x2C22, 0x3C03, 0x0C60, 0x1C41,
        0xEDAE, 0xFD8F, 0xCDEC, 0xDDCD, 0xAD2A, 0xBD0B, 0x8D68, 0x9D49,
        0x7E97, 0x6EB6, 0x5ED5, 0x4EF4, 0x3E13, 0x2E32, 0x1E51, 0x0E70,
        0xFF9F, 0xEFBE, 0xDFDD, 0xCFFC, 0xBF1B, 0xAF3A, 0x9F59, 0x8F78,
        0x9188, 0x81A9, 0xB1CA, 0xA1EB, 0xD10C, 0xC12D, 0xF14E, 0xE16F,
        0x1080, 0x00A1, 0x30C2, 0x20E3, 0x5004, 0x4025, 0x7046, 0x6067,
        0x83B9, 0x9398, 0xA3FB, 0xB3DA, 0xC33D, 0xD31C, 0xE37F, 0xF35E,
        0x02B1, 0x1290, 0x22F3, 0x32D2, 0x4235, 0x5214, 0x6277, 0x7256,
        0xB5EA, 0xA5CB, 0x95A8, 0x8589, 0xF56E, 0xE54F, 0xD52C, 0xC50D,
        0x34E2, 0x24C3, 0x14A0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
        0xA7DB, 0xB7FA, 0x8799, 0x97B8, 0xE75F, 0xF77E, 0xC71D, 0xD73C,
        0x26D3, 0x36F2, 0x0691, 0x16B0, 0x6657, 0x7676, 0x4615, 0x5634,
        0xD94C, 0xC96D, 0xF90E, 0xE92F, 0x99C8, 0x89E9, 0xB98A, 0xA9AB,
        0x5844, 0x4865, 0x7806, 0x6827, 0x18C0, 0x08E1, 0x3882, 0x28A3,
        0xCB7D, 0xDB5C, 0xEB3F, 0xFB1E, 0x8BF9, 0x9BD8, 0xABBB, 0xBB9A,
        0x4A75, 0x5A54, 0x6A37, 0x7A16, 0x0AF1, 0x1AD0, 0x2AB3, 0x3A92,
        0xFD2E, 0xED0F, 0xDD6C, 0xCD4D, 0xBDAA, 0xAD8B, 0x9DE8, 0x8DC9,
        0x7C26, 0x6C07, 0x5C64, 0x4C45, 0x3CA2, 0x2C83, 0x1CE0, 0x0CC1,
        0xEF1F, 0xFF3E, 0xCF5D, 0xDF7C, 0xAF9B, 0xBFBA, 0x8FD9, 0x9FF8,
        0x6E17, 0x7E36, 0x4E55, 0x5E74, 0x2E93, 0x3EB2, 0x0ED1, 0x1EF0,
];


function crc16(s) {
    var crc = 0xFFFF;
    var j, i;
    s = Buffer.from(s);

    for (i = 0; i < s.length; i++) {
        c = s[i];
        j = (c ^ (crc >> 8)) & 0xFF;
        crc = crcTable[j] ^ (crc << 8);
    }

    const finalCheckSum = (crc ^ 0) & 0xFFFF;

    return getHexString(finalCheckSum);
}

function getHexString(crc) {
    let result = crc.toString(16).toUpperCase()
    const result_pad = pad(result, 4)
    return result_pad
}

function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;

}

module.exports = crc16

},{"buffer":69}],57:[function(require,module,exports){
module.exports = function cutString(string) {
    const sliceIndex = 2;

    // Get first 2
    const tag = string.slice(0, sliceIndex);
    const length = parseInt(string.slice(sliceIndex, sliceIndex * 2));
    const value = string.slice(sliceIndex * 2, sliceIndex * 2 + length);
    const slicedString = string.slice(sliceIndex * 2 + length);

    return {
        tag: tag,
        value: value,
        slicedString: slicedString,
    };
};

},{}],58:[function(require,module,exports){
const axios = require("axios");
const { errorCode } = require("../constant");
const { KHQRResponse } = require("../model");

class SourceInfo {
    constructor(appIconUrl, appName, appDeepLinkCallback) {
        this.appIconUrl = appIconUrl || null;
        this.appName = appName || null;
        this.appDeepLinkCallback = appDeepLinkCallback || null;
    }
}

function isValidLink(link) {
    try {
        let url = new URL(link);

        if (url.pathname != "/v1/generate_deeplink_by_qr") return false;
    } catch (error) {
        return false;
    }
    return true;
}

async function callDeepLinkAPI(url, data) {
    try {
        let response = await axios.post(url, data, {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 45 * 1000,
        });

        const respBody = response.data;

        // Getting Response
        const error = respBody.errorCode;

        if (response == undefined)
            throw KHQRResponse(null, errorCode.CONNECTION_TIMEOUT);

        if (error == 5)
            return KHQRResponse(null, errorCode.INVALID_DEEP_LINK_SOURCE_INFO);
        else if (error == 4)
            return KHQRResponse(null, errorCode.INTERNAL_SERVER_ERROR);
        return respBody;
    } catch (error) {
        if (error.code === 'ECONNABORTED')
            throw KHQRResponse(null, errorCode.CONNECTION_TIMEOUT);
        throw KHQRResponse(null, errorCode.CONNECTION_TIMEOUT);
    }
}

module.exports = { isValidLink, callDeepLinkAPI, SourceInfo };

},{"../constant":50,"../model":60,"axios":2}],59:[function(require,module,exports){
// Constant variable
const { khqrData, errorCode, emv } = require("./constant");

// Controller for decoding and encoding
const crc16 = require("./helper/crc16");
const CRCValidation = require("./CRCValidation");

// Controller for deeplink
const {
    isValidLink,
    callDeepLinkAPI,
    SourceInfo,
} = require("./helper/deeplink");

// Model
const { KHQRDeepLinkData, KHQRResponse } = require("./model");
const { IndividualInfo, MerchantInfo } = require("./model/information");
const generateKHQR = require("./controller/generateKHQR");
const decodeKHQRString = require("./controller/decodeKHQR");
const md5 = require("md5");
const decodeKHQRValidation = require("./controller/decodeValidation");

const isAccountIDExist = require("./helper/checkAccountID");

class BakongKHQR {
    /**
     * Generate Individual
     * Passing indivualInfo which is the instance of the IndividualInfo
     * Example: const indivualInfo = new IndividualInfo("devit@abaa",
        khqrData.currency.khr,
        "devit",
        "Battambang",
        optionalData)
     * @param {*} individualInfo 
     * @returns object of KHQR Response
     */
    generateIndividual(individualInfo) {
        const khqr = generateKHQR(
            individualInfo,
            khqrData.merchantType.individual
        );

        if (khqr.status != undefined) return khqr

        const result = {
            qr: khqr,
            md5: md5(khqr),
        };
        return KHQRResponse(result, null);
    }

    /**
     * Generate Individual
     * Passing indivualInfo which is the instance of the IndividualInfo
     * Example: const indivualInfo = new MerchantInfo("devit@abaa",
        khqrData.currency.usd,
        "devit",
        "Battambang",
        optionalData)
     * @param {*} individualInfo 
     * @returns String of KHQR
     */
    generateMerchant(merchantInfo) {
        const khqr = generateKHQR(merchantInfo, khqrData.merchantType.merchant);

        if (khqr.status != undefined) return khqr;

        const result = {
            qr: khqr,
            md5: md5(khqr),
        };
        return KHQRResponse(result, null);
    }

    /**
     * Decode function
     * It is a static function
     * so you can use it as const decodeResult = BakongKHQR.decode(KHQRString)
     * @param {String} KHQRString
     * @returns object of KHQR Response
     */
    static decode(KHQRString) {
        const decodedData = decodeKHQRString(KHQRString);

        return KHQRResponse(decodedData, null);
        // try {
        //     const isValidKHQR = this.verify(KHQRString).isValid;
        //     if (!isValidKHQR || KHQRString.length < emv.INVALID_LENGTH.KHQR)
        //         throw KHQRResponse(null, errorCode.KHQR_INVALID);

        //     const decodedData = decodeKHQRString(KHQRString);

        //     return KHQRResponse(decodedData, null);
        // } catch (error) {
        //     return error;
        // }
    }

    /**
     * Verify KHQR
     * This function is a static function
     * it can be used as const isVerifiedKHQR = BakongKHQR.verify(KHQRString)
     * @param {String} KHQRString 
     * @returns Verification object
     */
    static verify(KHQRString) {
        const isCorrectFormCRC = checkCRCRegExp(KHQRString);
        if (!isCorrectFormCRC) return new CRCValidation(false)

        const crc = KHQRString.slice(-4);
        const KHQRNoCrc = KHQRString.slice(0, -4);
        const validCRC = crc16(KHQRNoCrc) == crc.toUpperCase();
        const isValidCRC = new CRCValidation(validCRC);
        try {
            if (!isValidCRC.isValid || KHQRString.length < emv.INVALID_LENGTH.KHQR)
                throw KHQRResponse(null, errorCode.KHQR_INVALID);

            decodeKHQRValidation(KHQRString);

            return new CRCValidation(true);
        } catch (error) {
            return new CRCValidation(false);
        }
    }

    /**
     * Generate Deep Link
     * @param {String} url 
     * @param {String} qr 
     * @param {SourceInfo} sourceInfo (optional)
     * @returns 
     */
    static async generateDeepLink(url, qr, sourceInfo) {
        // check invalid url
        const validURL = isValidLink(url);
        if (!validURL)
            return KHQRResponse(null, errorCode.INVALID_DEEP_LINK_URL);

        // check qr is valid (CRC)
        const isValidKHQR = this.verify(qr);

        if (!isValidKHQR.isValid)
            return KHQRResponse(null, errorCode.KHQR_INVALID);

        // check data source field
        if (sourceInfo) {
            if (
                !sourceInfo.appIconUrl ||
                !sourceInfo.appName ||
                !sourceInfo.appDeepLinkCallback
            )
                return KHQRResponse(
                    null,
                    errorCode.INVALID_DEEP_LINK_SOURCE_INFO
                );
        }

        // call API to generate deeplink
        try {
            const data = await callDeepLinkAPI(url, { qr: qr });

            const deepLinkData = new KHQRDeepLinkData(data.data.shortLink);

            return KHQRResponse(deepLinkData.getData(), null);
        } catch (error) {
            return error;
        }
    }

    /**
     * Check Bakong Account wether it is exist or not
     * @param {*} url 
     * @param {*} bakongID 
     * @returns 
     */
    static async checkBakongAccount(url, bakongID) {
        try {
            const accountExistResponse = await isAccountIDExist(url, bakongID)
            return KHQRResponse(accountExistResponse, null);
        } catch (error) {
            return error
        }
    }
}

function checkCRCRegExp(crc) {
    const crcRegExp = /6304[A-Fa-f0-9]{4}$/
    return crcRegExp.test(crc)
}

module.exports = {
    BakongKHQR,
    khqrData,
    SourceInfo,
    IndividualInfo,
    MerchantInfo,
};

},{"./CRCValidation":31,"./constant":50,"./controller/decodeKHQR":52,"./controller/decodeValidation":53,"./controller/generateKHQR":54,"./helper/checkAccountID":55,"./helper/crc16":56,"./helper/deeplink":58,"./model":60,"./model/information":61,"md5":67}],60:[function(require,module,exports){
const response = require("./response")

module.exports = response;

},{"./response":62}],61:[function(require,module,exports){
const { khqrData } = require("../constant");

const removeEmptyElement = (obj) => {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .filter(([_, v]) => v != undefined)
            .filter(([_, v]) => v != "")
    );
};

class IndividualInfo {
    /**
     * Individual information
     * fill the params down below
     * @param {*} bakongAccountID
     * @param {*} merchantName
     * @param {*} merchantCity
     * @param {*} optional
     */
    constructor(bakongAccountID, merchantName, merchantCity, optional = {}) {
        optional = removeEmptyElement(optional);
        if (
            this.isObject(bakongAccountID) ||
            this.isObject(merchantName) ||
            this.isObject(merchantCity)
        ) {
            throw "bakongAccountID, merchantName or merchantCity must be a string";
        }
        this.bakongAccountID = bakongAccountID;
        this.accountInformation = optional.accountInformation;
        this.acquiringBank = optional.acquiringBank;
        this.currency =
            optional.currency == undefined
                ? khqrData.currency.khr
                : optional.currency;
        this.amount = optional.amount;
        this.merchantName = merchantName;
        this.merchantCity = merchantCity;
        this.billNumber = optional.billNumber;
        this.storeLabel = optional.storeLabel;
        this.terminalLabel = optional.terminalLabel;
        this.mobileNumber = optional.mobileNumber;
        this.purposeOfTransaction = optional.purposeOfTransaction;
        this.languagePreference = optional.languagePreference;
        this.merchantNameAlternateLanguage = optional.merchantNameAlternateLanguage;
        this.merchantCityAlternateLanguage = optional.merchantCityAlternateLanguage;
        this.upiMerchantAccount = optional.upiMerchantAccount
    }

    isObject(val) {
        return val instanceof Object;
    }
}

class MerchantInfo extends IndividualInfo {
    /**
     * Merchant information
     * Fill the params down below
     * @param {*} bakongAccountID
     * @param {*} merchantName
     * @param {*} merchantCity
     * @param {*} merchantID
     * @param {*} acquiringBank
     * @param {*} optional
     */
    constructor(
        bakongAccountID,
        merchantName,
        merchantCity,
        merchantID,
        acquiringBank,
        optional = {}
    ) {
        optional = removeEmptyElement(optional);
        super(bakongAccountID, merchantName, merchantCity, optional);
        if (
            this.isObject(merchantID) ||
            this.isObject(acquiringBank)
        ) {
            throw "merchantID and acquiringBank must be a string";
        }
        this.amount = optional.amount;
        this.merchantID = merchantID;
        this.acquiringBank = acquiringBank;
    }
    isObject(val) {
        return val instanceof Object;
    }
}

module.exports = { IndividualInfo, MerchantInfo };

},{"../constant":50}],62:[function(require,module,exports){
const md5 = require("md5");

class KHQRData {
    constructor(qr) {
        this.qr = qr;
        this.md5 = md5(qr);
    }

    getData() {
        return {
            qr: this.qr,
            md5: this.md5,
        };
    }
}

class KHQRDeepLinkData {
    constructor(shortLink) {
        this.shortLink = shortLink;
    }

    getData() {
        return {
            shortLink: this.shortLink,
        };
    }
}

/**
 * A function for returning the KHQR response
 * the response has format
 * { status: { code: 0, errorCode: 0, message: '' },
 *   data: null }
 * How to use:
 * when error pass KHQRResponse(null, errorObject)
 * when success pass KHQRResponse(data, null)
 * @param {any} data
 * @param {any} errorObject
 * @returns
 */
function KHQRResponse(data, errorObject) {
    const isError = errorObject == null;
    const status = {
        code: !isError ? 1 : 0,
        errorCode: isError ? null : errorObject.code,
        message: isError ? null : errorObject.message,
    };
    return {
        status: status,
        data: data,
    };
}

module.exports = { KHQRData, KHQRDeepLinkData, KHQRResponse };

},{"md5":67}],63:[function(require,module,exports){
class TagLengthString {
    constructor(tag, value) {
        this.tag = tag
        this.value = value

        const length =  String(value).length;
        this.length = length < 10 ? `0${length}` : String(length);
    }

    toString() {
        return `${this.tag}${this.length}${this.value}`
    }
}

module.exports = TagLengthString

},{}],64:[function(require,module,exports){
var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

module.exports = charenc;

},{}],65:[function(require,module,exports){
(function() {
  var base64map
      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  crypt = {
    // Bit-wise rotation left
    rotl: function(n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotation right
    rotr: function(n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = crypt.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function(n) {
      for (var bytes = []; n > 0; n--)
        bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
        words[b >>> 5] |= bytes[i] << (24 - b % 32);
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        for (var j = 0; j < 4; j++)
          if (i * 8 + j * 6 <= bytes.length * 8)
            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
          else
            base64.push('=');
      }
      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
          imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
      }
      return bytes;
    }
  };

  module.exports = crypt;
})();

},{}],66:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],67:[function(require,module,exports){
(function(){
  var crypt = require('crypt'),
      utf8 = require('charenc').utf8,
      isBuffer = require('is-buffer'),
      bin = require('charenc').bin,

  // The core
  md5 = function (message, options) {
    // Convert to byte array
    if (message.constructor == String)
      if (options && options.encoding === 'binary')
        message = bin.stringToBytes(message);
      else
        message = utf8.stringToBytes(message);
    else if (isBuffer(message))
      message = Array.prototype.slice.call(message, 0);
    else if (!Array.isArray(message) && message.constructor !== Uint8Array)
      message = message.toString();
    // else, assume byte array already

    var m = crypt.bytesToWords(message),
        l = message.length * 8,
        a =  1732584193,
        b = -271733879,
        c = -1732584194,
        d =  271733878;

    // Swap endian
    for (var i = 0; i < m.length; i++) {
      m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
             ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
    }

    // Padding
    m[l >>> 5] |= 0x80 << (l % 32);
    m[(((l + 64) >>> 9) << 4) + 14] = l;

    // Method shortcuts
    var FF = md5._ff,
        GG = md5._gg,
        HH = md5._hh,
        II = md5._ii;

    for (var i = 0; i < m.length; i += 16) {

      var aa = a,
          bb = b,
          cc = c,
          dd = d;

      a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
      d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
      c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
      b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
      a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
      d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
      c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
      b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
      a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
      d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
      c = FF(c, d, a, b, m[i+10], 17, -42063);
      b = FF(b, c, d, a, m[i+11], 22, -1990404162);
      a = FF(a, b, c, d, m[i+12],  7,  1804603682);
      d = FF(d, a, b, c, m[i+13], 12, -40341101);
      c = FF(c, d, a, b, m[i+14], 17, -1502002290);
      b = FF(b, c, d, a, m[i+15], 22,  1236535329);

      a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
      d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
      c = GG(c, d, a, b, m[i+11], 14,  643717713);
      b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
      a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
      d = GG(d, a, b, c, m[i+10],  9,  38016083);
      c = GG(c, d, a, b, m[i+15], 14, -660478335);
      b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
      a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
      d = GG(d, a, b, c, m[i+14],  9, -1019803690);
      c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
      b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
      a = GG(a, b, c, d, m[i+13],  5, -1444681467);
      d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
      c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
      b = GG(b, c, d, a, m[i+12], 20, -1926607734);

      a = HH(a, b, c, d, m[i+ 5],  4, -378558);
      d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
      c = HH(c, d, a, b, m[i+11], 16,  1839030562);
      b = HH(b, c, d, a, m[i+14], 23, -35309556);
      a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
      d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
      c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
      b = HH(b, c, d, a, m[i+10], 23, -1094730640);
      a = HH(a, b, c, d, m[i+13],  4,  681279174);
      d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
      c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
      b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
      a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
      d = HH(d, a, b, c, m[i+12], 11, -421815835);
      c = HH(c, d, a, b, m[i+15], 16,  530742520);
      b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

      a = II(a, b, c, d, m[i+ 0],  6, -198630844);
      d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
      c = II(c, d, a, b, m[i+14], 15, -1416354905);
      b = II(b, c, d, a, m[i+ 5], 21, -57434055);
      a = II(a, b, c, d, m[i+12],  6,  1700485571);
      d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
      c = II(c, d, a, b, m[i+10], 15, -1051523);
      b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
      a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
      d = II(d, a, b, c, m[i+15], 10, -30611744);
      c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
      b = II(b, c, d, a, m[i+13], 21,  1309151649);
      a = II(a, b, c, d, m[i+ 4],  6, -145523070);
      d = II(d, a, b, c, m[i+11], 10, -1120210379);
      c = II(c, d, a, b, m[i+ 2], 15,  718787259);
      b = II(b, c, d, a, m[i+ 9], 21, -343485551);

      a = (a + aa) >>> 0;
      b = (b + bb) >>> 0;
      c = (c + cc) >>> 0;
      d = (d + dd) >>> 0;
    }

    return crypt.endian([a, b, c, d]);
  };

  // Auxiliary functions
  md5._ff  = function (a, b, c, d, x, s, t) {
    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._gg  = function (a, b, c, d, x, s, t) {
    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._hh  = function (a, b, c, d, x, s, t) {
    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._ii  = function (a, b, c, d, x, s, t) {
    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };

  // Package private blocksize
  md5._blocksize = 16;
  md5._digestsize = 16;

  module.exports = function (message, options) {
    if (message === undefined || message === null)
      throw new Error('Illegal argument ' + message);

    var digestbytes = crypt.wordsToBytes(md5(message, options));
    return options && options.asBytes ? digestbytes :
        options && options.asString ? bin.bytesToString(digestbytes) :
        crypt.bytesToHex(digestbytes);
  };

})();

},{"charenc":64,"crypt":65,"is-buffer":66}],68:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],69:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":68,"buffer":69,"ieee754":70}],70:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],71:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
