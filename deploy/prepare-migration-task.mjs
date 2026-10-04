import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function prepareMigrationTask(description, taskDefinition) {
  if (description.failures?.length || description.services?.length !== 1) {
    throw new Error("Cannot resolve the existing ECS service.");
  }
  const service = description.services[0];
  const network = service.networkConfiguration?.awsvpcConfiguration;
  if (service.status !== "ACTIVE" || !network?.subnets?.length || !network.securityGroups?.length
      || !network.subnets.every(value => /^subnet-[a-f0-9]+$/.test(value))
      || !network.securityGroups.every(value => /^sg-[a-f0-9]+$/.test(value))
      || !["ENABLED", "DISABLED"].includes(network.assignPublicIp)) {
    throw new Error("The ECS service must provide valid active awsvpc networking.");
  }
  const container = taskDefinition.containerDefinitions?.find(item => item.name === "api-server");
  if (!container || container.dependsOn?.length
      || !/^[a-zA-Z0-9_-]{1,245}$/.test(taskDefinition.family ?? "")
      || taskDefinition.networkMode !== "awsvpc"
      || !taskDefinition.requiresCompatibilities?.includes("FARGATE")) {
    throw new Error("Cannot create an independent Fargate API migration task.");
  }
  const migrationTask = structuredClone(taskDefinition);
  migrationTask.family += "-migration";
  // Only the API image runs. No ALB registration, API health check, or sidecars.
  migrationTask.containerDefinitions = [structuredClone(container)];
  migrationTask.containerDefinitions[0].essential = true;
  migrationTask.containerDefinitions[0].command = ["node", "load-secrets.mjs", "--migrate"];
  delete migrationTask.containerDefinitions[0].healthCheck;
  return {
    taskDefinition: migrationTask,
    subnets: network.subnets.join(","),
    securityGroups: network.securityGroups.join(","),
    assignPublicIp: network.assignPublicIp,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [serviceFile, renderedFile, outputFile] = process.argv.slice(2);
    if (!serviceFile || !renderedFile || !outputFile) throw new Error("Missing task preparation paths.");
    const result = prepareMigrationTask(
      JSON.parse(await readFile(serviceFile, "utf8")),
      JSON.parse(await readFile(renderedFile, "utf8")),
    );
    await writeFile(outputFile, JSON.stringify(result.taskDefinition));
    // Only non-secret networking outputs; never print the task's environment.
    process.stdout.write(`subnets=${result.subnets}\nsecurity-groups=${result.securityGroups}\nassign-public-ip=${result.assignPublicIp}\n`);
  } catch {
    process.stderr.write("Migration task preparation failed; check ECS service networking and task definition.\n");
    process.exitCode = 1;
  }
}