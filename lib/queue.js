/**
 * Created by cmx on 2018/6/11.
 *
 * 任务执行的时机有两个:
 *
 *  1. 往队列put任务时, 会检测当前需要从队列中load出多少个任务执行
 *  2. 一个任务执行完时, 会尝试从队列中load一个任务进行补充。
 *
 */

const constants = require('./constants');
const Options = require('./options');
const utils = require('./utils');

function Queue(options) {

  let self = this;

  // 任务队列, 必然是一个函数, 执行返回一个Promise对象
  let queueTasks = [];

  // 执行中任务个数
  this.runningTasksCount = 0;


  // 任务标签, 用于判断一组任务是否执行结束以及留存每个任务的响应
  // 通常状态是
  // {
  //    '任务组id': {
  //      results: [xx, ...],
  //      remainingCount: 10
  //    }
  // }
  // results一一对应了提交的每个任务最终的响应结果, remainingCount指示了该组任务剩余未执行任务数
  let taskTag = {};

  // 频率控制器, 实际的实现就是一个间隔执行器
  let frequencyController;

  // 描述一个任务调度器的行为
  // init: 初始化该调度模式
  // putThenRun: 是否在put的时候加载任务
  // replenish: 一个任务执行完时是否从等待的任务中加载一个进行补充
  let schedulingModes = {
    frequency: {
      putThenRun: false,
      replenish: false,
      init: function () {
        // 修正countPerSecond的不合法值
        let countPerSecond = ~~queueOptions.scheduling.frequency.countPerSecond;
        countPerSecond < 1 && (countPerSecond = 100);
        let maxFactor = getMaxFactor(1000, countPerSecond);
        // 求得时间间隔
        let interval = 1000 / maxFactor;
        // 求得每个时间间隔运行的任务数
        let taskNumber = countPerSecond / maxFactor;
        // 初始化一个定时任务调度器
        frequencyController = setInterval(() => {
          // 执行中队列允许新增的任务数如果大于0则调度一个任务
          if (queueOptions.concurrency - self.runningTasksCount > 0) {
            runTask(taskNumber);
          }
        }, interval);
      }
    },
    immediately: {
      putThenRun: true,
      replenish: true
    }
  }

  // 队列配置参数
  let queueOptions = new Options(options);

  // 初始化调度模式
  initSchedulingMode();


  // 设置参数
  this.setOptions = queueOptions.update;

  // 初始化调度任务
  function initSchedulingMode() {
    let mode = schedulingModes[queueOptions.scheduling.enable];
    mode.init && mode.init();
  }

  // 暴露排队中任务数, 只读
  Object.defineProperty(this, 'queueTaskSize', {
    get: () => {
      return queueTasks.length;
    }
  });

  // 暴露队列参数, 只读
  Object.defineProperty(this, 'options', {
    get: () => {
      return queueOptions;
    }
  });

  // 自增计数器
  let autoIncrement = 0;

  // 实际添加任务到队列
  function putTask(task, prior) {
    if (queueOptions.newPrior || prior) {
      queueTasks.unshift(task);
    } else {
      queueTasks.push(task);
    }
  }

  // 添加任务, 可以添加单个, 也可以批量添加(数组形式)
  // 要求任务为一个function, 执行返回一个Promise对象(直接传promise对象会直接被执行, 达不到任务队列执行的效果)
  this.put = function(tasks, prior) {
    return new Promise((resolve) => {
      // 非有效任务, 直接返回
      if (!tasks || (!Array.isArray(tasks) && !(tasks instanceof Function))) {
        resolve();
      }
      // 空任务组
      if (Array.isArray(tasks) && tasks.length == 0) {
        resolve([]);
      }
      // 本次提交单个任务, 不贴标签, 执行完会直接调用then
      if (tasks instanceof Function) {
        // resolve  任务执行完毕直接调用resolve
        // func     记录任务的执行函数
        // retry    每个任务记录重试的次数
        // putTime  每个任务记录提交时间
        putTask({
          resolve,
          func: tasks,
          retry: 0,
          putTime: new Date().getTime()
        }, prior);
      } else {
        // 本次提交了一组任务, 生成一个唯一标签标识这一组任务, 用于关联该组任务是否全部执行完成
        let tag = genId();
        // 过滤掉不符合要求的任务类型
        let validTasks = tasks.filter(task => task instanceof Function);
        // 标注本次任务个数, 每个任务在执行完成时负责将对应标签剩余任务数减1, 最后一个任务则负责调用then
        taskTag[tag] = {
          // 该组任务对应每个任务的返回值储存在此处
          results: new Array(validTasks.length),
          remainingCount: validTasks.length
        };

        // 提交任务
        // 如果指定了要优先处理任务组, 应维持任务组的顺序放入队头
        for (let i = 0, len = validTasks.length; i < len; i++) {
          // 如果这组任务优先处理, 一个一个放入队列的时候, 应当倒序
          let index = prior ? (len - i - 1) : i;
          let task = validTasks[index];
          // tag      标注一组任务
          // index    每个任务留存index, 以有序返回执行结果
          putTask({
            resolve,
            func: task,
            tag,
            index,
            retry: 0,
            putTime: new Date().getTime()
          }, prior);
        }
      }
      // 是否指明了put之后要立即执行
      if (schedulingModes[queueOptions.scheduling.enable].putThenRun) {
        // 最大并发量 - 正在执行中的任务数 = 可以新增执行的任务数
        let newTaskCount = queueOptions.concurrency - self.runningTasksCount;
        if (newTaskCount < 1) {
          return;
        }
        // 每次put都是一个触发执行逻辑的时机
        runTask(newTaskCount);
      }
    });
  }

  // 获取最早添加的若干个任务, 默认获取1个
  function get(count = 1) {
    count < 1 && (count = 1);
    return queueTasks.splice(0, count);
  }

  // 执行若干个任务
  function runTask(count) {
    // 取出最早的若干条任务
    let newTasks = get(count);
    // 执行新添加到队列的任务
    newTasks.forEach(task => {
      // 每个任务提交执行时, 将执行中任务数增1
      self.runningTasksCount++;
      // 如果指定了超时, 采用promise竞争来实现, 否则直接执行
      let p = (queueOptions.timeout > 0 ? Promise.race([delayPromise(queueOptions.timeout), task.func()]) : task.func());
      // 处理任务的后续
      taskHandler(task, p);
    });
  }

  function taskHandler(task, p) {
    let startTime = new Date().getTime();
    p.then(res => {
      // 执行成功任务数减1
      self.runningTasksCount--;
      return getRes(undefined, res, startTime - task.putTime, new Date().getTime() - startTime, task.retry);
    }).catch((err = constants.UNKNOWN_ERR) => {
      if (queueOptions.catch) {
        // 将运行错误的handler函数放置到执行序尾部，希望仅用于一些记录，不要影响队列的正常运作
        setTimeout(() => {
          queueOptions.catch(err);
        }, 0);
      }
      // 出错也认为是完成了
      self.runningTasksCount--;
      // 如果配置的出错重试次数大于任务已重试的次数, 则继续进入重试逻辑
      if (queueOptions.retry > task.retry) {
        // 重试次数增1
        task.retry++;
        // 如果重试任务优先, 则将任务置入队列头
        if (queueOptions.retryPrior) {
          queueTasks.unshift(task);
        } else {
          // 否则置入队列末尾
          queueTasks.push(task);
        }
        // 返回重试标识
        return constants.RETRY_FLAG;
      } else {
        // 不重试就按套路返回
        return getRes(err, null, startTime - task.putTime, new Date().getTime() - startTime, task.retry);
      }
    }).then(res => {
      // 每结束一个, 是否获取补充
      if (schedulingModes[queueOptions.scheduling.enable].replenish) {
        runTask(1);
      }
      // 非加入重试的话, 走处理流程
      if (res !== constants.RETRY_FLAG) {
        // 如果是批量添加的一组任务
        if (task.tag) {
          // 剩余未执行任务数减1
          taskTag[task.tag].remainingCount--;
          // 设置返回值
          taskTag[task.tag].results[task.index] = res;
          // 一组tag最后一个任务负责调用then
          if (taskTag[task.tag].remainingCount === 0) {
            let result = taskTag[task.tag].results;
            // 删除标签
            delete taskTag[task.tag];
            task.resolve(result);
          }
        } else {
          // 单个任务运行完直接then
          task.resolve(res);
        }
      }
    });
  }

  // err === undefined 任务成功, 不管res是否有值
  function getRes(err, res, waitingTime, runTime, retry) {
    return {
      err,
      res,
      waitingTime,
      runTime,
      retry
    }
  }

}


module.exports = Queue;