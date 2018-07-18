const Bobolink = require('../index');
const assert = require('assert');

describe('集成测试', function () {

  describe('测试立即调度模式', function () {
    let q = new Bobolink();

    it('更改超时时间为200ms, 失败重试1次', function () {
      q.setOptions({
        timeout: 200,
        retry: 1
      });
      assert.equal(q.options.timeout, 200);
      assert.equal(q.options.retry, 1);
    });

    it('测试一个简单任务的执行情况', function () {
      let name = '张三';
      q.put(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            name = '李四';
            resolve('success');
          }, 5);
        });
      }).then(tr => {
        assert.equal(name, '李四');
        assert.equal(tr.err, undefined);
        assert.equal(tr.res, 'success');
        assert.equal(tr.retry, 0);
        done();
      });
    });

    it('测试一个超时任务的执行情况', function (done) {
      let name = '张三';
      q.put(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            name = '李四';
            resolve('success');
          }, 300);
        });
      }).then(tr => {
        assert.equal(name, '李四');
        assert.equal(tr.err, 'bobolink_timeout');
        assert.equal(tr.res, null);
        assert.equal(tr.retry, 1);
        done();
      });
    });

  });

});