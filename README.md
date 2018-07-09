#### Introduction
Lightweight JS task queues，Support concurrency control, task timeout, retry failed, error catch, load analysis, etc

#### Realization
How the queue can be digested in a timely manner？Grab two important moments：put task and each task is completed。Assuming that the concurrency of the queue is set to n, the number of tasks in execution is m：

1. When put tasks, load (n-m) tasks at once and put them into execution queue.
2. When each task is completed, load a supplement.

in addition, The queue is only dependent on Promise.

#### Usage

1. Create a default queue

    A queue object is created as required (there is no association between queue objects, so different queue objects can be used in a variety of scenarios, or even a number of queue combinations can be used to deal with some complex scenes).

    ```javascript
    let q = new Queue();
    ```
2. put a task

    Since the code within the Promise function has been executed at the time of creation (the code in the and catch is executed by callback), it is not feasible to simply put a Promise into the queue.

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
    At this point, P must wait for the call to execute the internal Promise code, and P returns the Promise, so the value can continue to be passed. Each task placed in the queue should be encapsulated in this way.
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
    // because the queue is idle, the task can be scheduled immediately.
    q.put(p).then(task => {
        // print 3
        console.log(task.res)
    });
    ```
    Of course, if the number of tasks in the queue execution has reached the maximum concurrency when the queue is placed, it needs to wait for the task to make space when the task is completed, and the task before the current task has been scheduled to be completed.

3. Put in a set of tasks

    The queue allows multiple tasks to be put at the same time, and put.then will be called when the group task is executed.
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
     let q = new Queue({
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
    put(tasks, prior)
    ```
    put allows the prior to be specified as true to put into the queue header.

7. More

    + q.options：get the configuration of the current queue.
    + q.queueTaskSize：get the number of tasks in the current queue.
    + q.runningTaskCount：get the number of tasks currently being processed.