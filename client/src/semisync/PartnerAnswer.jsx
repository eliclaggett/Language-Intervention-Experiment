/*
 * Filename: PartnerAnswer.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file surveys participants about their level of agreeement with their partner's report of their opinion.
 */
import * as React from 'react';
import { Button, Box, Card, Container, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import LikertQuestion from '../components/LikertQuestion.jsx';
import { useState, useEffect } from 'react';
import { usePlayer, useGame, usePlayers, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

// TODO: Remove next?
export default function PartnerAnswer({next, back}) {

    const player = usePlayer();
    const partnerId = player.get('partnerId') || -1;
    const players = usePlayers();
    const partnerAnswer = player.get('partnerAnswer');

    let partner = null;
    let partnerFinished = false;
    if (players) {
        partner = players.filter((p) => p.id == partnerId)[0];
        partnerFinished = partner.get('submitReflectionSurvey') || false;
        console.log(partnerFinished);
    } else {
        partner = null;
        partnerFinished = true;
    }
    // const partnerFinished = partner.get('submitReflectionSurvey') || false;
    const stageTimer = useStageTimer();
    const gameParams = player.get('gameParams');
    const game = useGame();
    const [step, setStep] = useState(1);
    const [radioButtonVals, setRadioButtonVals] = useState();
    
    const [currentValue, setCurrentValue] = useState('');
    

    function handleRadioButtonChange(evt) {
        setCurrentValue(evt.target.value);
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));
        player.set('submitPartnerAnswer', evt.target.value);
        next();
    }

    // function handleButtonClick(evt) {
    //     player.set('submitPartnerAnswer', radioButtonVals);
    //     next();
    // }

    let stepUI = <Stack sx={{
        maxWidth: {
            md: '30rem'
        },
        mx: 'auto',
        mt: '10rem',
    }} gap={1} >
        <Typography level="h2" textAlign="center">
        Waiting for your partner to finish...
        </Typography>
        <Typography level="body-md" textAlign="center">
        We will ask you to review your partner's answers after they finish writing their report. You will wait a maximum of {msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)}.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
            {/* <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button> */}
        </Box>
    </Stack>;
    if (partnerFinished) {
        stepUI = <Stack sx={{
            maxWidth: {
                md: '90rem'
            },
            mx: 'auto',
            mt: '10rem',
        }} gap={2} >
            {/* <Typography level="h2" textAlign="center">
            Partner Finished!
            </Typography> */}
            <Typography level="h3" textAlign="center">
            According to your partner, your opinion about the chat topic is:
            </Typography>
            <Card sx={{ width: '100%', maxWidth: '40rem', mx: 'auto' }}>
                {partnerAnswer}
            </Card>
            <Typography level="h3" textAlign="center">
                Please rate how much you agree with their assessment.
            </Typography>
            <LikertQuestion name='q1' prompt="" onChange={handleRadioButtonChange} value={currentValue}/>
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                {/* <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button> */}
            </Box>
        </Stack>;
    }

    return (
        <Container maxWidth="100vw">
            {stepUI}
        </Container>
        );
    }