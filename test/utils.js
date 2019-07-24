const assert = require('assert').strict;
const utils = require('../lib/utils');
const constants = require('../lib/constants');

describe('工具方法测试', () => {

    it('获取值或默认值', () => {
        assert.equal(utils.getOrDefault(undefined, 'string', true, 5), 5);
        assert.equal(utils.getOrDefault('10', 'string', true, 5), '10');
        assert.equal(utils.getOrDefault(10, 'string', true, 5), 5);
        assert.equal(utils.getOrDefault('10', 'string', false, 5), 5);
    });

    it('延时异常', done => {
        let start = Date.now();
        utils.delayPromise(5).catch(err => {
            // 延时时间不超过5ms，考虑本身的回调延时
            let delayTime = Math.abs(Date.now() - start - 5);
            assert.ok(delayTime <= 5);
            assert.equal(err, constants.TIMEOUT_FLAG);
            done();
        });
    });

    it('求最大公约数', () => {
        assert.equal(utils.getGCD(5, 2), 1);
        assert.equal(utils.getGCD(50, 20), 10);
        assert.equal(utils.getGCD(25, 5), 5);
        assert.equal(utils.getGCD(99, 66), 33);
    });

    it('生成唯一ID', () => {
        assert.notEqual(utils.genId(), utils.genId());
    });

});