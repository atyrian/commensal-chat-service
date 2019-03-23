const common = require('commensal-common');
const Joi = require('joi');
const dynogels = require('dynogels');

dynogels.AWS.config.update({ region: process.env.REGION });

module.exports = class MatchDb {
  constructor() {
    this.db = dynogels.define('Match', {
      hashKey: 'match_id',
      timestamps: true,
      schema: {
        match_id: Joi.string(),
        messages: Joi.array(),
        participants: dynogels.types.stringSet(),
        connectionIds: {},
      },
      tableName: process.env.TABLE_NAME,
    });
  }

  setConnectionId(data) {
    const { id: userId, connectionId, matchId } = data;
    const params = {};
    params.UpdateExpression = 'SET connectionIds.#id = :value';
    params.ExpressionAttributeNames = {
      '#id': userId,
    };
    params.ExpressionAttributeValues = {
      ':value': connectionId,
    };
    return new Promise(resolve => this.db.update({ match_id: matchId }, params,
      (err, resp) => resolve({ resp: err ? err : resp })));
  }

  getById(matchId) {
    return new Promise((resolve, reject) => {
      this.db.query(matchId)
        .exec((err, resp) => {
          if (err) reject(err);
          else {
            resolve(resp);
          }
        });
    });
  }

  updateMessages(matchId, data) {
    const params = {};
    params.UpdateExpression = 'SET #M = list_append(#M,:value)';
    params.ExpressionAttributeNames = {
      '#M': 'messages',
    };
    params.ExpressionAttributeValues = {
      ':value': [data],
    };

    return new Promise((resolve, reject) => {
      this.db.update({ match_id: matchId }, params, (err) => {
        if (err) {
          return reject(new common.errors.HttpError('Error updating messages', 500));
        }
        return resolve(`Messages for ${matchId} updated`);
      });
    });
  }
};
