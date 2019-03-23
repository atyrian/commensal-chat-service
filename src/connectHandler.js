const MDB = require('./database/matchdb');

module.exports = class ConnectHandler {
  static connect(event, callback) {
    const params = {
      id: event.queryStringParameters.id,
      connectionId: event.requestContext.connectionId,
      matchId: event.headers['match-id'],
    };

    const matchDB = new MDB();

    matchDB.setConnectionId(params)
      .then((res) => {
        callback(null, {
          statusCode: res.resp instanceof Error ? 500 : 200,
          body: res.resp instanceof Error ? 'Failed to connect: ' : 'Connected',
        });
      });
  }

  static disconnect(event, callback) {
    callback(null, {
      statusCode: 200,
      body: 'Disconnected.',
    });
  }
};
