import * as bodyParser from "koa-bodyparser";
import * as koa from "koa";
import * as Router from "koa-router";

import { handleAddStatsComment, handleStatus } from "./handlers";
import { createEncryptedToken, getInstallationAccessToken } from "./middleware";

export const createApp = () => {
  const app: koa = new koa();
  const router: Router = new Router();

  app.use(bodyParser());

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = err.message;
    }
  });

  router.get("/status-check", async (ctx, next) => {
    ctx.body = "it's up";
    ctx.status = 200;
  });

  router.post(
    "/incoming-hook",
    createEncryptedToken,
    getInstallationAccessToken,
    async (ctx: koa.Context, next) => {
      if (ctx.headers["x-github-event"] === "status") {
        return await handleStatus(ctx);
      }

      if (
        ctx.headers["x-github-event"] === "pull_request" &&
        ctx.request.body.action === "labeled" &&
        ctx.request.body.label.name === process.env.LABEL_NAME
      ) {
        await handleAddStatsComment(ctx);

        ctx.body = "it's up";
        ctx.status = 200;
      }

      /*
        make entrypoint dynamic :(
      */
    }
  );

  app.use(router.routes());

  return app;
};
