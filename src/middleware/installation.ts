import { http } from "../helpers";

export const getInstallationAccessToken = async (ctx, next) => {
  const id = ctx.request.body.installation.id;
  const res: any = await http({
    headers: {
      Accept: "application/vnd.github.machine-man-preview+json",
      Authorization: `bearer ${ctx.state.token}`,
      "User-Agent": "compare-build-size"
    },
    method: "POST",
    json: true,
    url: `https://api.github.com/installations/${id}/access_tokens`
  });

  ctx.state.ghAccessToken = res.body.token;

  await next();
};
