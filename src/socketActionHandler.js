const AWS = require('aws-sdk');
const common = require('commensal-common');
const moment = require('moment');
const MatchDB = require('./database/matchdb');

AWS.config.update({ region: process.env.REGION });

module.exports = class SocketActionHandler {
  constructor(event) {
    this.event = event;
    this.db = new MatchDB();
    this.apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
    });
  }

  async typing() {
    const data = JSON.parse(this.event.body);
    const { matchId, id } = data;
    const match = await this.getMatch(matchId);
    const { participants } = match.Items[0].attrs;

    if (!participants.includes(id)) {
      throw new common.errors.HttpError(`id ${id} unauthorized to send event`, 401);
    }
    participants.splice(participants.indexOf(id), 1);
    const targetConnectionId = match.Items[0].attrs.connectionIds[participants[0]];

    if (targetConnectionId === 'disconnected') {
      return this.generateResponse(204, 'Target user not connected');
    }
    const socketParams = { ConnectionId: targetConnectionId, Data: '$typing' };

    await this.postToSocket(socketParams, participants[0], matchId);
    return this.generateResponse(200, 'typing event sent');
  }

  async sendMessage() {
    const data = JSON.parse(this.event.body);
    const { matchId, id, message } = data;
    const match = await this.getMatch(matchId);
    const { participants } = match.Items[0].attrs;

    if (!participants.includes(id)) {
      throw new common.errors.HttpError(`id ${id} unauthorized to send event`, 401);
    }
    participants.splice(participants.indexOf(id), 1);
    const messageParams = { from: id, message, sent_date: moment().unix() + '', to: participants[0] };
    const targetConnectionId = match.Items[0].attrs.connectionIds[participants[0]];

    if (targetConnectionId === 'disconnected') {
      await this.updateMessages(matchId, messageParams);
      return this.generateResponse(204, 'Target user not connected');
    }
    const socketParams = { ConnectionId: targetConnectionId, Data: message };

    await this.postToSocket(socketParams, participants[0], matchId);
    await this.updateMessages(matchId, messageParams);
    return this.generateResponse(200, 'message sent');
  }

  async getMatch(matchId) {
    const match = await this.db.getById(matchId);
    if (match && match.Count < 1) {
      throw new common.errors.HttpError('Match not found', 404);
    }
    return match;
  }

  async postToSocket(params, targetId, matchId) {
    try {
      await this.apigwManagementApi.postToConnection(params).promise();
      return this.generateResponse(200, 'data sent');
    } catch (e) {
      if (e.statusCode === 410) {
        return await this.updateConnectionId({
          id: targetId,
          connectionId: 'disconnected',
          matchId,
        });
      }
      throw new common.errors.HttpError('Error posting to socket', 500);
    }
  }

  async updateConnectionId(params) {
    return this.db.setConnectionId(params);
  }

  async updateMessages(matchId, params) {
    return this.db.updateMessages(matchId, params);
  }

  generateResponse(statusCode, data) {
    const response = {
      statusCode,
      body: JSON.stringify(data),
    };
    return response;
  }
};
