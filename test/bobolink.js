const assert = require('assert');
const Bobolink = require('../lib/bobolink');
const constants = require('../lib/constants');

describe('集成测试bobolink', () => {

    describe('函数 - 立即调度模式', () => {
        let queue = new Bobolink({
            scheduleMode: constants.SCHEDULE_MODE_IMMEDIATELY,
            taskMode: constants.TASK_MODE_FUNCTION
        });

        it('基本调度', done => {
            let hitMap = {
                t1: false,
                t2: false,
                t3: false,
                t4: false,
                t5: false
            };
            // 一般成功
            let t1 = queue.push(() => {
                return Promise.resolve(true);
            }).then(ts => {
                assert.equal(ts.err, undefined);
                assert.equal(ts.res, true);
                assert.equal(ts.runTime >= 0, true);
                assert.equal(ts.waitingTime >= 0, true);
                assert.equal(ts.retry, 0);
                hitMap.t1 = true;
            });
            // 一般失败
            let t2 = queue.push(() => {
                return Promise.reject(false);
            }).then(ts => {
                assert.equal(ts.err, false);
                assert.equal(ts.res, undefined);
                assert.equal(ts.runTime >= 0, true);
                assert.equal(ts.waitingTime >= 0, true);
                assert.equal(ts.retry, 0);
                hitMap.t2 = true;
            });
            // 变更队列大小
            queue.setOptions({
                max: 2,
                concurrency: 1
            });
            assert.equal(queue.options.max, 2);
            assert.equal(queue.runningTasksCount, 2);
            let t3 = queue.push([() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(true);
                    }, 5);
                });
            }, () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(true);
                    }, 5);
                });
            }]).then(ts => {
                assert.equal(ts.err, undefined);
                assert.equal(ts.res.length, 2);
                // 任务已满，第一个任务将被取消
                assert.equal(ts.res[0].err, constants.DISCARD);
                assert.equal(ts.res[1].res, true);
                assert.equal(ts.runTime <= 20, true);
                assert.equal(ts.waitingTime <= 10, true);
                assert.equal(ts.retry, 0);
                hitMap.t3 = true;
            });
            assert.equal(queue.runningTasksCount, 2);
            // 测试饱和策略 - 终止
            let t4 = queue.push(() => {
                return Promise.resolve(true);
            }).catch(err => {
                assert.equal(err, constants.EXCEEDED);
                hitMap.t4 = true;
            });
            // 测试饱和策略 - 丢弃最早任务
            queue.setOptions({
                saturationPolicy: constants.SATURATION_POLICY_DISCARD_OLDEST,
                max: 1
            });
            let t5 = queue.push([() => {
                return Promise.resolve(true);
            }, () => {
                return Promise.resolve(false);
            }]).then(ts => {
                // 被剔除到最后只剩第一个任务
                assert.equal(ts.res.length, 1);
                assert.equal(ts.res[0].res, true);
                hitMap.t5 = true;
            });
            Promise.all([t1, t2, t3, t4, t5]).then(() => {
                for (let t in hitMap) {
                    if (!hitMap[t]) {
                        throw t + ' was fail';
                    }
                }
                done();
            });
        });

    });

});