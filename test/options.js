const assert = require('assert');
const Option = require('../lib/options');
const constants = require('../lib/constants');

describe('测试配置', () => {

    it('默认配置', () => {
        let option = new Option();
        assert.equal(option.concurrency, 5);
        assert.equal(option.timeout, 15000);
        assert.equal(option.retry, 0);
        assert.equal(option.retryPrior, false);
        assert.equal(option.newPrior, false);
        assert.equal(option.catch, null);
        assert.equal(option.max, 2 << 15);
        assert.equal(option.scheduleMode, constants.SCHEDULE_MODE_IMMEDIATELY);
        assert.equal(option.countPerSecond, 100);
        assert.equal(option.saturationPolicy, constants.SATURATION_POLICY_ABORT);
    });

    it('初始化全部有效配置', () => {
        let catchFunc = () => {};
        let option = new Option({
            concurrency: 10,
            timeout: 5,
            retry: 10,
            retryPrior: true,
            newPrior: true,
            catch: catchFunc,
            max: 2 << 4,
            scheduleMode: constants.SCHEDULE_MODE_FREQUENCY,
            countPerSecond: 500,
            saturationPolicy: constants.SATURATION_POLICY_DISCARD_OLDEST
        });
        assert.equal(option.concurrency, 10);
        assert.equal(option.timeout, 5);
        assert.equal(option.retry, 10);
        assert.equal(option.retryPrior, true);
        assert.equal(option.newPrior, true);
        assert.equal(option.catch, catchFunc);
        assert.equal(option.max, 2 << 4);
        assert.equal(option.scheduleMode, constants.SCHEDULE_MODE_FREQUENCY);
        assert.equal(option.countPerSecond, 500);
        assert.equal(option.saturationPolicy, constants.SATURATION_POLICY_DISCARD_OLDEST);
    });

    it('初始化无效配置', () => {
        let option = new Option({
            concurrency: 'any',
            timeout: 'any',
            retry: 'any',
            retryPrior: 'any',
            newPrior: 'any',
            catch: 'any',
            max: 'any',
            scheduleMode: 'any',
            countPerSecond: 'any',
            saturationPolicy: 'any'
        });
        assert.equal(option.concurrency, 5);
        assert.equal(option.timeout, 15000);
        assert.equal(option.retry, 0);
        assert.equal(option.retryPrior, false);
        assert.equal(option.newPrior, false);
        assert.equal(option.catch, null);
        assert.equal(option.max, 2 << 15);
        assert.equal(option.scheduleMode, constants.SCHEDULE_MODE_IMMEDIATELY);
        assert.equal(option.countPerSecond, 100);
        assert.equal(option.saturationPolicy, constants.SATURATION_POLICY_ABORT);
    });

    it('更新配置', () => {
        let option = new Option({
            concurrency: 20
        });
        // 只更新一项，其余配置应该保持
        option.update({
            timeout: 50
        });
        assert.equal(option.concurrency, 20);
        assert.equal(option.timeout, 50);
        assert.equal(option.retry, 0);
        assert.equal(option.retryPrior, false);
        assert.equal(option.newPrior, false);
        assert.equal(option.catch, null);
        assert.equal(option.max, 2 << 15);
        assert.equal(option.scheduleMode, constants.SCHEDULE_MODE_IMMEDIATELY);
        assert.equal(option.countPerSecond, 100);
        assert.equal(option.saturationPolicy, constants.SATURATION_POLICY_ABORT);
        // 测试全部配置更新时是否正确反应
        let catchFunc = () => {};
        option.update({
            concurrency: 10,
            timeout: 5,
            retry: 10,
            retryPrior: true,
            newPrior: true,
            catch: catchFunc,
            max: 2 << 4,
            scheduleMode: constants.SCHEDULE_MODE_FREQUENCY,
            countPerSecond: 500,
            saturationPolicy: constants.SATURATION_POLICY_DISCARD_OLDEST
        });
        assert.equal(option.concurrency, 10);
        assert.equal(option.timeout, 5);
        assert.equal(option.retry, 10);
        assert.equal(option.retryPrior, true);
        assert.equal(option.newPrior, true);
        assert.equal(option.catch, catchFunc);
        assert.equal(option.max, 2 << 4);
        // 不可变更的配置
        assert.equal(option.scheduleMode, constants.SCHEDULE_MODE_IMMEDIATELY);
        assert.equal(option.countPerSecond, 500);
        assert.equal(option.saturationPolicy, constants.SATURATION_POLICY_DISCARD_OLDEST);
    });

});