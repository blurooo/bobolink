const constants = require('./constants');

let autoIncrement = 0;

let pid;

try {
  pid = process.pid;
} catch (_) {
  pid = '';
}

function getAndIncrement(digits = 7) {
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


module.exports.genId = function () {
  return new Date().getTime() + pid + getAndIncrement();
}

module.exports.delayPromise = function (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(constants.TIMEOUT_FLAG);
    }, ms);
  });
}

module.exports.getGCD = getGCD;