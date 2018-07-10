// 默认的队列并发数
const defaultConcurrency = 5;

// 默认超时时间
const defaultTimeout = 15000;

// 默认重试次数
const defaultRetry = 0;


// 用于修正不正确的值
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
    // 启用的模式, 默认为immediately, 任务将会立即执行, 可选frequency, 任务可按设定频率调度
    enable: 'immediately',
    // 频率限定模式一些配置参数
    frequency: {
      // 每秒执行的任务个数
      countPerSecond: 100
    },
    immediately: true
  };
  this.retryPrior = false;
  this.newPrior = false;
  this.catch = null;
  this.isInit = false;

  this.update = function (newOptions) {
    // 修正不正确的参数设置
    if (newOptions) {
      // 允许配置的选项
      let allowOptions = {};

      // 调度策略相关的配置不支持后续修改
      if (!self.isInit) {
        if (newOptions.scheduling && newOptions.scheduling.enable) {
          let schedulingMode = newOptions.scheduling.enable;
          // 调度模式如果被支持
          if (self.scheduling[schedulingMode] !== undefined) {
            self.scheduling.enable = newOptions.scheduling.enable;
            let newModeConfig = newOptions.scheduling[schedulingMode];
            let oldModeConfig = self.scheduling[schedulingMode];
            if (newModeConfig) {
              for (let c in newModeConfig) {
                // 仅调度参数被支持, 并且类型相同时才允许设置
                if (oldModeConfig.hasOwnProperty(c) && typeof oldModeConfig[c] === typeof newModeConfig[c]) {
                  oldModeConfig[c] = newModeConfig[c];
                }
              }
            }
          }
        }
      }

      newOptions.concurrency !== undefined && (allowOptions.concurrency = reviseValue(newOptions.concurrency, 'number', newOptions.concurrency > 0, defaultConcurrency));
      newOptions.timeout !== undefined && (allowOptions.timeout = reviseValue(newOptions.timeout, 'number', newOptions.timeout >= 0, defaultTimeout));
      newOptions.retry !== undefined && (allowOptions.retry = reviseValue(newOptions.retry, 'number', newOptions.retry >= 0, defaultRetry));
      newOptions.retryPrior !== undefined && (allowOptions.retryPrior = reviseValue(newOptions.retryPrior, 'boolean', newOptions.retryPrior === true, false));
      newOptions.newPrior !== undefined && (allowOptions.newPrior = reviseValue(newOptions.newPrior, 'boolean', newOptions.newPrior === true, false));
      newOptions.catch !== undefined && (allowOptions.catch = reviseValue(newOptions.catch, 'function', true, null));

      // 可配置选项
      Object.assign(self, allowOptions);
    }
    self.isInit = true;
  }

  this.update(options);
}

module.exports = Options;