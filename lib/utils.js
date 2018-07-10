const constants = require('./constants');

let autoIncrement = 0;

// 获取自增数, digits指定位数, 每个时间单位内允许有Math.pow(10, digits) - 1个并发不会有重复
function getAndIncrement(digits = 7) {
  // 总是返回指定位数, 位数不足时, 前面补零
  let r = (new Array(digits).fill(0).join('') + autoIncrement).slice(-1 * digits);
  if (autoIncrement == (Math.pow(10, digits) - 1)) {
    autoIncrement = 0;
  } else {
    autoIncrement++;
  }
  return r;
}

function getGCD(a, b) {
  if (b === 0) {
    return a;
  }
  return getGCD(b, a % b);
}


// 获取一组任务的唯一id
// 每进程每秒10亿个并发id不重复
module.exports.genId = function () {
  return new Date().getTime() + getAndIncrement();
}

// 超时拒绝
module.exports.delayPromise = function (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(constants.TIMEOUT_FLAG);
    }, ms);
  });
}

module.exports.getGCD = getGCD;