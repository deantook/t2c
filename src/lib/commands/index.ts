import { runLl } from "./ll";
import { runCd } from "./cd";
import { runPwd } from "./pwd";
import { runCat } from "./cat";
import { runTimeline } from "./timeline";
import { runGrep } from "./grep";
import { runHelp } from "./help";
import { runClear } from "./clear";
import { runAbout } from "./about";
import type { CommandContext, CommandResult, TerminalState } from "../types";

type Handler = (state: TerminalState, args: string[], ctx: CommandContext) => CommandResult;

export const COMMANDS: Record<string, Handler> = {
  help: runHelp,
  ll: runLl,
  ls: runLl,
  cd: runCd,
  pwd: runPwd,
  cat: runCat,
  timeline: runTimeline,
  grep: runGrep,
  clear: runClear,
  about: runAbout,
};

export const COMMAND_NAMES = Object.keys(COMMANDS);
