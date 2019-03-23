const common = require('commensal-common');

const ConnectHandler = require('./src/connectHandler');
const SocketActionHandler = require('./src/socketActionHandler');

module.exports.defaultHandler = (event) => { };

module.exports.connectHandler = (event, context, callback) => {
  ConnectHandler.connect(event, callback);
};

module.exports.disconnectHandler = (event, context, callback) => {
  ConnectHandler.disconnect(event, callback);
};

module.exports.typingHandler = common.aws.lambdaWrapper((event) => {
  const actionHandler = new SocketActionHandler(event);
  return actionHandler.typing();
});

module.exports.messageHandler = common.aws.lambdaWrapper((event) => {
  const actionHandler = new SocketActionHandler(event);
  return actionHandler.sendMessage();
});

module.exports.userRequestAuthorizer = common.aws.lambdaWrapper(
  (event) => {
    const authorizer = new common.aws.UserRequestAuthorizer(event);
    return authorizer.authorize();
  },
);
