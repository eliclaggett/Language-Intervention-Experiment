/*
 * Filename: App.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the main wrapper for the Empirica experiment frontend
 */
import { EmpiricaClassic } from "@empirica/core/player/classic";
import { EmpiricaContext } from "@empirica/core/player/classic/react";
import { EmpiricaMenu, EmpiricaParticipant } from "@empirica/core/player/react";
import React, { useEffect } from "react";
import Recaptcha from './async/Recaptcha.jsx';
import ConsentForm from './async/ConsentForm.jsx';
import PreEvaluation from "./async/PreEvaluation.jsx";
import Tutorial from './async/Tutorial.jsx';
import OpinionSurvey from './async/OpinionSurvey.jsx';
// import Cooperation from './semisync/Cooperation.jsx';
import ReflectionSurvey from './semisync/ReflectionSurvey.jsx';
import Conversation from "./sync/Conversation.jsx";
import PartnerAnswer from "./semisync/PartnerAnswer.jsx";
import End from "./semisync/End.jsx";
import Problem from './semisync/Problem.jsx';
import Game from "./Game.jsx";
import Lobby from "./Lobby.jsx";
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
// import Cooperate from "./semisync/Cooperation.jsx";
import PublicGoodsGame from "./semisync/PublicGoods.jsx";
import { PlayerCreate } from "./PlayerCreate.jsx";

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
      fontSize: '1.15rem'
    }
  }
});

export default function App() {

  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("participantKey") || "";
  
  const { protocol, host, href } = window.location;
  
  let url = `${protocol}//${host}/query`;
  if (window.location.hostname != 'localhost') {
    const regEx = new RegExp(`${host}/(\\d+)`);
    const port = href.match(regEx)[1];
    url = `${protocol}//${host}/${port}/query`;
  }

  const connectToNLP = () => {
    // TODO: Implement
  }

  // Setup connection with backend Python server for ML/NLP
  useEffect(() => {
    
    // The server uses an encrypted connection when not being tested locally
    const nlpServerURL = (window.location.protocol === 'http:') ?
      'ws://' + window.location.hostname + ':' + '9910':
      'wss://' + window.location.hostname + '/' + '9910';

    // Set server protocol
    window.nlpServer = new WebSocket(nlpServerURL);
    
    // Connect to server
    window.nlpServer.onopen = () => {
      console.log('Connection successfully established with Python server');
      
      // Occassionally ping the server to prevent the connection from closing
      window.nlpInterval = setInterval(() => {
        if (window.nlpServer instanceof WebSocket) {
          window.nlpServer.send('{"command": "ping"}');
        } else {
          clearInterval(window.nlpInterval);
        }
      }, 20 * 1000);
    };
  
    // Automatically reconnect if the connection is lost (optional)
    window.nlpServer.onclose = () => {
      connectToNLP();
    };

    window.nlpServer.onerror = (ev) => {
      console.log('Failed to connect to Python server');
    }
  }, []);

  function onboardingSteps({ game, player }) {
    return [

      // [Warning] Test only
      PublicGoodsGame,
      OpinionSurvey,


      // // Real onboarding steps
      // Recaptcha,
      // ConsentForm,
      // Tutorial,
      // // PreEvaluation, // No pre-evaluation
      // OpinionSurvey,
    ];
  }
  
  function exitSteps({ game, player }) {
    return [End, Problem];
  }
  
  // UI
  return (
    <EmpiricaParticipant url={url} ns={playerKey} modeFunc={EmpiricaClassic}>
    <div className="h-screen relative">
    <EmpiricaMenu position="bottom-left" />
    <div className="h-full overflow-auto">

    <CssVarsProvider theme={theme} defaultMode="light" modeStorageKey="joy-mode-scheme-light" disableTransitionOnChange>
    <CssBaseline />
    <EmpiricaContext playerCreate={PlayerCreate} introSteps={onboardingSteps} lobby={Lobby} exitSteps={exitSteps}
    // loading={End}
    // unmanagedGame={true}
    > 
      <Game />
    </EmpiricaContext>
    </CssVarsProvider>
    </div>
    </div>
    </EmpiricaParticipant>
    );
  }
  