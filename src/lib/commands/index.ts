import { runLl } from "./ll";
import { runCd } from "./cd";
import { runPwd } from "./pwd";
import { runCat } from "./cat";
import { runTimeline } from "./timeline";
import { runGrep } from "./grep";
import { runHelp } from "./help";
import { runClear } from "./clear";
import { runAbout } from "./about";
import { runVi } from "./vi";
import { runExitFullscreen, runFullscreen } from "./fullscreen";
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
  tl: runTimeline,
  grep: runGrep,
  clear: runClear,
  about: runAbout,
  vi: runVi,
  vim: runVi,
  fullscreen: runFullscreen,
  fs: runFullscreen,
  "exit-fullscreen": runExitFullscreen,
};

export const COMMAND_NAMES = Object.keys(COMMANDS);
