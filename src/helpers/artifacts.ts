import { http } from "./";

interface IArtifactListReq {
  owner: string;
  repo: string;
  branch: string;
}

interface IArtifactReq {
  branch: string;
  url: string;
}

export const getArtifactList = async ({
  owner,
  repo,
  branch
}: IArtifactListReq) => {
  const { body: masterArtifacts } = await http({
    json: true,
    qs: {
      "circle-token": process.env.CIRCLE_TOKEN,
      branch
    },
    url: `https://circleci.com/api/v1.1/project/github/${owner}/${repo}/latest/artifacts`
  });

  return masterArtifacts;
};

export const getArtifact = async ({ branch, url }: IArtifactReq) => {
  const { body: artifact } = await http({
    json: true,
    qs: {
      "circle-token": process.env.CIRCLE_TOKEN,
      branch
    },
    url
  });

  return artifact;
};
