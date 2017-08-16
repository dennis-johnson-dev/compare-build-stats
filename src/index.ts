require("source-map-support").install();
import * as chalk from "chalk";

import { createApp } from "./app";

const port = process.env.PORT || 1337;
const app = createApp();

app.listen(port, () => {
  console.log(chalk.cyan(`app is listening on port ${port}`));
});
