/*
 * Filename: End.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays the normal ending screen for the experiment.
 */
import * as React from 'react';
import { Button, Box, Container, List, ListItem, Typography, Sheet, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup, Table, Textarea, Modal, ModalClose } from '@mui/joy';
import { useState } from 'react';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

// TODO: Remove next?
export default function End({next}) {

    const player = usePlayer();
    const gameParams = player.get('gameParams');
    const completionCode = player.get('completionCode');
    const processedGameEnd = player.get('processGameEnd');
    const endReason = player.get('endReason') || '';
    const game = useGame();
    const stageTimer = useStageTimer();

    if ( game && (!stageTimer || stageTimer.remaining <= 0) 
    && !processedGameEnd 
) {
        player.set('processGameEnd', true);
    }
    
    const [step, setStep] = useState(1);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [feedback, setFeedback] = useState('');
    const [open, setOpen] = useState(false);

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

    let totalPay = gameParams.task1Pay;
    const minPayment = gameParams.task1Pay + gameParams.task2Pay;


    const startedTask2 = player.get('startTask2') || false;
    let task2PayUI = '';
    if (startedTask2) {
        task2PayUI = <tr>
            <td>Task 2 Pay</td>
            <td>{formatMoney(gameParams.task2Pay)}</td>
        </tr>;
        totalPay += gameParams.task2Pay;
    }
    let bonusPayUI = '';
    const cooperationDecision = player.get('submitCooperationDecision');
    const partnerCooperationDecision = player.get('partnerCooperationDecision');
    const partnerCooperationType = player.get('partnerCooperationType');


    if (partnerCooperationDecision != -1) {

        let bonus = gameParams.bonus - cooperationDecision;
        if (partnerCooperationType == 'Share') {
            bonus += (partnerCooperationDecision * 2);
        }

        bonus = Math.max(bonus, 0);

        bonusPayUI = <tr>
             <td>Bonus Payment</td>
             <td>{formatMoney(bonus)}</td>
         </tr>;
        totalPay += bonus;
    } else if (startedTask2) {
        // Partner never selected a bonus option :O
        let bonus = gameParams.bonus - cooperationDecision;

        bonusPayUI = <tr>
             <td>Bonus Payment</td>
             <td>{formatMoney(bonus)}</td>
         </tr>;
        totalPay += bonus;
    }

    function handleRadioButtonChange(evt) {
        setCurrentValue(evt.target.value);
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));
    }

    function handleButtonClick(evt) {
        player.set('feedback', feedback);
    }


    let paymentUI = '';
    let myContributionText = '';
    let partnerContributionText = '';
    if (cooperationDecision > 0) {
        myContributionText = <ListItem>Subtract {formatMoney(cooperationDecision)} to share with your partner.</ListItem>
    }
    if (partnerCooperationDecision > 0) {
        partnerContributionText = <ListItem>Add {formatMoney(partnerCooperationDecision * 2)} because your partner shared with you.</ListItem>;
    }

    if (!startedTask2) {
        paymentUI = <div>
                <Typography level="body-md" textAlign="center">We were unable to continue with Part 2 of the study. Your total earnings are:</Typography>
                <Table borderAxis="none" variant="plain" sx={{ py: 3, maxWidth: '15rem', mx: 'auto', '& tbody td:nth-child(1)': { width: '75%' }, 'tfoot': { fontWeight: 'bold' } }}>
                    <tbody>
                        <tr>
                            <td>Task 1 Pay</td>
                            <td>{formatMoney(gameParams.task1Pay)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                    <tr>
                            <td>Total</td>
                            <td>{formatMoney(totalPay)}</td>
                        </tr>
                    </tfoot>
                </Table>

                <Typography level="body-md" textAlign={'center'} fontWeight={'bold'}>
                    Please return this study. We will compensate you with a bonus payment.
                </Typography>
                <Typography level="body-md" textAlign={'center'} sx={{pt: 1, textDecoration: 'underline', cursor: 'pointer'}} onClick={() => {setOpen(!open)}}>
                    Why must I return the study?
                </Typography>
                <Modal
                    open={open}
                    onClose={() => setOpen(false)}
                    sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    <Sheet
                    variant="outlined"
                    sx={{
                        maxWidth: 500,
                        borderRadius: 'md',
                        p: 3,
                        boxShadow: 'lg',
                    }}
                    >
                    <ModalClose variant="plain" sx={{ m: 1 }} />
                    <Typography
                        component="h2"
                        id="modal-title"
                        level="h4"
                        textColor="inherit"
                        fontWeight="lg"
                        mb={1}
                    >
                        Variable payment studies on Prolific
                    </Typography>
                    <Typography id="modal-desc" textColor="text.tertiary">
                        It is our top priority that participants are compensated fairly for joining our studies. Prolific cares too, and uses an automated system to penalize researchers for paying too little.
                        <br/><br/>
                        However, this automated system calculates your hourly wage based on the maximum time we allow for the study, not the actual time you spend on the study.
                        <br/><br/>
                        To avoid being penalized by this automated system, we must ask you to return the study. <strong>We will still pay you via a bonus payment,</strong> but we agree that this is inconvenient.
                        <br/><br/>
                        We are working with Prolific to make changes to their automated wage calculations, and recommend you <a target="_blank" href="https://participant-help.prolific.com/hc/en-gb/requests/new" style={{textDecoration: 'underline'}}>contact them</a> with any complaints you might have.
                    </Typography>
                    </Sheet>
                </Modal>
                {/* <Typography level="h2" textAlign={'center'} sx={{py:2}}>
                    {completionCode}
                </Typography> */}
            </div>;
    } else if (endReason && (endReason == 'reported' || endReason == 'reportPartner')) {
        paymentUI = <div>
        <Typography level="body-md" textAlign="center">A participant reported profane language. We were unable to continue with the study. Your total earnings are:</Typography>
        <Table borderAxis="none" variant="plain" sx={{ py: 3, maxWidth: '15rem', mx: 'auto', '& tbody td:nth-child(1)': { width: '75%' }, 'tfoot': { fontWeight: 'bold' } }}>
            <tbody>
                <tr>
                    <td>Task 1 Pay</td>
                    <td>{formatMoney(gameParams.task1Pay)}</td>
                </tr>
                <tr>
                    <td>Task 2 Pay</td>
                    <td>{formatMoney(gameParams.task2Pay)}</td>
                </tr>
            </tbody>
            <tfoot>
            <tr>
                    <td>Total</td>
                    <td>{formatMoney(gameParams.task1Pay + gameParams.task2Pay)}</td>
                </tr>
            </tfoot>
        </Table>

        <Typography level="body-md" textAlign={'center'}>
            Please submit this completion code when you are ready:
        </Typography>
        <Typography level="h2" textAlign={'center'} sx={{py:2}}>
            {completionCode}
        </Typography>
    </div>;
    } else {
        if (stageTimer && stageTimer.remaining && partnerCooperationDecision == -1) {
            paymentUI = <div>
                <Typography level="body-md">
                    Your partner has not finished allocating their bonus so we cannot calculate your final payment yet. However, you are guaranteed to earn at least {formatMoney(minPayment)} for your participation.
                    <br/><br/>
                    The maximum waiting time for your partner to finish is {msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)}. At that point, we will present you with a completion code to submit to Prolific.
                </Typography>
            </div>;
        } else {
            paymentUI = <div>
                <Typography level="body-md" textAlign="center">Your total earnings for this study are:</Typography>
                <Table borderAxis="none" variant="plain" sx={{ py: 2, maxWidth: '15rem', mx: 'auto', '& tbody td:nth-child(1)': { width: '75%' }, 'tfoot': { fontWeight: 'bold' } }}>
                    <tbody>
                        <tr>
                            <td>Task 1 Pay</td>
                            <td>{formatMoney(gameParams.task1Pay)}</td>
                        </tr>
                        {task2PayUI}
                        {bonusPayUI}
                    </tbody>
                    <tfoot>
                    <tr>
                            <td>Total</td>
                            <td>{formatMoney(totalPay)}</td>
                        </tr>
                    </tfoot>
                </Table>

                <Typography level="body-md">
                    Your bonus was calculated as follows:
                </Typography>
                <List component='ol' marker='decimal'>
                    <ListItem>Default bonus of {formatMoney(gameParams.bonus)}.</ListItem>
                    {myContributionText}
                    {partnerContributionText}
                </List>

                <Typography level="body-md">
                    Please submit this completion code when you are ready:
                </Typography>
                <Typography level="h2" textAlign={'center'} sx={{py:2}}>
                    {completionCode}
                </Typography>
                <Typography level="body-md">
                    <b>We will pay the difference between your total earnings and the base
                    pay separately after you submit this code.</b>
                </Typography>
            </div>;
        }
    }

    return (
        <Container maxWidth="100vw">
            <Stack sx={{
                maxWidth: {
                    md: '30rem',
                    sm: '80%'
                },
                mx: 'auto',
                mt: '10rem',
            }} gap={2} >
                <Typography level="h2" textAlign="center">
                Thank you for participating!
                </Typography>
                {paymentUI}

                {startedTask2 ? <div>
                <Typography level="body-md">
                If you have time, please tell us about your experience participating in the study and list any feedback here, too.
                </Typography>
                <FormControl>
                    <Textarea placeholder="Type your feedback here..." minRows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)}></Textarea>
                </FormControl>
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2 }} onClick={handleButtonClick}>Send Feedback</Button>
                </Box>
                </div>
                : ''}
            </Stack>
            
        </Container>
        );
    }