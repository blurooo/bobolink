/**
 * Created by blurooo on 2018/6/11.
 */

const constants = require('./constants');
const Options = require('./options');
const utils = require('./utils');

function Bobolink(options) {

  let self = this;

  let queueTasks = [];

  this.runningTasksCount = 0;

  let taskTag = {};

  let frequencyController;

  let schedulingModes = {
    frequency: {
      putThenRun: false,
      replenish: false,
      init: frequencyInit
    },
    immediately: {
      putThenRun: true,
      replenish: true
    }
  }

  function frequencyInit() {
    let countPerSecond = ~~queueOptions.scheduling.frequency.countPerSecond;
    countPerSecond < 1 && (countPerSecond = 100);
    let gcd = utils.getGCD(1000, countPerSecond);
    let interval = 1000 / gcd;
    let taskNumber = countPerSecond / gcd;
    frequencyController = setInterval(() => {
      let rest = queueOptions.concurrency - self.runningTasksCount;
      if (rest > 0) {
        runTask(Math.min(rest, taskNumber));
      }
    }, interval);
  }

  let queueOptions = new Options(options);

  initSchedulingMode();

  this.setOptions = queueOptions.update;

  function initSchedulingMode() {
    let mode = schedulingModes[queueOptions.scheduling.enable];
    mode.init && mode.init();
  }

  Object.defineProperty(this, 'queueTaskSize', {
    get: () => {
      return queueTasks.length;
    }
  });

  Object.defineProperty(this, 'options', {
    get: () => {
      return queueOptions;
    }
  });

  function putTask(task, prior) {
    if (queueOptions.newPrior || prior) {
      queueTasks.unshift(task);
    } else {
      queueTasks.push(task);
    }
  }

  this.put = function(tasks, prior) {
    return new Promise((resolve) => {
      if (!tasks || (!Array.isArray(tasks) && !(tasks instanceof Function))) {
        return resolve(getRes(constants.INVALID));
      }
      if (Array.isArray(tasks) && tasks.length == 0) {
        return resolve([]);
      }
      if (tasks instanceof Function) {
        if (queueOptions.max !== -1 && (queueTasks.length >= queueOptions.max)) {
          return resolve(getRes(constants.EXCEEDED));
        }
        putTask({
          resolve,
          func: tasks,
          retry: 0,
          putTime: new Date().getTime()
        }, prior);
      } else if (Array.isArray(tasks)) {
        let tag = utils.genId();
        let validTasks = tasks.filter(task => task instanceof Function);
        if (validTasks.length === 0) {
          return resolve([]);
        }
        if (queueOptions.max !== -1 && (queueTasks.length + validTasks.length > queueOptions.max)) {
          return resolve(getRes(constants.EXCEEDED));
        }
        taskTag[tag] = {
          results: new Array(validTasks.length),
          remainingCount: validTasks.length
        };

        for (let i = 0, len = validTasks.length; i < len; i++) {
          let index = prior ? (len - i - 1) : i;
          let task = validTasks[index];
          putTask({
            resolve,
            func: task,
            tag,
            index,
            retry: 0,
            putTime: new Date().getTime()
          }, prior);
        }
      } else {
        return resolve(getRes(constants.UNSUPPORTED));
      }
      if (schedulingModes[queueOptions.scheduling.enable].putThenRun) {
        let newTaskCount = queueOptions.concurrency - self.runningTasksCount;
        if (newTaskCount < 1) {
          return;
        }
        runTask(newTaskCount);
      }
    });
  }

  function get(count = 1) {
    count < 1 && (count = 1);
    return queueTasks.splice(0, count);
  }

  function runTask(count) {
    let newTasks = get(count);
    newTasks.forEach(task => {
      self.runningTasksCount++;
      let p = (queueOptions.timeout > 0 ? Promise.race([utils.delayPromise(queueOptions.timeout), task.func()]) : task.func());
      taskHandler(task, p);
    });
  }

  function taskHandler(task, p) {
    let startTime = new Date().getTime();
    p.then(res => {
      self.runningTasksCount--;
      return getRes(undefined, res, startTime - task.putTime, new Date().getTime() - startTime, task.retry);
    }).catch((err = constants.UNKNOWN_ERR) => {
      if (queueOptions.catch) {
        setTimeout(() => {
          queueOptions.catch(err);
        }, 0);
      }
      self.runningTasksCount--;
      if (queueOptions.retry > task.retry) {
        task.retry++;
        if (queueOptions.retryPrior) {
          queueTasks.unshift(task);
        } else {
          queueTasks.push(task);
        }
        return constants.RETRY_FLAG;
      } else {
        return getRes(err, null, startTime - task.putTime, new Date().getTime() - startTime, task.retry);
      }
    }).then(res => {
      if (schedulingModes[queueOptions.scheduling.enable].replenish) {
        runTask(1);
      }
      if (res !== constants.RETRY_FLAG) {
        if (task.tag) {
          taskTag[task.tag].remainingCount--;
          taskTag[task.tag].results[task.index] = res;
          if (taskTag[task.tag].remainingCount === 0) {
            let result = taskTag[task.tag].results;
            delete taskTag[task.tag];
            task.resolve(result);
          }
        } else {
          task.resolve(res);
        }
      }
    });
  }

  function getRes(err, res, waitingTime = 0, runTime = 0, retry = 0) {
    return {
      err,
      res,
      waitingTime,
      runTime,
      retry
    }
  }

}


module.exports = Bobolink;