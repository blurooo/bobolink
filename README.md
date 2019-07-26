```
___.         ___.          .__  .__        __
\_ |__   ____\_ |__   ____ |  | |__| ____ |  | __
 | __ \ /  _ \| __ \ /  _ \|  | |  |/    \|  |/ /
 | \_\ (  <_> ) \_\ (  <_> )  |_|  |   |  \    <
 |___  /\____/|___  /\____/|____/__|___|  /__|_ \
     \/           \/                    \/     \/
```

[![Build Status](https://travis-ci.org/blurooo/bobolink.png?branch=3.0)](https://travis-ci.org/blurooo/bobolink)
[![Coverage Status](https://coveralls.io/repos/github/blurooo/bobolink/badge.svg?branch=3.0)](https://coveralls.io/github/blurooo/bobolink?branch=3.0)

# Introduction

Lightweight JS task scheduling tool that allows for concurrency control, timeout, retry, error fetching, running status statistics, etc. It also supports multiple scheduling modes, including immediately scheduling and frequency scheduling.

[点击查看中文文档](https://github.com/blurooo/bobolink/blob/master/README-ZH.md)

# Application scenario

1. You want to control the number of concurrent tasks, such as large-scale interface requests, control the frequency will reduce the impact on the interface provider, but also reduce the load on the system, the CPU performance is smoother.

2. Hope that the task can be retried when it fails. Compared to self-implementation, bobolink can provide a more diverse and easy-to-use retry strategy.

3. I hope that the task can provide the ability to cancel the timeout, and also provide the execution indicators of each task, including the waiting time in the queue, the running time, the execution status, and so on.

4. I want to control the total number of asynchronous tasks. After reaching a threshold, bobolink will reject or discard the old tasks, so that the task will not be uncontrollable.

Summary: Bobolink can be understood as a thread pool, all asynchronous tasks can be scheduled through bobolink, with bobolink, asynchronous tasks are no longer barbaric, but completely controllable.

# Install

```
npm i bobolink
```

# Quick Start

## Basic Usage

```
const Bobolink = require('bobolink');

// create a new queue instance
const queue = new Bobolink();

// submit a functional task
queue.put(() => {
    // The task must return a Promise
    return Promise.resolve(true);
}).then(ts => {
    console.log('task execution completed');
    // undefined
    console.log('whether succeed: ' + ts.err === undefined);
    // true
    console.log('return value: ' + ts.res);
    console.log('waiting time: ' + ts.waitingTime);
    console.log('run time: ' + ts.runTime);
    // 0
    console.log('number of retries: ' + ts.retry);
});

// submit a task that failed to execute
queue.put(() => {
    return Promise.reject('error');
}).then(ts => {
    console.log('task execution completed');
    // error
    console.log('error: ' + ts.err);
});
```

When initializing an instance, you are allowed to configure the properties of the queue:

```
// set the number of concurrency to 1 to get a serial queue
const queue = new Bobolink({
    concurrency: 1
});
```
If the task is detected to have a problem, an exception will be thrown immediately:
```
// submit a task group with no elements
// or submit a task group with existing elements, but none of the elements meet the current task model
queue.put([]).catch(err => {
    assert.equal(err, Bobolink.EMPTY_ELEMENTS);
});
```

## Scheduled by frequency

```
const Bobolink = require('bobolink');
const assert = require('assert');

// create a new queue instance to enable the frequency scheduling mode
const queue = new Bobolink({
    // constants are directly mounted under Bobolink
    scheduleMode: Bobolink.SCHEDULE_MODE_FREQUENCY,
    // set two tasks per second, bobolink calculates a task every 500ms
    countPerSecond: 2
});

// calculate the number of task schedules by this variable
let scheduleCount = 0;

// one task is scheduled every 500ms, and only two tasks should be scheduled after 1200ms.
let t1 = new Promise(resolve => {
    setTimeout(() => {
        assert.equal(scheduleCount, 2);
        resolve();
    }, 1200);
});

// generate task function
function task() {
    return () => {
        return new Promise(resolve => {
            setTimeout(() => {
                scheduleCount++;
                resolve();
            }, 5);
        });
    }
}

// put three tasks into the queue
queue.push([task(), task()， task()]).then(ts => {
    console.log('The total time spent on this group of tasks:' + ts.runTime);
    // the return value of this group of tasks, res is an array, each element contains the execution status of the corresponding task
    assert.equal(ts.res.length, 3);
    // the first two tasks are executed normally, but the third task is cancelled because the queue is destroyed.
    assert.equal(ts.res[2].err, Bobolink.DISCARD);
});

t1.then(() => {
    // after the execution is completed, the resources occupied by the queue can be destroyed if necessary.
    queue.destory();
});
```

## Data mode

```
const Bobolink = require('bobolink');
const assert = require('assert');

// create a new queue instance, providing a handler function
const queue = new Bobolink({
    handler: data => {
        assert.equal(data, true);
        return !data;
    }
});

// putting a non-functional task for the first time will automatically be inferred as a data mode
queue.push(true).then(ts => {
    assert.equal(ts.res, false);
});
```

## Combination mode

```
const Bobolink = require('bobolink');
const assert = require('assert');

// I want to perform a set of cleanups every minute, each group will carry a number of IDs that need to be cleaned up.
// each ID cleanup takes 1 minute (mainly IO time), and at most 2 IDs are cleaned at the same time.
let clearMap = {
    group1: [1, 2, 3],
    group2: [5, 6, 7, 8]
}

// ID cleanup queue
let clearQueue = new Bobolink({
    // clean up 2 IDs at the same time
    concurrency: 2,
    // cleanup handler
    handler: id => {
        return new Promise(resolve => {
            setTimeout(resolve, 1000 * 60);
        });
    }
});

// process one group per minute
let intervalQueue = new Bobolink({
    timeScale: 60,
    countPerTimeScale: 1,
    handler: groupId => {
        // submit the list of IDs under this group to the cleanup queue
        return clearQueue.put(clearMap[groupId]);
    }
});

intervalQueue(['group1', 'group2']).then(ts => {
    console.log('all tasks are completed and the total time is spent:' + ts.runTime);
});
```

## Supported configuration items

 Configuration | Description | Value 
 ---- | ---- | ---- 
 concurrency | Concurrent number | Greater than 0, the default is 5 
| timeout | Task timeout (ms) | Greater than or equal to 0, set to 0 does not time out, the default is 15000 |
| retry | Number of failed retries | Greater than or equal to 0, set to 0 will not retry, the default is 0 |
| retryPrior | Whether to perform the retry task first | Default is false |
| newPrior | Whether to prioritize new tasks | The default is false, does not support modification |
| catch | Crawl the task's exception, retry multiple times and call multiple catches | Need to provide a function, the default is null |
| max | The maximum number of tasks that can be submitted to the queue and are awaiting execution | -1 is no upper limit, the default is 65536 |
| scheduleMode | Scheduling mode, support for frequency scheduling and immediately scheduling | Bobolink.SCHEDULE_MODE_FREQUENCY and Bobolink.SCHEDULE_MODE_IMMEDIATELY (default), oes not support modification |
| countPerTimeScale | Number of tasks scheduled per time scale when scheduled by frequency | Greater than 0, default is 100, set to -1 to schedule all tasks at a time, does not support modification |
| timeScale | Time scale (s) | Greater than or equal to 1, default is 1s
| taskMode | Task mode, ie put, the type of task belongs to function or data | Bobolink.TASK_MODE_DATA and Bobolink.TASK_MODE_FUNCTION, If it is not set, it will be automatically inferred and does not support modification. |
| handler | When the task is in data mode, you need to provide the handler function. | A function that returns a Promise |
| saturationPolicy | Policy for submitting tasks when the queue is saturated | Bobolink.SATURATION_POLICY_ABORT (abort, default) and Bobolink.SATURATION_POLICY_DISCARD_OLDEST (discard the oldest task) |

## Task execution status

Field | Description
---|---
err | Exception information of the task, when the task is executed successfully, err is equal to undefined
res | The return value of the task. When a single task is submitted, res is the return value of the task. When a group of tasks is submitted, res is an array, and each element corresponds to the execution status of each task.
runTime | Task execution time, when a group of tasks is submitted, the execution time of the entire group of tasks
waitingTime | The waiting time of the task in the queue
retry | Number of task retries

## API brief

> Bobolink

Bobolink is the class used to generate the execution queue and needs to borrow the new keyword.

grammar:

```
new Bobolink(options)
```

`[option]`

For configuration items, refer to Supported Configuration Items for detailed configuration.

Bobolink mounts some string constants, such as the identifier of the task cancellation: Bobolink.DISCARD, which is preferred.

> Bobolink.prototype.put(tasks, prior)

Alias function: Bobolink.prototype.push(tasks, prior)。

Submit the task to the queue instance for scheduling.

`[tasks]`

The submitted tasks can be single or a group. The task type can be either data or a function.

`[prior]`

Whether the task submitted this time is prioritized.

Returning to Promise, when the task itself is detected to be abnormal or not accepted (not entering the execution flow), an error is thrown and a catch is required. Once the submission is successful, the execution status of the task can be obtained in the then process regardless of whether the task is executed successfully.

> Bobolink.prototype.setOption(options)

Update the configuration of the queue instance. Except for the configuration items that do not support the change during the runtime, other configuration items can be updated at will, and take effect immediately.

> Bobolink.prototype.runningTasksCount

Get the number of tasks in action.

> Bobolink.prototype.queueTaskSize

Gets the number of tasks waiting in the queue.

> Bobolink.prototype.options

Get the configuration of the current instance.

> Bobolink.prototype.destory()

Clean up the current queue instance. This includes removing the timing scheduler (if it exists) and cleaning up the remaining unexecuted tasks (all return cancellations).


# LICENSE

MIT