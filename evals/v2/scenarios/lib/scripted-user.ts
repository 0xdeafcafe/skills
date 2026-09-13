import { AgentAdapter, AgentRole } from "@langwatch/scenario";

export class ScriptedUser extends AgentAdapter {
  override name = "scripted-user";
  override role = AgentRole.USER;
  override async call(): Promise<string> {
    throw new Error("This suite requires an explicit user message for every turn");
  }
}
