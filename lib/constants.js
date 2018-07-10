// 超时识别的标志
module.exports.TIMEOUT_FLAG = 'partaker_timeout';

// 重试标识
module.exports.RETRY_FLAG = 'partaker_retry';

// 未知错误, 有些走进catch的错误可能是空的, 赋予它一个定值, 而非维持空,
// 有助于在put.then中, 可以总是认为err === undefined即为任务成功。
// err可能为null、false、0等false值, 天知道一个Promise会reject出什么东西, 所以不要认为err为false值即成功,
// 而应该是严格的err === undefined才成功。
module.exports.UNKNOWN_ERR = 'partaker_unknown_error';
