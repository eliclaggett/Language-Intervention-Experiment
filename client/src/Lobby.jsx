/*
 * Filename: Lobby.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the waiting room displayed while we wait for all participants to finish onboarding.
 * Participants can use this time to become acquainted with pairing methodology and the features of the chat.
 */
import * as React from 'react';
import { Button, Container, IconButton, Typography, Stack, Alert } from '@mui/joy';
import { useEffect, useState } from 'react';
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import { msToTime, formatMoney } from './utils/formatting';
import { SendRounded, StarRounded } from '@mui/icons-material';
import TaskInstructions from './components/TaskInstructions.jsx';

export default function Lobby() {

    const player = usePlayer();
    const game = useGame();

    // let lobbyTimeoutSetting = game.get('lobbyTimeout') || false;
    let lobbyTimeout = game.get('lobbyTimeout') || false;
    const gameParams = game.get('gameParams');

    useEffect(() => {
        if (!lobbyTimeout) {
            game.set('startLobby', true);
            lobbyTimeout = Date.now() + ( parseInt(game.get('lobbyDuration')) / 1000 / 1000 );
            // console.log(game.get('lobbyDuration'));
        } else {
            // console.log('apparently there is a lobby timer');
            lobbyTimeout = new Date(lobbyTimeout);
            // console.log(game.get('lobbyDuration'));
            // console.log(game.get('lobbyTimeout'));
        }
    }, []);

    
    const now = new Date();
    const diffMS = lobbyTimeout - now;
    // console.log(diffMS);

    const [timeRemaining, setTimeRemaining] = useState('Wait time is being calculated');
    const[taskInstructionDisplay, setTaskInstructionDisplay] = useState('none');
    const[lobbyDisplay, setLobbyDisplay] = useState('block');
    const readInstructions = player.get('readChatFeatures') || false;
    const[buttonDisplay, setButtonDisplay] = useState('flex');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diffMS = lobbyTimeout - now;

            setTimeRemaining(msToTime(diffMS));
        }, 1000);
        
        return () => clearInterval(interval);        
      }, []);

    function handleClick(val) {
        // player.set('clickButton', {data: 'hi'});
        game.set('startLobby', true);
    }

    function showTaskInstructions() {
        setTaskInstructionDisplay('block');
        setLobbyDisplay('none');
        setButtonDisplay('none');
    }

    // console.log(taskInstructionDisplay);

    return (
        <Container maxWidth="100vw">
            <Stack sx={{
                maxWidth: {
                    md: '30rem'
                },
                mx: 'auto',
                mt: '10rem',
                textAlign: 'center'
            }} gap={1} >
                {/* <img src="images/undraw_chatting_re_j55r.svg" id="headerImg_recaptcha" /> */}
                <div style={{display: readInstructions ? 'block' : lobbyDisplay}}>
                    <Typography level="h1" sx={{pt:12}}>
                    Almost there!<br />Prepare for the next task
                    </Typography>
                    <Typography level="body-md" textAlign="left">
                    We are waiting for all participants to finish onboarding. Then, you will be assigned a partner and
                    enter a chatroom with them.
                    </Typography>
                </div>
                    <Button variant='outlined' onClick={showTaskInstructions} style={{display: readInstructions ? 'none' : buttonDisplay}}>Read Task Instructions</Button>
                
                <Typography level="body-md" color='primary'>
                {timeRemaining} wait time remaining...
                </Typography>
                <div style={{display: readInstructions ? 'none' : taskInstructionDisplay}}>
                    <TaskInstructions/>
                </div>
            </Stack>
        </Container>
        );
    }