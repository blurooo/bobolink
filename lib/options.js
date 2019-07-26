const utils = require('./utils');
const constants = require('./constants');
/**
 * @typedef  {Object}   options                     - 配置项
 * @property {number}   [concurrency=5]             - 任务的并发数量，默认为5
 * @property {number}   [timeout=15000]             - 任务的超时时间（ms），默认为15000，设置为0则不超时
 * @property {number}   [retry=0]                   - 任务失败时的重试次数，默认为0
 * @property {boolean}  [retryPrior=false]          - 是否优先处理重试任务，默认为false，如果设置为true，则失败重试的任务会被放置到队列头部
 * @property {boolean}  [newPrior=false]            - 是否优先处理新任务，默认为false，如果设置为true，则新加入的任务会被放置到队列头部
 * @property {function} [catch=]                    - 任务失败时的抓取函数，默认为null，任务多次失败重试会回调多次catch
 * @property {number}   [max=65536]                 - 任务队列的上限，-1为没有上限，默认为65536
 * @property {string}   [scheduleMode=immediately]  - 任务调度模式。
 * - frequency（按频率调度，每秒）
 * - immediately（立即调度，任务提交立即执行）
 * @property {number}   [countPerTimeScale=100]     - 当调度模式为frequency时，可通过此参数指定每个时间刻度调度的任务数，默认为100。真实的并发数不会超过concurrency。
 * - 设置为-1则每次都调度队列中的所有任务
 * @property {number}   [timeScale=1]               - 时间刻度（s），默认为1s
 * @property {string}   [taskMode=]                 - 指明任务模式。
 * - 可选值为data（put数据）和function（put函数）。
 * - 没有设置时将根据第一个任务的类型自行推断。
 * @property {function} [handler=]                  - 当任务模式为data时，每次执行任务将回调handler，并传入当次任务对应的data。
 * - 要求返回一个Promise。
 * @property {string}   [saturationPolicy=abort]    - 队列饱和时提交任务的策略，默认为abort。
 * - abort（终止并抛出异常）
 * - discardOldest（剔除最早的任务以腾出空间执行新任务）。
 * 
 */

/**
 * 
 * 关于选项的描述
 * 
 * 用于设值时的校验
 * 
 */
const optionsSchema = {};

optionsSchema.concurrency = {
  type: 'number',
  condition: v => v > 0,
  default: 5
};

optionsSchema.timeout = {
  type: 'number',
  condition: v => v >= 0,
  default: 15000
};

optionsSchema.retry = {
  type: 'number',
  condition: v => v >= 0,
  default: 0
}

optionsSchema.retryPrior = {
  type: 'boolean',
  default: false
}

optionsSchema.newPrior = {
  type: 'boolean',
  default: false,
  update: false
}

optionsSchema.catch = {
  type: 'function',
  default: null
}

optionsSchema.max = {
  type: 'number',
  condition: v => v > 0,
  default: 2 << 15
}

optionsSchema.scheduleMode = {
  type: 'string',
  condition: v => v === constants.SCHEDULE_MODE_FREQUENCY || v === constants.SCHEDULE_MODE_IMMEDIATELY,
  default: constants.SCHEDULE_MODE_IMMEDIATELY,
  final: true
}

optionsSchema.countPerTimeScale = {
  type: 'number',
  condition: v => {
    return v >= 1 || v === -1;
  },
  translate: v => ~~v,
  default: 100,
  fianl: true
}

optionsSchema.timeScale = {
  type: 'number',
  condition: v => v >= 1,
  translate: v => ~~v,
  default: 1
}

optionsSchema.taskMode = {
  type: 'string',
  condition: v => v === constants.TASK_MODE_DATA || v === constants.TASK_MODE_FUNCTION,
  default: undefined
}

optionsSchema.handler = {
  type: 'function',
  default: () => Promise.resolve()
}

optionsSchema.saturationPolicy = {
  type: 'string',
  condition: v => v === constants.SATURATION_POLICY_ABORT || v === constants.SATURATION_POLICY_DISCARD_OLDEST,
  default: constants.SATURATION_POLICY_ABORT
}

/**
 * @param {options} options 
 * 
 * @returns {options}
 */
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

  /**
   * 更新配置
   * @param {options} newOptions 
   */
  function update (newOptions) {
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

  /**
   * @function
   */
  this.update = update;

}

module.exports = Options;