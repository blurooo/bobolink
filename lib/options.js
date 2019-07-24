const utils = require('./utils');
const constants = require('./constants');

/**
 * 
 * 关于选项的描述
 * 
 * 用于设值时的校验
 * 
 */
const optionsSchema = {};

/**
 * 
 * 任务的并发数量
 * 
 */
optionsSchema.concurrency = {
  type: 'number',
  condition: v => v > 0,
  default: 5
};

/**
 * 
 * 任务的超时时间，设置为0则不超时
 * 
 */
optionsSchema.timeout = {
  type: 'number',
  condition: v => v >= 0,
  default: 15000
};

/**
 * 
 * 任务失败时的重试次数
 * 
 */
optionsSchema.retry = {
  type: 'number',
  condition: v => v >= 0,
  default: 0
}

/**
 * 
 * 是否优先处理重试任务，如果设置为true，则失败重试的任务会被放置到队列头部
 * 
 */
optionsSchema.retryPrior = {
  type: 'boolean',
  default: false
}

/**
 * 
 * 是否优先处理新任务，如果设置为true，则新加入的任务会被放置到队列头部
 * 
 */
optionsSchema.newPrior = {
  type: 'boolean',
  default: false,
  update: false
}

/**
 * 
 * 任务失败时的抓取函数，任务多次失败重试会回调多次catch
 * 
 */
optionsSchema.catch = {
  type: 'function',
  default: null
}

/**
 * 
 * 任务队列的上限，-1为没有上限，默认为65535
 * 
 */
optionsSchema.max = {
  type: 'number',
  condition: v => v > 0,
  default: 2 << 15
}

/**
 * 
 * 任务调度模式
 * 
 * constants.SCHEDULE_MODE_FREQUENCY：按频率调度（每秒）
 * constants.SCHEDULE_MODE_IMMEDIATELY：立即调度，即任务提交时立即执行（并发队列可用时）
 * 
 * 此配置一旦确定就不可变更
 * 
 */
optionsSchema.scheduleMode = {
  type: 'string',
  condition: v => v === constants.SCHEDULE_MODE_FREQUENCY || v === constants.SCHEDULE_MODE_IMMEDIATELY,
  default: constants.SCHEDULE_MODE_IMMEDIATELY,
  final: true
}

/**
 * 
 * 任务调度模式为：constants.SCHEDULE_MODE_FREQUENCY时选项有效
 * 
 * 设置每秒调度的任务数
 * 
 */
optionsSchema.countPerSecond = {
  type: 'number',
  condition: v => v >= 1,
  translate: v => ~~v,
  default: 100
}

/**
 * 
 * 任务模式
 * 
 * constants.TASK_MODE_DATA：数据模式，也即put进来的是数据，每次任务执行的是handler函数，传入该次任务对应的数据
 * constants.TASK_MODE_FUNCTION：函数模式，也即put进来的是函数，每次任务直接执行该函数
 * 
 */
optionsSchema.taskMode = {
  type: 'string',
  condition: v => v === constants.TASK_MODE_DATA || v === constants.TASK_MODE_FUNCTION,
  default: undefined
}

/**
 * 
 * 当任务模式为constants.TASK_MODE_DATA时，每次任务都会调用handler。
 * 
 */
optionsSchema.handler = {
  type: 'function',
  default: data => {
    console.log('do it', data);
  }
}

/**
 * 队列任务饱和策略
 * 
 * constants.SATURATION_POLICY_ABORT：终止，将在任务提交时直接抛出异常，异常信息为：constants.EXCEEDED
 * constants.SATURATION_POLICY_DISCARD_OLDEST：抛弃最早任务，将在任务提交时把最早的任务剔除，以腾出位置用于执行新任务
 * 
 *  */
optionsSchema.saturationPolicy = {
  type: 'string',
  condition: v => v === constants.SATURATION_POLICY_ABORT || v === constants.SATURATION_POLICY_DISCARD_OLDEST,
  default: constants.SATURATION_POLICY_ABORT
}

function Options(options) {

  let self = this;

  // 初始化选项
  for (let option in optionsSchema) {
    let optionSchema = optionsSchema[option];
    let optionValue = options && options[option];
    let condition = optionSchema.condition ? optionSchema.condition(optionValue) : true;
    let curOptionValue = utils.getOrDefault(optionValue, optionSchema.type, condition, optionSchema.default);
    self[option] = optionSchema.translate ? optionSchema.translate(curOptionValue) : curOptionValue;
  }

  this.update = function (newOptions) {
    if (newOptions) {
      let allowOptions = {};
      for (let option in newOptions) {
        if (optionsSchema[option] && !optionsSchema[option].final && newOptions[option] !== undefined) {
          let optionSchema = optionsSchema[option];
          let condition = optionSchema.condition ? optionSchema.condition(newOptions[option]) : true;
          let curOptionValue = utils.getOrDefault(newOptions[option], optionSchema.type, condition, optionSchema.default);
          allowOptions[option] = optionSchema.translate ? optionSchema.translate(curOptionValue) : curOptionValue;
        }
      }
      Object.assign(self, allowOptions);
    }
  }

}

// 编码提示
Options.prototype.concurrency = null;
Options.prototype.timeout = null;
Options.prototype.retry = null;
Options.prototype.retryPrior = null;
Options.prototype.newPrior = null;
Options.prototype.catch = null;
Options.prototype.max = null;
Options.prototype.scheduleMode = null;
Options.prototype.countPerSecond = null;
Options.prototype.saturationPolicy = null;
Options.prototype.taskMode = null;
Options.prototype.handler = null;

module.exports = Options;