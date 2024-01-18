/*
 * Filename: Cooperation.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file evaluates the level at which whether a particpant will cooperate or defect from their partner(s).
 */
import * as React from 'react';
import { Button, Box, Container, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import { useState } from 'react';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

// TODO: Remove next?
export default function Cooperate({next}) {

    const player = usePlayer();
    const stageTimer = useStageTimer();
    const gameParams = player.get('gameParams');
    const game = useGame();
    const [step, setStep] = useState(1);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const surveyQuestions = [
        "I would want my kids to be taught evolution as a fact of biology",
        "My second amendment right to bear arms should be protected",
        "I support funding the military",
        "Our children are being indoctrinated at school with LGBT messaging",
        "I would pay higher taxes to support climate change research",
        "Restrictions to stop the spread of COVID-19 went too far",
        "I want stricter immigration requirements into the U.S."
    ]
    const [prompt, setPrompt] = useState(surveyQuestions[0]);
    const maxSteps = surveyQuestions.length;

    function handleRadioButtonChange(evt) {
        setCurrentValue(evt.target.value);
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));
        // player.set('submitCooperationDecision', currentValue);
        // next();
    }

    function handleButtonClick(evt) {
        player.set('submitCooperationDecision', currentValue);
        game.set('submitCooperationDecistion', {
            playerId: player.id,
            cooperationDecision: currentValue
        })
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
                You're eligible for a bonus!
                </Typography>
                <Typography level="body-md" textAlign="center">Please select an option below. {msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)} remaining.</Typography>
                <RadioGroup
                    overlay
                    name="q1"
                    value={currentValue}
                    // orientation="horizontal"
                    // sx={{ display: 'flex', flexDirection: 'row', mx: 'auto' }}
                    onChange={handleRadioButtonChange}
                >
                    <FormControl sx={{ p: 0, flexDirection: 'row', gap: 2, mt: 4 }}>
                        <Radio value="1" />
                        <div>
                            <FormLabel>Award yourself a {formatMoney(gameParams.defectionBonus)} bonus.</FormLabel>
                        </div>
                    </FormControl>
                    <FormControl sx={{ p: 0, flexDirection: 'row', gap: 2 }}>
                        <Radio value="2" />
                        <div>
                            <FormLabel>Award you and your partner a {formatMoney(gameParams.cooperationBonus)} bonus.</FormLabel>
                            <FormHelperText>If you select this but your partner does not, you will receive no bonus.</FormHelperText>
                        </div>
                    </FormControl>
                </RadioGroup>
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button>
                </Box>
            </Stack>
            
        </Container>
        );
    }