const assert = require('node:assert/strict');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createConnectionMock() {
  return {
    beginTransactionCalled: false,
    commitCalled: false,
    rollbackCalled: false,
    releaseCalled: false,
    async beginTransaction() {
      this.beginTransactionCalled = true;
    },
    async commit() {
      this.commitCalled = true;
    },
    async rollback() {
      this.rollbackCalled = true;
    },
    release() {
      this.releaseCalled = true;
    }
  };
}

function assertJson(response, statusCode, expectedBody) {
  assert.equal(response.statusCode, statusCode);
  assert.deepEqual(response.body, expectedBody);
}

module.exports = {
  assertJson,
  createConnectionMock,
  createResponse
};
