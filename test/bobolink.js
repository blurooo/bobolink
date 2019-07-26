const assert = require('assert');
const Bobolink = require('../lib/bobolink');
const constants = require('../lib/constants');

describe('集成测试bobolink', () => {

    describe('函数 - 立即调度模式', () => {

        it('基本调度', done => {
            let queue = new Bobolink({
                scheduleMode: constants.SCHEDULE_MODE_IMMEDIATELY,
                taskMode: constants.TASK_MODE_FUNCTION
            });
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
            assert.equal(queue.queueTaskSize, 0);
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
                assert.equal(ts.runTime >= 0, true);
                assert.equal(ts.waitingTime >= 0, true);
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
                return Promise.resolve(false);
            }, () => {
                return Promise.resolve(true);
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
                // 测试新任务优先时，剔除最早任务是否符合预期
                queue.setOptions({
                    newPrior: true
                });
                // 一组任务会认为后面的任务更新，所以最早任务应该是第一个
                queue.push([() => {
                    return Promise.resolve(false);
                }, () => {
                    return Promise.resolve(true);
                }]).then(ts => {
                    assert.equal(ts.res.length, 1);
                    assert.equal(ts.res[0].res, true);
                    done();
                });
            });
        });

        it('任务模式限定', done => {
            let queue = new Bobolink({
                taskMode: constants.TASK_MODE_FUNCTION
            });
            let hitCount = 0;
            let t1 = queue.push(1).catch(err => {
                assert.equal(err, constants.TASK_ERROR);
                hitCount++;
            });
            let t2 = queue.push(1, 2).catch(err => {
                assert.equal(err, constants.TASK_ERROR);
                hitCount++;
            });
            let t3 = queue.push([1, () => {
                return Promise.resolve(true);
            }]).then(ts => {
                assert.equal(ts.res.length, 1);
                assert.equal(ts.res[0].res, true);
                hitCount++;
            });
            let t4 = queue.push([]).catch(err => {
                assert.equal(err, constants.EMPTY_ELEMENTS);
                hitCount++;
            });
            Promise.all([t1, t2, t3, t4]).then(() => {
                assert.equal(hitCount, 4);
                done();
            });
        });

        it('任务重试', done => {
            let hitCount = 0;
            let queue = new Bobolink({
                retry: 1
            });
            let t1 = queue.put(() => {
                return Promise.reject('error');
            }).then(ts => {
                hitCount++;
                assert.equal(ts.err, 'error');
                assert.equal(ts.retry, 1);
            });
            queue.setOptions({
                concurrency: 1
            });
            let retryFlagNormal = true;
            let serialNormal = [];
            let t2 = queue.put([() => {
                if (retryFlagNormal) {
                    retryFlagNormal = false;
                    serialNormal.push(1);
                    return Promise.reject();
                }
                serialNormal.push(4);
                return Promise.resolve();
            }, () => {
                serialNormal.push(2);
                return Promise.resolve();
            }, () => {
                serialNormal.push(3);
                return Promise.resolve();
            }]).then(ts => {
                hitCount++;
                assert.deepStrictEqual(serialNormal, [1, 2, 3, 4]);
                assert.equal(ts.res[0].retry, 1);
                assert.equal(ts.res[0].err, undefined);
                assert.equal(ts.res[1].err, undefined);
                assert.equal(ts.res[2].err, undefined);
            });
            Promise.all([t1, t2]).then(() => {
                assert.equal(hitCount, 2);
                done();
            });
        });

        it('重试任务优先', done => {
            let queue = new Bobolink({
                concurrency: 1,
                retryPrior: true,
                retry: 1
            });
            retryFlagPrior = true;
            let serialRetryPrior = [];
            queue.put([() => {
                if (retryFlagPrior) {
                    retryFlagPrior = false;
                    serialRetryPrior.push(1);
                    return Promise.reject();
                }
                serialRetryPrior.push(2);
                return Promise.resolve();
            }, () => {
                serialRetryPrior.push(3);
                return Promise.resolve();
            }, () => {
                serialRetryPrior.push(4);
                return Promise.resolve();
            }]).then(ts => {
                assert.deepStrictEqual(serialRetryPrior, [1, 2, 3, 4]);
                assert.equal(ts.res[0].retry, 1);
                assert.equal(ts.res[0].err, undefined);
                assert.equal(ts.res[1].err, undefined);
                assert.equal(ts.res[2].err, undefined);
                done();
            });
        });

        it('新任务优先', done => {
            let queue = new Bobolink({
                newPrior: true,
                concurrency: 1
            });
            let hitSerial = [];
            let t1 = queue.push([() => {
                hitSerial.push(4);
                return Promise.resolve();
            }, () => {
                hitSerial.push(1);
                return Promise.resolve();
            }]);
            let t2 = queue.push(() => {
                hitSerial.push(3);
                return Promise.resolve();
            });
            let t3 = queue.push(() => {
                hitSerial.push(2);
                return Promise.resolve();
            }, true);
            Promise.all([t1, t2, t3]).then(() => {
                assert.deepStrictEqual(hitSerial, [1, 2, 3, 4]);
                done();
            });
        });

        it('错误统一抓取', done => {
            let queue = new Bobolink({
                catch: err => {
                    assert.equal(err, 'error');
                }
            });
            queue.push(() => {
                return Promise.reject('error');
            }).then(ts => {
                assert.equal(ts.err, 'error');
                done();
            });
        });

    });


    describe('函数 - 按频率调度模式', () => {

        it('基本调度', done => {
            let queue = new Bobolink({
                scheduleMode: constants.SCHEDULE_MODE_FREQUENCY,
                taskMode: constants.TASK_MODE_FUNCTION,
                countPerTimeScale: 2
            });
            let scheduleCount = 0;
            // 每500ms调度一个任务，1200的时候应该只够调度2个任务
            let t1 = new Promise(resolve => {
                setTimeout(() => {
                    assert.equal(scheduleCount, 2);
                    resolve();
                }, 1200);
            });
            queue.push([() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        scheduleCount++;
                        resolve();
                    }, 5);
                });
            }, () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        scheduleCount++;
                        resolve();
                    }, 5);
                });
            }, () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        scheduleCount++;
                        resolve();
                    }, 5);
                });
            }]).then(ts => {
                assert.equal(ts.res.length, 3);
                // 第三个任务因为队列销毁而取消
                assert.equal(ts.res[2].err, constants.DISCARD);
            });
            t1.then(() => {
                queue.destory();
                setTimeout(() => {
                    done();
                }, 0);
            });
        });
    });

    describe('数据 - 立即调度模式', () => {

        
        it('任务模式自动推断', done => {
            let queue = new Bobolink({
                handler: data => {
                    assert.equal(data, true);
                    return !data;
                }
            });
            let hitCount = 0;
            // 先推断为数据模式
            let t1 = queue.put(true).then(ts => {
                assert.equal(ts.res, false);
                hitCount++;
            });
            assert.equal(queue.options.taskMode, constants.TASK_MODE_DATA);
            let t2 = queue.put(() => {
                return Promise.resolve(true);
            }).catch(err => {
                assert.equal(err, constants.TASK_ERROR);
                hitCount++;
            });
            let t3 = queue.put([() => {}, () => {}]).catch(err => {
                assert.equal(err, constants.TASK_ERROR);
                hitCount++;
            });
            Promise.all([t1, t2, t3]).then(() => {
                assert.equal(hitCount, 3);
                done();
            });
        });

    });


    describe('数据 - 按频率调度模式', () => {

        it('基本调度', done => {
            let scheduleCount = 0;
            let queue = new Bobolink({
                handler: data => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            scheduleCount++;
                            resolve(data);
                        }, 5);
                    });
                },
                scheduleMode: constants.SCHEDULE_MODE_FREQUENCY,
                countPerTimeScale: 2
            });
            // 每500ms调度一个任务，1200的时候应该只够调度2个任务
            let t1 = new Promise(resolve => {
                setTimeout(() => {
                    assert.equal(scheduleCount, 2);
                    resolve();
                }, 1200);
            });
            queue.push([1, 2, 3]);
            t1.then(() => {
                queue.destory();
                done();
            });
        });

        it('不同时间刻度的调度', function(done) {
            this.timeout(3000);
            // 每2s执行一个任务
            let queue = new Bobolink({
                scheduleMode: constants.SCHEDULE_MODE_FREQUENCY,
                countPerTimeScale: 1,
                timeScale: 2
            });
            queue.push([1, 2]).then(ts => {
                assert.equal(ts.res.length, 2);
                // 第二个任务被取消
                assert.equal(ts.res[1].err, constants.DISCARD);
                assert.equal(ts.res[0].err, undefined);
                assert.equal(ts.res[0].res, undefined);
            });
            setTimeout(() => {
                // 销毁 队列
                queue.destory();
                setTimeout(done, 0);
            }, 2000);
        });

        it('按频率每次调度所有任务', function(done) {
            this.timeout(3000);
            // 每2s执行所有任务
            let queue = new Bobolink({
                scheduleMode: constants.SCHEDULE_MODE_FREQUENCY,
                countPerTimeScale: -1,
                timeScale: 2,
                handler: data => {
                    return Promise.resolve(data * 2);
                }
            });
            queue.push([1, 2]).then(ts => {
                assert.equal(ts.res.length, 2);
                assert.equal(ts.res[0].err, undefined);
                assert.equal(ts.res[0].res, 2);
                assert.equal(ts.res[1].err, undefined);
                assert.equal(ts.res[1].res, 4);
            });
            setTimeout(() => {
                // 销毁 队列
                queue.destory();
                setTimeout(done, 0);
            }, 2000);
        });

    });

});