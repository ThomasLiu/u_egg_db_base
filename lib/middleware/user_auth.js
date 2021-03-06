'use strict';

const moment = require('moment');

module.exports = () => {
  return async function(ctx, next) {
    let token = '',
      user;
    if (
      ctx.headers.authorization && ctx.headers.authorization.split(' ')[0] === 'UTOKEN'
    ) {
      token = ctx.headers.authorization.split(' ')[1];
    } else if (ctx.query.accesstoken) {
      token = ctx.query.accesstoken;
      delete ctx.query.accesstoken;
    } else if (ctx.request.body.accesstoken) {
      token = ctx.request.body.accesstoken;
      delete ctx.request.body.accesstoken;
    }
    let key
    const { service, app } = ctx;
    const { cache, actionToken, user: userService } = service;
    if (token) {

      const data = await actionToken.verify(token, app.config.userSessionSecret);
      if (data && data._id) {
        key = `user_session_${data._id}`;
        user = await cache.get(key);
      }
    }

    if (!user) {
      return await next();
    }

    ctx.request.user = user;
    ctx.request.token = token;


    let { lastAt } = user;
    if (!moment().isSame(lastAt, 'day') ) {
      lastAt = moment().format('YYYY-MM-DD hh:mm:ss');
      await userService.put({ lastAt }, user.id)
      user.lastAt = lastAt
    }
    const oneWeek = 60 * 60 * 24 * 7;
    await cache.set(key, user, oneWeek);

    
    await next();
  };
};
