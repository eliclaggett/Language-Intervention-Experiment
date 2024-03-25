/*
 * Filename: Lobby.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the waiting room displayed while we wait for all participants to finish onboarding.
 * Participants can use this time to become acquainted with pairing methodology and the features of the chat.
 */
import * as React from 'react';
import { Button, Container, Typography, Stack, Alert } from '@mui/joy';
import { useEffect, useState } from 'react';
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import { msToTime, formatMoney } from './utils/formatting';
import { Star } from '@mui/icons-material';

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

    const [timeRemaining, setTimeRemaining] = useState('is being calculated');

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
                <Typography level="h1">
                Almost there! Prepare for the next task
                </Typography>
                <Typography level="body-md">
                We are waiting for all participants to finish onboarding. Then, you will be assigned a partner and
                enter a chatroom with them.
                </Typography>
                <Typography level="body-md">
                Maximum wait time {timeRemaining}
                </Typography>

                <Typography level="h3" textAlign="left">
                Discussion About Assigned Topic ({gameParams.chatTime} min):
                </Typography>
                <Typography level="body-md" textAlign="left">
                You will be given {gameParams.chatTime} minutes to work with your
                partner and discuss each of your opinions about a specific topic.
                Try to understand how and why your partner formed their opinion by
                asking questions and comparing their answers to your own.
                </Typography>
                <Typography level="h3" textAlign="left">
                Discussion About Bonus Option ({gameParams.cooperationDiscussionTime}
                min):
                </Typography>
                <Typography level="body-md" textAlign="left">
                Then, you will have {gameParams.cooperationDiscussionTime} minutes
                to decide on a bonus option with your partner. After that, you
                will write a report about the conversation.
                </Typography>
                <Alert variant='solid' color='primary' startDecorator={<Star />} sx={{textAlign:'left'}}>
                    Remember that you must complete the entire study to be eligible for the maximum payment.
                </Alert>
                <Typography level="body-md" textAlign="left">
                    Note: Refrain from using offensive language. If your partner is
                    abusive or unresponive, you can end the task by clicking the
                    "Report Partner" button below the chat window:
                </Typography>
                <Button variant='outlined' color="danger" sx={{
                    flex: 0,
                    width: '10rem',
                    mx: 'auto',
                    mb: '2rem'}}>Report Language</Button>
            </Stack>
        </Container>
        );
    }