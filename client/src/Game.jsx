/*
 * Filename: Game.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file wraps the timed experiment steps for this study
 */

// Imports
import React from "react";
import Typography from "@mui/joy/Typography";
import End from "./semisync/End.jsx";
import {
  usePlayer,
  useStage,
  useStageTimer,
} from "@empirica/core/player/classic/react";
import SemiSynchronousSteps from "./SemiSynchronousSteps.jsx";

export default function Game() {
  const stage = useStage();
  const player = usePlayer();

  // UI
  if (player.get("end")) {
    return <End />;
  }

  switch (stage.get("name")) {
    case "semi_asynchronous_steps":
      return <SemiSynchronousSteps />;
    default:
      return <Typography level="h2">Loading...</Typography>;
  }
}
