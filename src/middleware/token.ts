import * as jwt from "jsonwebtoken";
import * as moment from "moment";

const encryptToken = () => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        iat: moment().unix(),
        exp: moment().add(6, "minutes").unix(),
        iss: process.env.INTEGRATION_ID
      },
      process.env.PRIVATE_KEY,
      {
        algorithm: "RS256"
      },
      (err, token) => {
        if (err) reject(err);
        resolve(token);
      }
    );
  });
};

export const createEncryptedToken = async (ctx, next) => {
  ctx.state.token = await encryptToken();

  await next();
};
