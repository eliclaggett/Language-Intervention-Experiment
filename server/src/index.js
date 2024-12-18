/*
 * Filename: index.js
 * Author: Elijah Claggett
 *
 * Description:
 * This JavaScript file serves as a basic configuration script for the backend of the Empirica experiment
 */

// Imports
import { AdminContext } from "@empirica/core/admin";
import {
  Classic,
  classicKinds,
  ClassicLoader,
  Lobby,
} from "@empirica/core/admin/classic";
import { info, setLogLevel } from "@empirica/core/console";
import minimist from "minimist";
import process from "process";
import { Empirica } from "./callbacks";
import * as fs from "fs";
import dotenv from "dotenv";
import findConfig from "find-config";

// Load .env variables
const argv = minimist(process.argv.slice(2), { string: ["token"] });

let dotEnvPath = null;
if (fs.existsSync("/home/ubuntu/eli")) {
  dotEnvPath = findConfig(".env", {
    cwd: "/home/ubuntu/eli/experiment/chat-cooperation",
  });
} else if (fs.existsSync("/Users/eclagget/Code/experiment/chat-cooperation")) {
  dotEnvPath = findConfig(".env", {
    cwd: "/Users/eclagget/Code/experiment/chat-cooperation",
  });
}

if (dotEnvPath) {
  console.log("Loading dotenv file!");
  const envFile = dotenv.parse(fs.readFileSync(dotEnvPath));
  for (const key of Object.keys(envFile)) {
    process.env[key] = envFile[key];
  }
} else {
  console.log("Warning: No dotenv file!");
}

// Define the websocket URL
const websocketURL =
  process.env["DEPLOYMENT"] == "prod"
    ? "http://localhost:" + process.env["PORT_EMPIRICA"] + "/query"
    : "http://localhost:" + process.env["PORT_EMPIRICA"] + "/query";

console.log("Websocket URL: " + websocketURL);

// Set the log level
setLogLevel(argv["loglevel"] || "info");

// Run the backend
(async () => {
  const ctx = await AdminContext.init(
    argv["url"] || websocketURL,
    argv["sessionTokenPath"],
    "callbacks",
    argv["token"],
    {},
    classicKinds
  );

  ctx.register(ClassicLoader);
  ctx.register(Classic());
  ctx.register(Lobby());
  ctx.register(Empirica);
  ctx.register(function (_) {
    _.on("ready", function () {
      info("server: started");
    });
  });
})();

process.on("unhandledRejection", function (reason, p) {
  process.exitCode = 1;
  console.error("Unhandled Promise Rejection. Reason: ", reason);
});
