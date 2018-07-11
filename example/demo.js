const Bobolink = require('./../lib/bobolink');

function testImmediatelyMode() {
  let bl = new Bobolink({
    timeout: 2000,
    retry: 3,
    concurrency: 'some',
    retryPrior: 'some',
    catch: (err) => {
      console.log('catch err', err);
    }
  });

  let task1 = [
    delayReturn(1000, '1-1'),
    delayReturn(2000, '1-2'),
    delayReturn(1000, '1-3', true),
    delayReturn(3000, '1-4'),
    delayReturn(6000, '1-5'),
    delayReturn(10, '1-6')
  ];

  let task2 = [
    delayReturn(1000, '2-1')
  ];

  bl.put(task1).then(res => {
    console.log('task1 return\n', res);
  });
  bl.put(task2).then(res => {
    console.log('task2 return\n', res);
  });

  bl.put(delayReturn(0, '5-5')).then(res => {
    console.log('single task return\n', res);
  });

  function delayReturn(ms, value, isReject) {
    return function () {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (isReject) {
            reject(value);
          } else {
            resolve(value);
          }
        }, ms);
      });
    }
  }
}

function testFrequencyMode() {
  let bl = new Bobolink({
    scheduling: {
      enable: 'frequency',
      frequency: {
        countPerSecond: 10000
      }
    }
  });

  let max = 1000;
  for (let i = 0; i < max; i++) {
    bl.put(() => {
      return new Promise(resolve => {
        (i === 0 || i === max - 1) && console.log('index', i, 'time', new Date().getTime());
        resolve();
      });
    });
  }
}

testFrequencyMode();

testImmediatelyMode();
