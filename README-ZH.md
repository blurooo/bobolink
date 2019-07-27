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

# 项目介绍

轻量级JS任务调度工具，允许并发控制、超时、重试、错误抓取、运行状态统计等，同时也支持多种调度模式，包括即时调度、按频率调度等。

[Click here to view the English document](https://github.com/blurooo/bobolink/blob/master/README.md)

# 运用场景

1. 希望控制异步任务的并发数，例如大批量的接口请求，控制了频率会减少对接口提供方的冲击，同时也可以降低系统的负载，CPU表现得更为平滑。

2. 希望任务可以在失败的时候重试。相比于自行实现，bobolink可以提供更加多样且易于使用的重试策略。

3. 希望任务可以提供超时取消的能力，也可以提供每个任务的执行指标，包括在队列中的等待时长，运行时长，执行状态等。

4. 希望可以控制异步任务的总量，在达到一个阈值之后，bobolink会采取拒绝或丢弃旧任务等方式避免任务出现不可控的堆积现象。

总结：可以将bobolink理解为一个线程池，所有异步任务都可以通过bobolink来调度，有了bobolink之后，异步任务不再是野蛮堆积的，而是完全可控的。

# 安装

```
npm i bobolink
```

# 快速开始

## 基本使用

```
const Bobolink = require('bobolink');

// 新建队列实例
const queue = new Bobolink();

// 提交函数型任务
queue.put(() => {
    // 任务必须返回Promise
    return Promise.resolve(true);
}).then(ts => {
    console.log('任务执行完成');
    // undefined
    console.log('是否成功：' + ts.err === undefined);
    // true
    console.log('返回值：' + ts.res);
    console.log('等待时间：' + ts.waitingTime);
    console.log('执行时间：' + ts.runTime);
    // 0
    console.log('重试次数：' + ts.retry);
});

// 提交执行失败的任务
queue.put(() => {
    return Promise.reject('error');
}).then(ts => {
    console.log('任务执行完成');
    // error
    console.log('错误：' + ts.err);
});
```
初始化实例的时候，允许配置队列的属性：

```
// 将并发数设置为1，得到一个串行队列
const queue = new Bobolink({
    concurrency: 1
});
```
如果任务被检测出有问题，会立即抛出异常：
```
// 提交一个没有元素的任务组
// 或者提交一个存在元素，但所有元素都不符合当前的任务模型的任务组
queue.put([]).catch(err => {
    assert.equal(err, Bobolink.EMPTY_ELEMENTS);
});
```

## 按频率调度

```
const Bobolink = require('bobolink');
const assert = require('assert');

// 新建队列实例，启用按频率调度模式
const queue = new Bobolink({
    // 常量直接挂载在Bobolink下，设定会按频率调度
    scheduleMode: Bobolink.SCHEDULE_MODE_FREQUENCY,
    // 设定每秒执行两个任务，bobolink会计算出每500ms执行一个任务
    countPerSecond: 2
});

// 通过此变量计算任务调度的个数
let scheduleCount = 0;

// 每500ms调度一个任务，1200ms的时候应该只够调度2个任务
let t1 = new Promise(resolve => {
    setTimeout(() => {
        assert.equal(scheduleCount, 2);
        resolve();
    }, 1200);
});

// 生成任务函数
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

// 往队列里放入三个任务 
queue.push([task(), task()， task()]).then(ts => {
    console.log('本组任务总的耗时：' + ts.runTime);
    // 本组任务返回值，res为数组，每个元素包含了各个任务的执行状态
    assert.equal(ts.res.length, 3);
    // 前两个任务正常执行，但第三个任务会因为队列销毁而取消
    assert.equal(ts.res[2].err, Bobolink.DISCARD);
});

t1.then(() => {
    // 执行完毕，有需要的话可以销毁队列所占的资源
    queue.destory();
});
```

## 数据模式

```
const Bobolink = require('bobolink');
const assert = require('assert');

// 新建队列实例，提供handler函数
const queue = new Bobolink({
    handler: data => {
        assert.equal(data, true);
        // 取反
        return !data;
    }
});

// 首次放入非函数型任务，将自动推断为数据模式
queue.push(true).then(ts => {
    assert.equal(ts.res, false);
});
```

## 组合模式

```
const Bobolink = require('bobolink');
const assert = require('assert');

// 希望每分钟执行一组清理，每组都会携带对应需要清理的若干个ID
// 每个ID清理耗时1分钟（主要是IO耗时），最多同时清理2个ID
let clearMap = {
    group1: [1, 2, 3],
    group2: [5, 6, 7, 8]
}

// ID清理队列
let clearQueue = new Bobolink({
    // 最多同时清理2个ID
    concurrency: 2,
    // 清理任务
    handler: id => {
        return new Promise(resolve => {
            setTimeout(resolve, 1000 * 60);
        });
    }
});

// 每分钟处理一个组的队列
let intervalQueue = new Bobolink({
    timeScale: 60,
    countPerTimeScale: 1,
    handler: groupId => {
        // 将该组下的ID列表提交到清理队列中
        return clearQueue.put(clearMap[groupId]);
    }
});

intervalQueue.push(['group1', 'group2']).then(ts => {
    console.log('所有任务执行完成，总耗时：' + ts.runTime);
});
```

## 支持的配置项

| 配置 | 描述 | 取值 |
| --- | --- | --- |
| concurrency | 并发数 | 大于0，默认值为5 |
| timeout | 任务超时时间（ms） | 大于等于0，设置为0则不超时，默认为15000 |
| retry | 失败重试次数 | 大于等于0，设置为0则不重试，默认为0 |
| retryPrior | 是否优先执行重试任务 | 默认为false |
| newPrior | 是否优先执行新任务 | 默认为false，运行期不支持更改 |
| catch | 抓取任务的异常，重试多次会调用多次catch | 需要提供一个函数，默认为null |
| max | 提交到队列且等待执行的任务最多可以有多少个 | -1为没有上限，默认为65536 |
| scheduleMode | 调度模式，支持按频率调度和即时调度 | Bobolink.SCHEDULE_MODE_FREQUENCY和Bobolink.SCHEDULE_MODE_IMMEDIATELY（默认），运行期不支持更改 |
| countPerTimeScale | 按频率调度时，每个时间刻度调度的任务数 | 大于0，默认为100，设置为-1时将每次调度所有任务，运行期不支持更改 |
| timeScale | 时间刻度（s） | 大于0，默认为1
| taskMode | 任务模式，即put时，任务的类型属于函数还是数据 | Bobolink.TASK_MODE_DATA和Bobolink.TASK_MODE_FUNCTION，没有设置的话将自动推断，运行期不支持更改 |
| handler | 任务为数据模式时，需要提供handler函数 | 执行返回Promise的函数 |
| saturationPolicy | 队列饱和时提交任务的策略 | Bobolink.SATURATION_POLICY_ABORT（终止，默认）和Bobolink.SATURATION_POLICY_DISCARD_OLDEST（丢弃最早任务） |

## 任务执行状态

字段 | 描述
---|---
err | 任务的异常信息，任务执行成功时，err全等于undefined
res | 任务的返回值，提交单个任务时，res为该任务的返回值；提交一组任务时，res为数组，每个元素分别对应每个任务的执行状态
runTime | 任务执行时间，提交一组任务时为整组任务的执行时间
waitingTime | 任务在队列中的等待时间
retry | 任务重试次数

## API简述

> Bobolink

Bobolink是用于生成执行队列的类，需要借用new关键字。

语法：

```
new Bobolink(options)
```

`[options]`

配置项，详细配置参照“支持的配置项”。

Bobolink挂载了一些字符串常量，例如任务取消执行的标识：Bobolink.DISCARD，可优先考虑使用。

> Bobolink.prototype.put(tasks, prior)

别名函数：Bobolink.prototype.push(tasks, prior)。

提交任务到队列实例中以供调度。

`[tasks]`

被提交的任务，可以是单个，也可以是一组。任务类型可以是数据，也可以是函数。

`[prior]`

本次任务是否优先处理。

返回Promise，当任务本身被检测到有异常或不被接受（未进入执行流程）则会抛出错误，需要使用catch抓取。一旦提交成功，不管任务是否执行成功，都可以在then流程中获取任务的执行状态。

> Bobolink.prototype.setOption(options)

更新队列实例的配置，除运行期不支持更改的配置项外，其它配置项都可以随意更新，即时生效。

> Bobolink.prototype.runningTasksCount

获取运行中的任务数。

> Bobolink.prototype.queueTaskSize

获取队列中等待的任务数。

> Bobolink.prototype.options

获取当前实例的配置。

> Bobolink.prototype.destory()

清理当前队列实例。包括移除定时调度器（存在的话）以及清理剩余未执行任务（全部返回取消）。


# LICENSE

MIT