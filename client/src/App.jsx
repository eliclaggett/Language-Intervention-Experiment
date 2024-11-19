/*
 * Filename: App.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the main wrapper for the Empirica experiment frontend
 */

// Imports
import { EmpiricaClassic } from "@empirica/core/player/classic";
import { EmpiricaContext } from "@empirica/core/player/classic/react";
import { EmpiricaMenu, EmpiricaParticipant } from "@empirica/core/player/react";
import React, { useEffect, useState } from "react";
import Recaptcha from "./async/Recaptcha.jsx";
import ConsentForm from "./async/ConsentForm.jsx";
import Tutorial from "./async/Tutorial.jsx";
import OpinionSurvey from "./async/OpinionSurvey.jsx";
import End from "./semisync/End.jsx";
import Problem from "./semisync/Problem.jsx";
import Game from "./Game.jsx";
import Lobby from "./Lobby.jsx";
import { CssVarsProvider, extendTheme } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import { PlayerCreate } from "./PlayerCreate.jsx";
import { wsSend } from "./utils/utils.js";
import TimerMixin from "react-timer-mixin";
import { Container, Stack, Typography } from "@mui/joy";

// Custom theme
const theme = extendTheme({
  fontFamily: {
    display: "Poppins", // applies to `h1`–`h4`
    body: "Poppins", // applies to `title-*` and `body-*`
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: "#C0CCD9",
          100: "#A5B8CF",
          200: "#6A96CA",
          300: "#4886D0",
          400: "#4886D0",
          500: "#665df5",
          600: "#584FD1",
          700: "#265995",
          800: "#2F4968",
          900: "#2F3C4C",
        },
      },
    },
  },
  typography: {
    h3: {
      fontSize: "1.5rem",
    },
    h4: {
      fontSize: "1rem",
    },
  },
});

export default function App() {
  // Useful variables
  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("participantKey") || "";

  // Set websocket URL for triggering events in the server
  const { protocol, host, href } = window.location;
  let url = `${protocol}//${host}/query`;
  if (window.location.hostname != "localhost") {
    const regEx = new RegExp(`${host}/(\\d+)`);
    const port = href.match(regEx)[1];
    url = `${protocol}//${host}/${port}/query`;
  }

  // Steps before participant reaches the lobby (untimed)
  function onboardingSteps({ game, player }) {
    return [Recaptcha, ConsentForm, Tutorial, OpinionSurvey];
  }

  // Steps after the experiment is over (untimed)
  function exitSteps({ game, player }) {
    return [End, Problem];
  }

  const [studyUI, setStudyUI] = useState(
    <EmpiricaContext
      playerCreate={PlayerCreate}
      introSteps={onboardingSteps}
      lobby={Lobby}
      exitSteps={exitSteps}
    >
      <Game />
    </EmpiricaContext>
  );

  // Helper function to connect to the Python server for AI text generation
  const connectToNLP = () => {
    if (
      window.nlpServer &&
      (window.nlpServer.readyState == WebSocket.OPEN ||
        window.nlpServer.readyState == WebSocket.CONNECTING)
    )
      return;

    let nlpServerURL = "wss://slabbrdbrd.dev/9910";

    // Make the URL invalid for debugging with no AI features
    if (window.location.href.indexOf("noAI") > 0) {
      nlpServerURL += "999";
    }

    // Set server protocol
    window.nlpServer = new WebSocket(nlpServerURL);

    // Connect to server
    window.nlpServer.onopen = () => {
      console.log("Connection successfully established with Python server");

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
      TimerMixin.setTimeout(() => {
        connectToNLP();
      }, 1000);
    };

    // Don't show the experiment UI unless we can connect to the Python server
    window.nlpServer.onerror = (ev) => {
      console.log("Failed to connect to Python server");
      setStudyUI(
        <Container
          sx={{
            width: "100vw",
            height: "100vh",
          }}
        >
          <Stack
            sx={{
              maxWidth: {
                md: "80rem",
              },
              mx: "auto",
              pb: "20vh",
              textAlign: "center",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
            gap={1}
          >
            <Typography level="title-lg" fontSize="3em">
              Oops...
            </Typography>
            <Typography level="body-md" fontSize="1.5em">
              It looks like you got disconnected.
              <br />
              Please refresh the page. If the problem doesn't resolve, please
              contact us through Prolific.
            </Typography>
          </Stack>
        </Container>
      );

      TimerMixin.setTimeout(() => {
        connectToNLP();
      }, 1000);
    };
  };

  // Setup connection with backend Python server for AI text generation
  useEffect(() => {
    connectToNLP();
  }, []);

  // UI
  return (
    <EmpiricaParticipant url={url} ns={playerKey} modeFunc={EmpiricaClassic}>
      <div className="h-screen relative">
        <EmpiricaMenu position="bottom-left" />
        <div className="h-full overflow-auto">
          <CssVarsProvider
            theme={theme}
            defaultMode="light"
            modeStorageKey="joy-mode-scheme-light"
            disableTransitionOnChange
          >
            <CssBaseline />
            {studyUI}
          </CssVarsProvider>
        </div>
      </div>
    </EmpiricaParticipant>
  );
}
