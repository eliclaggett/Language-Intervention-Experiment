/*
 * Filename: ChatEndAcknowledgement.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file confirms that a participant is still attentive after the chat is over
 */
import React, { useEffect } from 'react';
import { Button, Box, Container, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import { useState } from 'react';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

// TODO: Remove next?
export default function ChatEndAcknowledgement({next}) {

    const player = usePlayer();
    const stageTimer = useStageTimer();
    const gameParams = player.get('gameParams');
    const game = useGame();
    const processEarlyFinish = player.get('processEarlyFinish');
    const chatEnded = player.get('serverChatEnded');

    useEffect(() => {
        if (!chatEnded) {
            player.set('serverChatEnded', true);
        }
    }, []);
    function handleButtonClick(evt) {
        player.set('passedChat', true);
        next();
    }

    return (
        <Container maxWidth="100vw">
            <Stack sx={{
                maxWidth: {
                    md: '30rem'
                },
                mx: 'auto',
                mt: '10rem',
            }} gap={1} >
                <Typography level="h2" textAlign="center">
                Chat Finished!
                </Typography>
                <Typography level="body-md" textAlign="center">
                    Please continue to the final step of this study and describe your understanding of your partner.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button>
                </Box>
            </Stack>
            
        </Container>
        );
    }