const constants = require('./constants');

let autoIncrement = 0;

let pid;

let instance = {};

try {
  pid = process.pid;
} catch (_) {
  pid = '';
}

function getAndIncrement (digits = 8) {
  let r = (new Array(digits).fill(0).join('') + autoIncrement).slice(-1 * digits);
  if (autoIncrement == (Math.pow(10, digits) - 1)) {
    autoIncrement = 0;
  } else {
    autoIncrement++;
  }
  return r;
}

// 提取最大公约数
instance.getGCD = function(a, b) {
  if (b === 0) {
    return a;
  }
  return instance.getGCD(b, a % b);
}


// 生成唯一id
instance.genId = function (digits) {
  return Date.now() + pid + getAndIncrement(digits);
}

// 一定时间后失败
instance.delayPromise = function (ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(constants.TIMEOUT_FLAG);
    }, ms);
  });
}

// 获取值或在检测不成立时返回默认值
instance.getOrDefault = function (value, type, condition, defaultValue) {
  if (typeof value === type && condition) {
    return value;
  }
  return defaultValue;
}

module.exports = instance;