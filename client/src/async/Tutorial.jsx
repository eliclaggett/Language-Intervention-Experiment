/*
 * Filename: Tutorial.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the main tutorial of the experimental procedure.
 */
import * as React from 'react';
import { Alert, Button, Box, Container, FormControl, FormLabel, List, ListItem, ListItemDecorator, ListItemContent, Typography, Stack, Sheet, Radio, RadioGroup } from '@mui/joy';
import WarningIcon from '@mui/icons-material/Warning';
import { usePlayer } from "@empirica/core/player/classic/react";
import { useState, useEffect } from 'react';
import { formatMoney } from '../utils/formatting';
import ProgressList from '../components/ProgressList';
import { Done } from '@mui/icons-material';

export default function Tutorial({ next }) {

    const player = usePlayer();
    const gameParams = player.get('gameParams');
    if (!gameParams) window.location.reload();
    const correctAnswers = [1, 2, 2, 3];
    const totalBasePay = gameParams.task1Pay + gameParams.task2Pay;
    const [step, setStep] = useState(1);
    const [nextButtonDisabled, setNextButtonDisabled] = useState(false);
    const [backButtonDisabled, setBackButtonDisabled] = useState(true);
    const [errorDisplay, setErrorDisplay] = useState('none');
    const [q4SuccessDisplay, setQ4SuccessDisplay] = useState('none');

    function shuffleArray(array) {
        // Citation: https://stackoverflow.com/questions/2450954
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    const q2Answers = [
        [1, "Complete a survey of your opinions toward various topics"],
        [2, "Discussion with a partner and writing a report about their opinions"],
        [3, "None of these options"]
    ];
    const q3Answers = [
        [1, "Similar opinions to me"],
        [2, "Different opinions from me"]
    ];
    // const q4Answers = [
    //     [1, formatMoney(gameParams.task1Pay)],
    //     [2, formatMoney(gameParams.task2Pay)],
    //     [3, formatMoney(totalBasePay + gameParams.cooperationBonus)],
    //     [4, formatMoney(totalBasePay + gameParams.defectionBonus)]
    // ];

    const q4Answers = [
        [1, formatMoney(gameParams.task1Pay)],
        [2, formatMoney(gameParams.task2Pay)],
        [3, formatMoney(totalBasePay + gameParams.bonus + 1)],
        [4, formatMoney(totalBasePay + gameParams.bonus)]
    ];

    const [q2RadioButtons, setQ2RadioButtons] = useState([]);
    const [q3RadioButtons, setQ3RadioButtons] = useState([]);
    const [q4RadioButtons, setQ4RadioButtons] = useState([]);
    
    useEffect(() => {
        shuffleArray(q2Answers);
        for (const q of q2Answers) {
            q2RadioButtons.push(<Radio value={q[0]} label={q[1]} variant="outlined" key={"q2-"+q[0]}/>);
        }

        shuffleArray(q3Answers);
        for (const q of q3Answers) {
            q3RadioButtons.push(<Radio value={q[0]} label={q[1]} key={"q3-"+q[0]} variant="outlined" />);
        }  
        
        shuffleArray(q4Answers);
        for (const q of q4Answers) {
            q4RadioButtons.push(<Radio value={q[0]} label={q[1]} key={"q4-"+q[0]} variant="outlined" />);
        }  
    }, []);
    

    // Logic to handle interactions with this page
    const [radioButtonVals, setRadioButtonVals] = useState();

    const handleRadioButtonChange = (evt) => {
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));

        if (evt.target.value == correctAnswers[step-1]) {
            
            if (step == 4) {
                setQ4SuccessDisplay('');
            }
            setErrorDisplay('none');
            setNextButtonDisabled(false);
        } else {
            setErrorDisplay('');
            if (step == 4) {
                setQ4SuccessDisplay('none');
            }
            setNextButtonDisabled(true);
        }
    }

    function handleBack() {
        if (step > 1) { setStep(step-1); }
        if (step == 2) { setBackButtonDisabled(true); }


    }
    function handleNext() {
        if (radioButtonVals && radioButtonVals['q'+(step+1)] == correctAnswers[step]) {
            setNextButtonDisabled(false);
        } else {
            setNextButtonDisabled(true);
        }

        if (step == 4) {
            // Mark that the tutorial was finished
            player.set('submitTutorial', true);
            next();
        } else {
            setStep(step+1);
            setBackButtonDisabled(false);
        }
    }

    // Logic to move to next step or stop the experiment
    const passedTutorial = player.get('submitTutorial');
    if (passedTutorial === true) {
        next();
    }

    // Custom UI Elements
    // Step 1
    let tutorialStepUI = <Stack gap={1}>
                        <Typography level="h2" textAlign="center">
                            Tutorial
                        </Typography>
                        <p>
                            As you read through this short tutorial, please answer the three comprehension
                            questions that look like this:
                        </p>
                        <FormControl>
                            <FormLabel>Do you need to answer comprehension questions about this tutorial?</FormLabel>
                            <RadioGroup name="q1" onChange={handleRadioButtonChange} defaultValue="1">
                                <Radio value="1" label="Yes" variant="outlined" />
                                <Radio value="2" label="No" variant="outlined" />
                            </RadioGroup>
                        </FormControl>
                        <p>
                            We only use these questions to ensure you understand the study details.
                        </p>
                    </Stack>;
    if (step == 2) {
        tutorialStepUI = <Stack gap={1}>
                            <Typography level="h2" textAlign="center">
                                Tutorial
                            </Typography>
                            <Typography level="body-md">
                                This study has two parts. Within each part you will complete multiple short tasks.
                                You have a fixed amount of time to complete each part.
                                Please complete all tasks displayed at the top of the page within the alotted time.
                            </Typography>
                            <Typography level="h3">Part 1) Individual Preparation</Typography>
                            <Typography level="body-md">
                                Before we assign you a partner, you will complete a survey about your opinions on various topics.
                                Then, you will enter a waiting room until all study participants finish the survey.
                                The maximum time you will wait is displayed above.
                            </Typography>
                            <Typography level="body-md">
                            You will be paid {formatMoney(gameParams.task1Pay)} for completing this part of the study.
                            </Typography>
                            <Typography level="h3">Part 2) Paired Communication</Typography>
                            <Typography level="body-md">
                            This is the main focus of our study.
                            You will be paired with another participant and will discuss your reactions to a recent news article that we will provide.
                            Then, you will write a paragraph-long report <b>about your partner's</b> opinion on the conversation topic.
                            </Typography>
                            <Typography level="body-md">
                            You will be paid an additional {formatMoney(gameParams.task2Pay)} for completing this part of the study.
                            </Typography>
                            <Typography level="body-md">
                            If we recruit an odd number of participants, we may not be able to
                            partner you. If so, we will stop the study early and pay you for completing Part 1.
                            </Typography>
                            <FormControl>
                                <FormLabel>What does the main part of the study involve?</FormLabel>
                                <RadioGroup name="q2" onChange={handleRadioButtonChange} defaultValue=''>
                                    {q2RadioButtons}
                                </RadioGroup>
                            </FormControl>
                        </Stack>;
    } else if (step == 3) {
        tutorialStepUI = <Stack gap={1}>
                            <img src='/images/undraw_forms_re_pkrt.svg' />
                            <Typography level="h2" textAlign="center">How we'll make pairs</Typography>
                            <Typography level="body-md">
                                Using the results of the survey you will take shortly, we will group
                                participants based on their beliefs. People in different groups will have different beliefs. People in the same
                                group will have similar beliefs. After creating groups, we'll form some pairs within
                                each group and some pairs between groups. After you are assigned a
                                partner, you will have {gameParams.chatTime} minutes to discuss your
                                thoughts.
                            </Typography>
                            <FormControl>
                                <FormLabel>If my partner is from a different group, they likely have...</FormLabel>
                                <RadioGroup name="q3" onChange={handleRadioButtonChange} defaultValue=''>
                                    {q3RadioButtons}
                                </RadioGroup>
                            </FormControl>
                            <Typography level="body-md">
                                The survey consists of seven statements which you will react to using
                                the buttons below each statement. Please answer each question carefully
                                because the next steps of the task will depend on your previous answers.
                                You may click anywhere on the option you like best to select it:
                            </Typography>
                            <FormControl sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                                <FormLabel></FormLabel>
                                <RadioGroup
                                    overlay
                                    name="member"
                                    defaultValue="person1"
                                    orientation="horizontal"
                                    sx={{ gap: 2 }}
                                >
                                    <Sheet
                                        component="label"
                                        // key='1'
                                        variant="soft"
                                        sx={{
                                        p: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        boxShadow: 'sm',
                                        borderRadius: 'md',
                                        }}
                                    >
                                        <Typography level="body-sm" sx={{ mt: 1 }}>
                                        Example Button
                                        </Typography>
                                        <Radio
                                        value="1"
                                        variant="outlined"
                                        sx={{
                                            my: 1,
                                        }}
                                        />
                                    </Sheet>
                                </RadioGroup>
                                </FormControl>
                            <Typography level="body-md">
                                After making a selection, you will automatically move to the next
                                question.
                            </Typography>
                        </Stack>;
    } else if (step == 4) {
        // tutorialStepUI = <Stack gap={1}>
        //                     <img src="/images/undraw_treasure_of-9-i.svg" />
        //                     <Typography level="h2" textAlign="center">Bonus Payment</Typography>
        //                     <Typography level="body-md">
        //                     If you complete both Part 1 and Part 2 of this study, you are guaranteed to make at least {formatMoney(totalBasePay)}.
        //                     In addition, you will have {gameParams.cooperationDiscussionTime} minutes to decide on which bonus option to choose:
        //                     </Typography>
        //                     <Typography level="h3">Default Bonus</Typography>
        //                     <Typography level="body-md">
        //                     The default study bonus is {formatMoney(gameParams.defectionBonus)}.
        //                     </Typography>
        //                     <Typography level="h3">Extra Bonus</Typography>
        //                     <Typography level="body-md">
        //                     If you and your partner agree to select the extra bonus option, your
        //                     bonus will be {formatMoney(gameParams.cooperationBonus)}.
        //                     However, if you select this option and your partner does not, you will receive no bonus.
        //                     </Typography>
        //                     <FormControl>
        //                         <FormLabel>What is the total pay of this study if you and your partner select the
        //                         extra bonus?</FormLabel>
        //                         <RadioGroup name="q4" onChange={handleRadioButtonChange} defaultValue={radioButtonVals?.q4}>
        //                             {q4RadioButtons}
        //                         </RadioGroup>
        //                     </FormControl>
        //                 </Stack>;
        tutorialStepUI = <Stack gap={1}>
                            <img src="/images/undraw_treasure_of-9-i.svg" />
                            <Typography level="h2" textAlign="center">Bonus Payment</Typography>
                            <Typography level="body-md">
                            If you complete both Part 1 and Part 2 of this study, you are guaranteed to make at least {formatMoney(totalBasePay)}.
                            In addition, you will have {gameParams.cooperationDiscussionTime} minutes to decide how to allocate an additional bonus:
                            </Typography>
                            <Typography level="h3" sx={{pt: 2}}>Default Bonus</Typography>
                            <Typography level="body-md">
                            The default study bonus is {formatMoney(gameParams.bonus)}.
                            </Typography>
                            <Typography level="h3" sx={{pt: 2}}>Share</Typography>
                            <Typography level="body-md">
                            You may share up to $1 of your bonus with your partner.
                            <br/>
                            They will receive 2x the amount you share.
                            <br/>
                            For example, if you share $0.50 with your partner, your bonus will decrease by $0.50 and their bonus will increase by $1.
                            </Typography>
                            <Typography level="h3" sx={{pt: 2}}>Take</Typography>
                            <Typography level="body-md">
                            You spend up to $1 to decrease the bonus of your partner.
                            <br/>
                            Their bonus will decrease by 2x the amount you spend.
                            <br/>
                            For example, if you spend $0.50 to take from their bonus, your bonus will decrease by $0.50 and their bonus will decrease by $1.
                            </Typography>
                            <FormControl sx={{pt: 2}}>
                                <FormLabel>What is the total pay of this study if you and your partner share $1 with each other?</FormLabel>
                                <RadioGroup name="q4" onChange={handleRadioButtonChange} defaultValue=''>
                                    {q4RadioButtons}
                                </RadioGroup>
                            </FormControl>
                        </Stack>;
    }

    // UI
    return (
        <Container maxWidth="100vw" className="tutorial_container">
            <ProgressList items={[
                {name: 'Tutorial', time: '~3 min'},
                // {name: 'Practice Session', time: '~5 min'},
                {name: 'Questionnaire', time: '~1 min'},
                ]} active={0} />


            <Stack sx={{
                maxWidth: {
                    sm: '80vw',
                    md: '40rem',
                    lg: '40rem',
                },
                mx: 'auto',
                // mt: '10vh',
                mb: '2rem',
                py: 2
            }} gap={1} >
                {/* <img src="images/"/> */}
                {tutorialStepUI}
                {/* {nonconsentForm} */}
                <Alert
                        startDecorator={<WarningIcon />}
                        variant="outlined"
                        color="danger"
                        sx={{ display: errorDisplay }}
                    >
                        Oops, that's not right. Please try again.
                </Alert>
                <Alert
                        startDecorator={<Done />}
                        variant="outlined"
                        color="success"
                        sx={{ display: q4SuccessDisplay }}
                    >
                        Exactly! {formatMoney(totalBasePay)} + $1 (your remaining bonus) + $2 (double what your partner shared).
                </Alert>
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2, mr:1 }} onClick={handleBack} disabled={backButtonDisabled}>Back</Button>
                    <Button sx={{ my: 2, mr:1 }} onClick={handleNext} disabled={nextButtonDisabled}>Next</Button>
                </Box>
            </Stack>
        </Container>
    );
}