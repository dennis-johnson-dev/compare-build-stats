import { Context } from "koa";

import { getArtifactList, getArtifact, http } from "../helpers";

export const handleAddStatsComment = async (ctx: Context) => {
  const pr = ctx.request.body.pull_request;

  const headArtifacts = await getArtifactList({
    owner: pr.head.user.login,
    repo: pr.head.repo.name,
    branch: pr.head.ref
  });

  // find specific build stats artifact among artifacts

  const headRecords = await getArtifact({
    branch: pr.base.ref,
    url: headArtifacts[0].url
  });

  const baseArtifacts = await getArtifactList({
    owner: pr.base.user.login,
    repo: pr.base.repo.name,
    branch: pr.base.ref
  });

  // find specific build stats artifact among artifacts

  const baseRecords = await getArtifact({
    branch: pr.base.ref,
    url: baseArtifacts[0].url
  });

  const comment = buildComment(
    baseRecords,
    headRecords,
    pr.base.ref,
    pr.head.ref
  );

  await http({
    json: { body: comment },
    headers: {
      Accept: "application/vnd.github.machine-man-preview+json",
      Authorization: `token ${ctx.state.ghAccessToken}`,
      "User-Agent": "compare-build-size"
    },
    method: "POST",
    url: `https://api.github.com/repos/songawee/test/issues/${ctx.request.body
      .number}/comments`
  });
};

function buildComment(base, head, baseBranch, headBranch) {
  const baseEntrypoints = getEntrypointOutput(base.entrypoints);
  const headEntrypoints = getEntrypointOutput(head.entrypoints);

  return `
  ## Entrypoints

  ### Total Size by entrypoint

  ${getEntryTotalsRow(baseBranch, headBranch, baseEntrypoints, headEntrypoints)}

  ## File size by chunk name
  
  ${getChunkSizes(base, head, baseBranch, headBranch)}

  ## File size by entrypoint

  ### ${baseBranch}

  ${getEntryFilesRow(base.entrypoints)}

  ### ${headBranch}

  ${getEntryFilesRow(head.entrypoints)}

  ## Total Modules
  | ${baseBranch} | ${headBranch} | Diff |
  | ------------- | ------------- | ---- |
  | ${formatBytes(base.totalModules)} | ${formatBytes(
    head.totalModules
  )} | ${getDiff(head.totalModules, base.totalModules)} |

  ## Build Time
  | ${baseBranch} | ${headBranch} | Diff |
  | ------------- | ------------- | ---- |
  | ${formatBytes(base.buildTime)} ms | ${formatBytes(
    head.buildTime
  )} ms | ${getDiff(head.buildTime, base.buildTime)} ms |
  `;
}

function getEntrypoint(entrypoint, data) {
  return {
    entryName: entrypoint,
    total: getFileTotal(data.files)
  };
}

function getEntrypointOutput(entrypoints) {
  return Object.keys(entrypoints).map(entrypoint => {
    return getEntrypoint(entrypoint, entrypoints[entrypoint]);
  });
}

function getEntryFilesRow(entryPoints) {
  let output = "";

  Object.keys(entryPoints).forEach(baseEntry => {
    let fileOutput = "";
    entryPoints[baseEntry].files.forEach(file => {
      fileOutput += `| ${file.fileName} | ${formatBytes(file.size)} bytes |\n`;
    });

    output += `
#### Entrypoint name: ${baseEntry}
| Filename | Size |
| --- | --- |
${fileOutput}
    `;
  });

  return output;
}

function getChunkSizes(base, head, baseBranch, headBranch) {
  let output = `| Chunk Name | ${baseBranch} | ${headBranch} | diff |
| --- | --- | --- | --- |`;

  const allAssets = base.assets.concat(head.assets);

  const files = Object.keys(head.assetsByChunkName).reduce((acc, val) => {
    let baseFiles;
    if (base.assetsByChunkName[val]) {
      baseFiles = base.assetsByChunkName[val].reduce((acc, file) => {
        return (
          acc + allAssets.find(rawAsset => rawAsset.fileName === file).size
        );
      }, 0);
    }

    if (baseFiles) {
      acc.push({
        chunkName: val,
        base: baseFiles,
        head: head.assetsByChunkName[val].reduce((acc, file) => {
          return (
            acc + allAssets.find(rawAsset => rawAsset.fileName === file).size
          );
        }, 0)
      });
    } else {
      acc.push({
        chunkName: val,
        base: 0,
        head: head.assetsByChunkName[val].reduce((acc, file) => {
          return (
            acc + allAssets.find(rawAsset => rawAsset.fileName === file).size
          );
        }, 0)
      });
    }
    return acc;
  }, []);

  files.forEach(file => {
    output += `
| ${file.chunkName} | ${formatBytes(file.base)} bytes | ${formatBytes(
      file.head
    )} bytes | ${getDiff(file.head, file.base)} bytes |`;
  });

  return output;
}

function getEntryTotalsRow(
  baseName,
  branchName,
  baseEntrypoints,
  headEntrypoints
) {
  let output = `| Name | ${baseName} Size | ${branchName} Size | Diff |
| --- | --- | --- | --- |
  `;
  baseEntrypoints.forEach(entry => {
    let headEntrypoint;
    const headIndex = headEntrypoints.findIndex(headEntry => {
      return entry.entryName === headEntry.entryName;
    });

    if (headIndex !== -1) {
      headEntrypoint = headEntrypoints[headIndex];
      headEntrypoints.splice(headIndex, 1);
    }

    output += `| ${entry.entryName} | ${formatBytes(
      entry.total
    )} bytes | ${formatBytes(headEntrypoint.total)} bytes | ${getDiff(
      headEntrypoint.total,
      entry.total
    )} bytes |
`;
  });

  /*
    what if HEAD has more entrypoints?
  */

  return output;
}

function formatBytes(num) {
  return Number(num).toLocaleString(undefined, { useGrouping: true });
}

function getDiff(head, base) {
  const diff = head - base;
  const prefix = diff > 0 ? "+" : "";
  return `${prefix}${formatBytes(diff)}`;
}

function getFileTotal(files) {
  const masterMinTotal = files.reduce((sum, val) => {
    return sum + val.size;
  }, 0);

  return masterMinTotal;
}
