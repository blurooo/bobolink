const constants = {
    TIMEOUT_FLAG: 'bobolink_timeout',
    // 只用于内部状态判断，表明需要重试
    RETRY_FLAG: 'bobolink_retry',
    UNKNOWN_ERR: 'bobolink_unknown_error',
    EXCEEDED: 'bobolink_exceeded_maximum_task_number',
    INVALID: 'bobolink_invalid',
    UNSUPPORTED: 'bobolink_unsupported',
    // 按频率调度模式
    SCHEDULE_MODE_FREQUENCY: 'frequency',
    // 立即调度模式
    SCHEDULE_MODE_IMMEDIATELY: 'immediately',
    // 饱和策略：终止
    SATURATION_POLICY_ABORT: 'abort',
    // 饱和策略：移除最早任务
    SATURATION_POLICY_DISCARD_OLDEST: 'discardOldest',
    // 任务模型，表明put进来的数据
    TASK_MODE_DATA: 'data',
    // 任务模型，表明put进来的是函数
    TASK_MODE_FUNCTION: 'function',
    TASK_ERROR: 'bobolink_unsupported_task_type',
    // 任务被移除
    DISCARD: 'bobolink_discard',
    EMPTY_ELEMENTS: 'bobolink_empty_elements'
};


module.exports = constants;