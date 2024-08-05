import React, { useEffect } from 'react';
import { CssVarsProvider, useColorScheme } from '@mui/joy/styles';
import GlobalStyles from '@mui/joy/GlobalStyles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';
import { Button } from '@mui/joy';
import Checkbox from '@mui/joy/Checkbox';
import Divider from '@mui/joy/Divider';
import FormControl from '@mui/joy/FormControl';
import FormLabel, { formLabelClasses } from '@mui/joy/FormLabel';
// import IconButton, { IconButtonProps } from '@mui/joy/IconButton';
import Link from '@mui/joy/Link';
import Input from '@mui/joy/Input';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import End from './semisync/End.jsx';

import {
  usePlayer,
  usePlayers,
  useRound,
  useStage,
  useStageTimer
} from "@empirica/core/player/classic/react";
import Conversation from "./sync/Conversation.jsx";
// import Cooperate from "./semisync/Cooperation.jsx";
import ReflectionSurvey from "./semisync/ReflectionSurvey.jsx";
import PartnerAnswer from "./semisync/PartnerAnswer.jsx";
import SemiSynchronousSteps from "./SemiSynchronousSteps.jsx";


export default function Game() {

  const stage = useStage();
  const stageTimer = useStageTimer();
  const player = usePlayer();

  console.log('game');
  if (player.get('end')) {
    return <End/>;
  }

  switch (stage.get("name")) {
    // case "conversation":
    case 'semi_asynchronous_steps':
      return <SemiSynchronousSteps />;
    default:
      return (
        <Typography level="h2">Loading...</Typography>
      );
  }
}