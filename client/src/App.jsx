/*
 * Filename: App.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the main wrapper for the Empirica experiment frontend
 */
import { EmpiricaClassic } from "@empirica/core/player/classic";
import { EmpiricaContext } from "@empirica/core/player/classic/react";
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import { EmpiricaMenu, EmpiricaParticipant } from "@empirica/core/player/react";
import {
  usePlayers,
  useRound,
  useStage,
  useStageTimer
} from "@empirica/core/player/classic/react";
import React, { useEffect, useState } from "react";
import Recaptcha from './async/Recaptcha.jsx';
import ConsentForm from './async/ConsentForm.jsx';
import Tutorial from './async/Tutorial.jsx';
import OpinionSurvey from './async/OpinionSurvey.jsx';
import End from "./semisync/End.jsx";
import Problem from './semisync/Problem.jsx';
import Game from "./Game.jsx";
import Lobby from "./Lobby.jsx";
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { PlayerCreate } from "./PlayerCreate.jsx";
import { wsSend } from "./utils/utils.js";
import TimerMixin from 'react-timer-mixin';
import ChatEndAcknowledgement from "./semisync/ChatEndAcknowledgement.jsx";
import TaskInstructions from "./components/TaskInstructions.jsx";
import ReflectionSurvey from "./semisync/ReflectionSurvey.jsx";
import PartnerAnswer from "./semisync/PartnerAnswer.jsx";
import { Container, Stack, Typography } from "@mui/joy";

// Custom theme
const theme = extendTheme({
  fontFamily: {
    display: 'Poppins', // applies to `h1`–`h4`
    body: 'Poppins', // applies to `title-*` and `body-*`
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: '#C0CCD9',
          100: '#A5B8CF',
          200: '#6A96CA',
          300: '#4886D0',
          400: '#4886D0',
          500: '#665df5',
          600: '#584FD1',
          700: '#265995',
          800: '#2F4968',
          900: '#2F3C4C',
        },
      },
    },
  },
  typography: {
    'h3': {
      fontSize: '1.5rem'
    },
    'h4': {
      fontSize: '1rem'
    }
  }
});

export default function App() {


  console.log('app');

  const [connectedToNLP, setConnectedToNLP] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("participantKey") || "";
  
  const { protocol, host, href } = window.location;
  
  let url = `${protocol}//${host}/query`;
  if (window.location.hostname != 'localhost') {
    const regEx = new RegExp(`${host}/(\\d+)`);
    const port = href.match(regEx)[1];
    url = `${protocol}//${host}/${port}/query`;
  }
  function onboardingSteps({ game, player }) {
    return [
      // [Warning] Test only
      // ReflectionSurvey,
      // OpinionSurvey,

      // Real onboarding steps
      // Recaptcha,
      // ConsentForm,
      // Tutorial,
      // PreEvaluation, // No pre-evaluation
      OpinionSurvey,
    ];
  }
  
  function exitSteps({ game, player }) {
    return [End, Problem];
  }

  const [studyUI, setStudyUI] = useState(<EmpiricaContext playerCreate={PlayerCreate} introSteps={onboardingSteps} lobby={Lobby} exitSteps={exitSteps}> 
    <Game/>
  </EmpiricaContext>);

  const connectToNLP = () => {

    if (window.nlpServer && (window.nlpServer.readyState == WebSocket.OPEN || window.nlpServer.readyState == WebSocket.CONNECTING))
      return;

    // The server uses an encrypted connection when not being tested locally
    let nlpServerURL = (window.location.protocol === 'http:') ?
      'wss://slabbrdbrd.dev/9910' :
      'wss://' + window.location.hostname + '/' + '9910';

    if (window.location.href.indexOf('noAI') > 0) { nlpServerURL += '999'; }
    // Set server protocol
    window.nlpServer = new WebSocket(nlpServerURL);
    
    // Connect to server
    window.nlpServer.onopen = () => {
      console.log('Connection successfully established with Python server');
      setConnectedToNLP(true);
      
      // Occasionally ping the server to prevent the connection from closing
      window.nlpInterval = setInterval(() => {
        if (window.nlpServer instanceof WebSocket) {
          wsSend('{"command": "ping"}');
        } else {
          clearInterval(window.nlpInterval);
        }
      }, 20 * 1000);
    };
  
    // Automatically reconnect if the connection is lost
    window.nlpServer.onclose = () => {
      // TODO: PROD Uncomment
      TimerMixin.setTimeout(() => {
        connectToNLP();
      }, 1000);
    };    

    window.nlpServer.onerror = (ev) => {
      console.log('Failed to connect to Python server');
      setStudyUI(<Container sx={{
          width: '100vw',
          height: '100vh'
        }}>
              <Stack sx={{
                        maxWidth: {
                            md: '80rem'
                        },
                        mx: 'auto',
                        pb: '20vh',
                        textAlign: 'center',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                    }} gap={1} >
                      <Typography level='title-lg' fontSize='3em'>Oops...</Typography>
                      <Typography level='body-md' fontSize='1.5em'>The server is experiencing technical difficulties.<br/>Please return the study and contact us through Prolific.</Typography>
              </Stack>
        </Container>);
      
      // TODO: PROD Uncomment
      TimerMixin.setTimeout(() => {
        connectToNLP();
      }, 1000);
    }
  }

  // Setup connection with backend Python server for ML/NLP
  useEffect(() => {
    connectToNLP();
  }, []);

  // UI
  return (
    <EmpiricaParticipant url={url} ns={playerKey} modeFunc={EmpiricaClassic}>
    <div className="h-screen relative">
    <EmpiricaMenu position="bottom-left" />
    <div className="h-full overflow-auto">

    <CssVarsProvider theme={theme} defaultMode="light" modeStorageKey="joy-mode-scheme-light" disableTransitionOnChange>
    <CssBaseline />
      {studyUI}
    </CssVarsProvider>
    </div>
    </div>
    </EmpiricaParticipant>
    );
  }
  