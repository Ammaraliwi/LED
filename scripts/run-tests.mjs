import { spawnSync } from "node:child_process";

function run(file) {
  const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "--conditions=react-server", "--test", file], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("src/test.ts");
if (process.env.RUN_INTEGRATION_TESTS === "true") run("src/lib/booking/booking-service.integration.test.ts");
