import * as request from "request";

export const http = (options): Promise<any> => {
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (err) reject(err);

      resolve(res);
    });
  });
};
