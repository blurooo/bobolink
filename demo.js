const Queue = require('./queue');

function testImmediatelyMode() {
  // 错误的参数会被修正为默认值
  let q = new Queue({
    timeout: 2000,
    retry: 3,
    concurrency: 's',
    retryPrior: 'asda',
    catch: (err) => {
      console.log('抓取到错误', err);
    }
  });

// 建立两个任务组, 评估运行态
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

  q.put(task1).then(res => {
    console.log('任务组1 返回\n', res);
  });
  q.put(task2).then(res => {
    console.log('任务组2 返回\n', res);
  });

// 放置单个任务
  q.put(delayReturn(0, '5-5')).then(res => {
    console.log('单个任务返回\n', res);
  })

// 只关心任务运行情况以及返回值
  q.put([delayReturn(0, 1), delayReturn(0, 2, true), delayReturn(0, 3)]).then(tasks => {
    for (let i = 0; i < tasks.length; i++) {
      console.log('任务组有序返回', tasks[i].err === undefined ? '成功: ' + tasks[i].res : '失败: ' + tasks[i].err);
    }
  })

// 空任务组不会放入队列, 而是直接返回
  q.put([]).then(task => {
    console.log('空任务组直接返回', task);
  });

  q.put(delayReturn(0, '这是被catch到的错误', true)).then(tr => {
    console.log('测试任务失败被catch完成');
  });

// 建立一条串行任务队列
  let singleQ = new Queue({
    concurrency: 1
  });

// 建立一条并行任务队列
  let multiQ = new Queue({
    concurrency: 5
  });

// 5个任务串行处理, 每个任务也有允许并行的若干个子任务
// 每个串行任务执行完, 以及所有子任务也执行完, 才会轮到下一个串行任务
  for (let i = 0; i < 5; i++) {
    singleQ.put(() => {
      return new Promise((resolve, reject) => {
        if (i == 2) {
          reject(i);
        } else {
          resolve(i);
        }
      }).then(res => {
        console.log('串行任务成功', res);
        let multiTasks = [];
        for (let j = 0; j < 10; j++) {
          // 越靠后的任务组执行时间越高, 以验证是否串行执行
          multiTasks.push(delayReturn(5 - i, i + '-' + j));
        }
        return multiQ.put(multiTasks).then(mtr => {
          console.log('并行任务组' + i + '返回\n', mtr);
        });
      }).catch(err => {
        console.log('串行任务失败', err);
      });
    }).then(tr => {
      console.log('串行任务完成', i, '总执行时间:' + tr.runTime);
    });
  }


  let task3 = [
    delayReturn(0, '3-1'),
    delayReturn(0, '3-2'),
  ];

// 先放置一个延时返回任务, 用于阻塞后续的任务调度
  singleQ.put(delayReturn(10, '3-0')).then(res => {
    console.log('优先级任务返回\n', res);
  });

// 最终期待的任务队列应该是 3-4 3-2 3-3 3-1 3-5
  singleQ.put(delayReturn(0, '3-1')).then(res => {
    console.log('优先级任务返回\n', res);
  });

  singleQ.put([
    delayReturn(0, '3-2'),
    delayReturn(0, '3-3')
  ], true).then(res => {
    console.log('优先级任务返回\n', res);
  });

  singleQ.put(delayReturn(0, '3-4'), true).then(res => {
    console.log('优先级任务返回\n', res);
  });
  singleQ.put(delayReturn(0, '3-5')).then(res => {
    console.log('优先级任务返回\n', res);
  });

// 延期返回函数
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
  // 使用频率限定模式, 每秒运行并发1万条
  let q = new Queue({
    scheduling: {
      enable: 'frequency',
      frequency: {
        countPerSecond: 10000
      }
    }
  });

  // 下面的执行时间差应该是0.1s
  let max = 1000;
  for (let i = 0; i < max; i++) {
    q.put(() => {
      return new Promise(resolve => {
        (i === 0 || i === max - 1) && console.log('当前任务索引', i, '时间', new Date().getTime());
        resolve();
      });
    });
  }
}

testFrequencyMode();