```
___.         ___.          .__  .__        __
\_ |__   ____\_ |__   ____ |  | |__| ____ |  | __
 | __ \ /  _ \| __ \ /  _ \|  | |  |/    \|  |/ /
 | \_\ (  <_> ) \_\ (  <_> )  |_|  |   |  \    <
 |___  /\____/|___  /\____/|____/__|___|  /__|_ \
     \/           \/                    \/     \/
```

[![Build Status](https://travis-ci.org/blurooo/bobolink.png?branch=3.0)](https://travis-ci.org/blurooo/bobolink)
[![Coverage Status](https://coveralls.io/repos/github/blurooo/bobolink/badge.svg?branch=3.0)](https://coveralls.io/github/blurooo/bobolink)


#### Introduction
Lightweight JS task scheduling framework, which supports concurrency control, timeout, retry, error catch, load analysis, etc. In addition, it also supports multiple scheduling modes, including immediate scheduling and frequency scheduling.

[点击查看中文文档](https://github.com/blurooo/bobolink/blob/master/README-CN.md)

#### Install

```
npm i bobolink
```

#### Usage

1. Create a default Bobolink

    A bobolink is created as required (there is no association between the different bobolink, so different bobolink can be used in a variety of scenarios, or even a number of bobolink combinations can be used to deal with some complex scenes).

    ```javascript
    const Bobolink = require('bobolink');
    // Each bobolink has a big task queue, so feel free to throw the task to it.
    let q = new Bobolink();
    ```
2. put a single task

    Since the code within the Promise function has been executed at the time of creation (the code in the and catch is executed by callback), it is not feasible to simply put a Promise into the bobolink.

    ```javascript
    // The following print order is 1 2 3
    new Promise(resolve => {
        console.log(1);
        resolve(3)
    }).then(res => {
        console.log(res);
    })
    console.log(2)
    ```
    By put Promise into a function, you can achieve the effect of delayed execution.
    ```javascript
    function p() {
        // return the promise
        return new Promise(resolve => {
            console.log(1);
            resolve(3)
        }).then(res => {
            console.log(res);
        })
    }
    console.log(2);
    ```
    At this point, p must wait for the call to execute the internal Promise code, and p returns the Promise, so the value can continue to be passed. Each task placed in the bobolink should be encapsulated in this way.
    ```javascript
    function p() {
        return new Promise(resolve => {
            console.log(1);
            resolve(2)
        }).then(res => {
            console.log(res);
            return 3;
        })
    }
    // because the bobolink is idle, the task can be scheduled immediately.
    bl.put(p).then(task => {
        // print 3
        console.log(task.res)
    });
    ```
    Of course, if the number of tasks in the bobolink's queue execution has reached the maximum concurrency when the queue is placed, it needs to wait for the task to make space when the task is completed and the task before the current task has been scheduled to be completed.

3. Put multiple tasks

    The bobolink allows multiple tasks to be put at the same time, and put.then will be called when the group task is executed.
    ```javascript
    function getP(flag) {
        return function p() {
            return new Promise(resolve => {
                resolve(flag)
            });
        }
    }
    q.put([getP(1), getP(2), getP(3)]).then(tasks => {
        // Print the return value of each task
        for (let i = 0; i < tasks.length; i++) {
            console.log(tasks[i].res);
        }
    })
    ```

4. Configuration

     you can set any of the following parameters：
     ```javascript
     let q = new Bobolink({
        // the minimum setting is 1
        concurrency: 5,
        // task timeout, ms，Set it to 0 and it doesn't timeout
        timeout: 15000,
        // the maximum number of retries when a task failure, Set to 0 and do not retry
        retry: 0,
        // whether to prioritize retry tasks
        retryPrior: false,
        // whether to prioritize new tasks
        newPrior: false,
        // the maximum number of tasks allowed to queue, -1 is unlimited
        max: -1,
        // specify the scheduling mode, the setting is valid only when bobolink is initialized.
        scheduling: {
          // the default is 'immediately', and tasks will always be scheduled at idle.
          // you can also set it to 'frequency', and specify the value of countPerSecond, bobolink will schedule tasks strictly according to the frequency you set.
          enable: 'frequency',
          frequency: {
            // how many tasks do you want to schedule per second
            countPerSecond: 10000
          }
        },
        // catch any errors
        catch: (err) => {

        }
     });
     ```
     parameters allow you to reset them at run time:
     ```javascript
     q.setOptions({
        concurrency: 5,
        timeout: 15000,
        retry: 0,
        retryPrior: false,
        newPrior: false,
        catch: null
     });
     ```

5. State

    ```javascript
    taskRes = {
        // if the task encounters an exception, it will be undefined
        err: undefined,
        // the return value of the task
        res: Object,
        // the time it takes for a task to be queued up to be scheduled
        waittingTime: 20,
        // the task takes time to run
        runTime: 1,
        // number of task retries
        retry: 2
    }
    ```
6. Cutting

    ```
    Bobolink.ptototype.put(tasks, prior)
    ```
    put allows the prior to be specified as true to put into the queue header.

7. More

    + q.options：get the configuration of the current queue.
    + q.queueTaskSize：get the number of tasks in the current queue.
    + q.runningTaskCount：get the number of tasks currently being processed.
    
    
#### LICENSE

MIT