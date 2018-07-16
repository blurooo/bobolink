
const defaultConcurrency = 5;

const defaultTimeout = 15000;

const defaultRetry = 0;

function reviseValue(value, type, condition, defaultValue) {
  if (typeof value === type && condition) {
    return value;
  }
  return defaultValue;
}

function Options(options) {

  let self = this;

  this.concurrency = defaultConcurrency;
  this.timeout = defaultTimeout;
  this.retry = defaultRetry;
  this.scheduling = {
    enable: 'immediately',
    frequency: {
      countPerSecond: 100
    },
    immediately: true
  };
  this.retryPrior = false;
  this.newPrior = false;
  this.catch = null;
  this.max = -1;
  this.isInit = false;

  function init(newOptions) {
    if (!self.isInit) {
      self.isInit = true;
      if (newOptions && newOptions.scheduling && newOptions.scheduling.enable) {
        let schedulingMode = newOptions.scheduling.enable;
        // if schedulingMode is supported
        if (self.scheduling[schedulingMode] !== undefined) {
          self.scheduling.enable = newOptions.scheduling.enable;
          let newModeConfig = newOptions.scheduling[schedulingMode];
          let oldModeConfig = self.scheduling[schedulingMode];
          if (newModeConfig) {
            for (let c in newModeConfig) {
              if (oldModeConfig.hasOwnProperty(c) && typeof oldModeConfig[c] === typeof newModeConfig[c]) {
                oldModeConfig[c] = newModeConfig[c];
              }
            }
          }
        }
      }
    }
  }

  this.update = function (newOptions) {
    init(newOptions);
    if (newOptions) {
      let allowOptions = {};
      newOptions.concurrency !== undefined && (allowOptions.concurrency = reviseValue(newOptions.concurrency, 'number', newOptions.concurrency > 0, defaultConcurrency));
      newOptions.timeout !== undefined && (allowOptions.timeout = reviseValue(newOptions.timeout, 'number', newOptions.timeout >= 0, defaultTimeout));
      newOptions.retry !== undefined && (allowOptions.retry = reviseValue(newOptions.retry, 'number', newOptions.retry >= 0, defaultRetry));
      newOptions.retryPrior !== undefined && (allowOptions.retryPrior = reviseValue(newOptions.retryPrior, 'boolean', newOptions.retryPrior === true, false));
      newOptions.newPrior !== undefined && (allowOptions.newPrior = reviseValue(newOptions.newPrior, 'boolean', newOptions.newPrior === true, false));
      newOptions.catch !== undefined && (allowOptions.catch = reviseValue(newOptions.catch, 'function', true, null));
      newOptions.max !== undefined && (allowOptions.max = reviseValue(newOptions.max, 'number', newOptions.max > 0 || newOptions.max === -1, -1));
      Object.assign(self, allowOptions);
    }
  }

  this.update(options);
}

module.exports = Options;