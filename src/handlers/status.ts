import { Context } from "koa";

import { http } from "../helpers";

export const handleStatus = async (ctx: Context) => {
  const status = ctx.request.body;
  const branches = status.branches;
  const labelName = process.env.LABEL_NAME;
  const token = ctx.state.ghAccessToken;

  if (status.state !== "success") {
    return;
  }

  const res = await http({
    json: true,
    headers: {
      Accept: "application/vnd.github.machine-man-preview+json",
      Authorization: `token ${ctx.state.ghAccessToken}`,
      "User-Agent": "compare-build-size"
    },
    method: "GET",
    url: `https://api.github.com/repos/${status.name}/labels/${labelName}`
  });

  if (res.statusCode === 404) {
    await createLabel(labelName, status.name, token);
  }

  const prs = await findPrsForStatus(
    branches,
    status.name,
    token,
    status.repository.owner.login
  );

  for (let pr of prs) {
    try {
      await addLabelToPr(pr, token, labelName, status.name);
    } catch (err) {
      console.log(
        `error add label to pr, ${pr.number} in repo ${status.name}`,
        err
      );
    }
  }

  ctx.body = "Added label to pr";
  ctx.status = 200;
};

async function addLabelToPr(pr, token, label, repo) {
  const res = await http({
    json: true,
    headers: {
      Accept: "application/vnd.github.machine-man-preview+json",
      Authorization: `token ${token}`,
      "User-Agent": "compare-build-size"
    },
    method: "GET",
    url: `${pr.issue_url}/labels`
  });

  const existingLabel = res.body.find(existingLabel => {
    return existingLabel.name === label;
  });

  if (existingLabel) {
    return;
  }

  await http({
    json: [label],
    headers: {
      Accept: "application/vnd.github.machine-man-preview+json",
      Authorization: `token ${token}`,
      "User-Agent": "compare-build-size"
    },
    method: "POST",
    url: `${pr.issue_url}/labels`
  });
}

async function findPrsForStatus(branches, repo, token, owner) {
  let prs = [];

  for (let branch of branches) {
    try {
      const res = await http({
        json: true,
        qs: {
          head: `${owner}:${branch.name}`,
          state: "open"
        },
        headers: {
          Accept: "application/vnd.github.machine-man-preview+json",
          Authorization: `token ${token}`,
          "User-Agent": "compare-build-size"
        },
        method: "GET",
        url: `https://api.github.com/repos/${repo}/pulls`
      });

      prs.push(...res.body);
    } catch (err) {
      console.log(err);
    }
  }

  return prs;
}

async function createLabel(label, repo, token) {
  const res = await http({
    json: {
      name: label,
      color: "0d77ff"
    },
    headers: {
      Accept: "application/vnd.github.machine-man-preview+json",
      Authorization: `token ${token}`,
      "User-Agent": "compare-build-size"
    },
    method: "POST",
    url: `https://api.github.com/repos/${repo}/labels`
  });

  if (res.statusCode !== 201) {
    throw new Error("unable to create perf label");
  }
}
