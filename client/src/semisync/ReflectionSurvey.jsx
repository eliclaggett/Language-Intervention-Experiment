/*
 * Filename: ReflectionSurvey.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file surveys participants about their understanding of the chat and attitude toward their partner(s).
 */
import * as React from 'react';
import { Button, Box, Container, Grid, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup, Textarea, Select, Slider, Option, Card } from '@mui/joy';
import { useState, useEffect } from 'react';
import { usePlayer, useGame, useStage, usePlayers, usePartModeCtx, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

import '../chat.scss';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import LikertQuestion from '../components/LikertQuestion.jsx';


const followups = [
    "Should teachers be punished for choosing to teach creationism as an alternative explanation?",
    "What do you think decreasing access to guns will do to society?",
    "Is there meaning to having the strongest military if it doesn't get involved in world conflicts?",
    "Should teachers and books in public schools be banned from discussing sexuality and gender?",
    "How much can economic prosperity be sacrificed to prevent climate change?",
    "Do you think the CDC is a trustworthy source of information?",
    "How would your opinions change if immigrants were given more social support services like food stamps and medicare?"
  ];
const topics = [
    "I would want my kids to be taught evolution as a fact of biology",
    "My second amendment right to bear arms should be protected",
    "I support funding the military",
    "Our children are being indoctrinated at school with LGBT messaging",
    "I would pay higher taxes to support climate change research",
    "Restrictions to stop the spread of COVID-19 went too far",
    "I want stricter immigration requirements into the U.S."
];
// TODO: Remove next?
// TODO: Add timer
export default function ReflectionSurvey({ next }) {

    const player = usePlayer();
    const players = usePlayer();
    const pC = usePartModeCtx();
    const playerId = player.id;
    const partnerId = player.get('partnerId');
    const gameParams = player.get('gameParams');
    const game = useGame();
    const stage = useStage();
    const stageTimer = useStageTimer();

    const alreadySubmitted = player.get('submittedSurvey') || false;
    if (alreadySubmitted) { next(); }

    let topic = player.get('topic') || -1;
    if (typeof(topic) == 'string') {
        topic = parseInt(topic.substring(1));
    }

    const followupQuestion = topic >= 0 ? followups[topic-1] : 'N/A';

    const [step, setStep] = useState(1);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [partnerAnswer, setPartnerAnswer] = useState('');
    const [partnerOpinion, setPartnerOpinion] = useState('');
    const [suggestionReaction, setSuggestionReaction] = useState('');
    const [feelingThermometer, setFeelingThermometer] = useState(3);
    const [politics, setPolitics] = useState(null);
    const [gender, setGender] = useState(null);
    const [age, setAge] = useState(null);
    const [race, setRace] = useState(null);
    const [school, setSchool] = useState(null);
    const [income, setIncome] = useState(null);
    const [opinionChangeValue, setOpinionChangeValue] = useState(null);
    const [conversationDifficultyValue, setConversationDifficultyValue] = useState(null);
    // const [isDisabled, setIsDisabled] = useState(true);

    const isDisabled = (step == 1 && (!partnerOpinion || !feelingThermometer || !conversationDifficultyValue || !opinionChangeValue)) ||
                        (step == 2 && (!politics || (gameParams.treatmentType != 'none' && !suggestionReaction)));

    const feelingThermometerMarks = [
        {
            value: 0,
            label: 'Very cold - I never want to speak to this person again',
        },
        {
            value: 1,
            label: 'Cold',
        },
        {
            value: 2,
            label: 'Slightly cold',
        },
        {
            value: 3,
            label: 'No feeling',
        },
        {
            value: 4,
            label: 'Slightly warm',
        },
        {
            value: 5,
            label: 'Warm',
        },
        {
            value: 6,
            label: 'Very warm - I wish I knew this person in real life',
        },
    ];

    const chatLog = [];
    const chatChannel = player.get('chatChannel');
    const chatData = game.get(chatChannel) || [];
    let msgKey = 'm';
    let msgIdx = 0;
    for (const msg of chatData) {

        let msgClass = '';
        if (msg.sender == -1) { msgClass = 'botMsg'; }
        else if (msg.sender == '-'+playerId ) { msgClass = 'youLeftMsg'; }
        else if (msg.sender == '-'+partnerId ) { msgClass = 'partnerLeftMsg'; }

        chatLog.push(
            <Message className={msgClass} model={{
                message: msg.txt,
                sentTime: "just now",
                sender: 'p'+msg.sender,
                direction: (msg.sender == playerId || msg.sender == '-'+playerId) ? 'outgoing' : 'incoming',
                position: 'single'
                }} key={msgKey + msgIdx}/>
        );
        msgIdx++;
    }

    function handleRadioButtonChange(evt) {
        setCurrentValue(evt.target.value);
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));
    }

    function handleSliderChange(evt) {
        setFeelingThermometer(evt.target.value);
    }

    function handleButtonClick(evt) {
        if (step == 1) { setStep(step + 1); }
        else {
            // console.log(player.ctx.game);
            // stage.set('participantFinishStep', "{step: 'reflection_survey', playerId: player.id}");
            player.set('submitReflectionSurvey', {
                partnerAnswer: partnerAnswer,
                partnerOpinion: partnerOpinion,
                feelingThermometer: feelingThermometer,
                politics: politics,
                gender: gender,
                age: age,
                race: race,
                school: school,
                income: income,
                suggestionReaction: suggestionReaction
            });
            game.set('partnerAnswer', {
                playerId: player.id,
                // partnerId: partnerId,
                partnerAnswer: partnerOpinion,
            });
            // player.stage.set('submit', true);
            next();
        }
    }

    useEffect(() => {
        if (step == 1) {
            document.querySelectorAll('.feelingThermometer .MuiSlider-markLabel').forEach(el => el.classList.remove('active'));
            document.querySelector('.feelingThermometer .MuiSlider-markLabel[data-index="' + feelingThermometer + '"]').classList.add('active');
        }
    }, [feelingThermometer]);

    let timeLeftTxt = '';
    if (stage.get('name') == 'semi_asynchronous_steps') {
        let timeLeft = stageTimer?.remaining ? stageTimer.remaining : 0;
        timeLeftTxt = <span style={{color:'rgb(102, 93, 245)'}}>{msToTime(timeLeft)} remaining to finish the survey.<br /></span>;
    }

    function handleOpinionChange(e) {
        setOpinionChangeValue(e.target.value);
    }
    function handleDifficultyChange(e) {
        setConversationDifficultyValue(e.target.value);
    }

    let stepUI = <Stack sx={{
        maxWidth: '50%',
        minWidth: '34rem',
        mx: 'auto',
        mt: '10rem',
    }} gap={6} >
        <div>
            <Typography level="h2">Reflection Survey</Typography>
            <Typography level="body-md" className='reflectionSurveyHeaderTxt'>
                {timeLeftTxt}
                Please answer these questions in at least a few sentences. (1/2)
            </Typography>
        </div>
        {/* <div>
            <FormLabel sx={{mb: '0.5rem'}}>You were asked this follow-up question during the chat:</FormLabel>
            <Card>
                {followupQuestion}
            </Card>
        </div> */}
        {/* <FormControl>
            <FormLabel>What was your partner's answer to this question?</FormLabel>
            <Textarea minRows={3} value={partnerAnswer} onChange={(e) => {setPartnerAnswer(e.target.value); }} placeholder="Type answer here"/>
        </FormControl> */}
        <FormControl>
            <FormLabel>What is your partner's opinion about the conversation topic?</FormLabel>
            <p style={{paddingBottom: '0.5em'}}>Describe the main points of their argument and their reaction to hearing your beliefs.</p>
            <Textarea minRows={8} value={partnerOpinion} onChange={(e) => {setPartnerOpinion(e.target.value);} } placeholder="Type answer here"/>
            {/* <FormHelperText>This is a helper text.</FormHelperText> */}
        </FormControl>
        <FormControl className="small">
            <FormLabel>How do you feel about this statement?</FormLabel>
            <p>"{topics[topic-1]}"</p>
            <LikertQuestion name='opinionChange' prompt='' onChange={handleOpinionChange} value={opinionChangeValue}/>
            {/* <FormHelperText>This is a helper text.</FormHelperText> */}
        </FormControl>
        <FormControl className="small">
            <FormLabel>How difficult was having this conversation?</FormLabel>
            <LikertQuestion name='conversationDifficulty' prompt='' onChange={handleDifficultyChange} value={conversationDifficultyValue} type="difficulty"/>
            {/* <FormHelperText>This is a helper text.</FormHelperText> */}
        </FormControl>
        <div>
        <Typography level="h3">How would you rate your feelings toward your partner?</Typography>
        <Box sx={{ height: 200, mt: 3 }}>
            <Slider
                orientation="vertical"
                aria-label="Always visible"
                defaultValue={3}
                step={1}
                marks={feelingThermometerMarks}
                max={6}
                min={0}
                valueLabelDisplay="off"
                className="feelingThermometer"
                onChange={handleSliderChange}
            />
        </Box>
        </div>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row' }}>
            <Button sx={{ my: 2 }} onClick={handleButtonClick} disabled={isDisabled}>Continue</Button>
        </Box>
    </Stack>;

    if (step == 2) {
        stepUI = <Stack sx={{
            maxWidth: '50%',
            mx: 'auto',
            mt: '10rem',
        }} gap={6} >
            <div>
                <Typography level="h2">Reflection Survey</Typography>
                <Typography level="body-md" className='reflectionSurveyHeaderTxt'>
                    {timeLeftTxt}
                    Please answer the following questions. (2/2)
                </Typography>
            </div>
            <FormControl sx={{display: gameParams.treatmentType != 'none' ? 'flex' : 'none'}}>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    What is your reaction to the reply suggestions?<span className="textRed">*</span>
                </FormLabel>
                <Textarea minRows={3} value={suggestionReaction} onChange={(e) => { setSuggestionReaction(e.target.value);} } placeholder="Type answer here"/>
            </FormControl>
            <FormControl>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    What is your political affiliation?<span className="textRed">*</span>
                </FormLabel>
                <Select sx={{ maxWidth: '15rem' }} onChange={(e, newVal) => {setPolitics(newVal);}}>
                    <Option value="left">Left</Option>
                    <Option value="left-leaning">Left-leaning</Option>
                    <Option value="center">Center</Option>
                    <Option value="right-leaning">Right-leaning</Option>
                    <Option value="right">Right</Option>
                    <Option value="other">Other</Option>
                    <Option value="no_answer">Decline to answer</Option>
                </Select>
            </FormControl>

            <FormControl>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    What is your gender?
                </FormLabel>
                <Select sx={{ maxWidth: '15rem' }} onChange={(e, newVal) => {setGender(newVal); }}>
                    <Option value="female">Female</Option>
                    <Option value="male">Male</Option>
                    <Option value="non-binary">Non-binary</Option>
                    <Option value="other">Other</Option>
                    <Option value="no_answer">Decline to answer</Option>
                </Select>
            </FormControl>

            <FormControl>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    Which category includes your age?
                </FormLabel>
                <Select sx={{ maxWidth: '15rem' }} onChange={(e, newVal) => {setAge(newVal);}}>
                    <Option value="18-29">18-29</Option>
                    <Option value="30-39">30-39</Option>
                    <Option value="40-49">40-49</Option>
                    <Option value="50-59">50-59</Option>
                    <Option value="over60">60 or older</Option>
                    <Option value="no_answer">Decline to answer</Option>
                </Select>
            </FormControl>

            <FormControl>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    How would you identify your race and ethnicity?
                </FormLabel>
                <Select sx={{ maxWidth: '15rem' }} onChange={(e, newVal) => {setRace(newVal);}}>
                    <Option value="asian">Asian / Pacific Islander</Option>
                    <Option value="black">Black / African American</Option>
                    <Option value="hispanic">Hispanic / Latino</Option>
                    <Option value="white">White, Caucasian, European (not Hispanic)</Option>
                    <Option value="native">American Indian / Native American</Option>
                    <Option value="multi">Multiple ethnicities</Option>
                    <Option value="other">Other</Option>
                    <Option value="no_answer">Decline to answer</Option>
                </Select>
            </FormControl>

            <FormControl>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    What is the highest grade of school or year of college you completed?
                </FormLabel>
                <Select sx={{ maxWidth: '15rem' }} onChange={(e, newVal) => {setSchool(newVal);}} >
                    <Option value="high_school">High school or less</Option>
                    <Option value="some_college">Some college (1-3 years)</Option>
                    <Option value="college">College graduate (Bachelors)</Option>
                    <Option value="masters">Masters</Option>
                    <Option value="gt_masters">Above Masters degree</Option>
                    <Option value="other">Other</Option>
                    <Option value="no_answer">Decline to answer</Option>
                </Select>
            </FormControl>


            <FormControl>
                <FormLabel id="select-field-demo-label" htmlFor="select-field-demo-button">
                    About what wage and salary did you receive in the last year (including any type of income such as pension)?
                </FormLabel>
                <Select sx={{ maxWidth: '15rem' }} onChange={(e, newVal) => {setIncome(newVal);}} >
                    <Option value="under20000">Less than $20,000</Option>
                    <Option value="20000-34999">$20,000 - $34,999</Option>
                    <Option value="35000-49999">$35,000 - $49,999</Option>
                    <Option value="50000-74999">$50,000 - $74,999</Option>
                    <Option value="75000-99999">$75,000 - $99,999</Option>
                    <Option value="over100000">Over $100,000</Option>
                    <Option value="no_answer">Decline to answer</Option>
                </Select>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row' }}>
                <Button sx={{ my: 2 }} onClick={handleButtonClick} disabled={isDisabled}>Continue</Button>
            </Box>
        </Stack>
    }


    return (
        <Grid maxWidth="100vw" sx={{
            width: '85%',
            maxWidth: '60rem',
            minWidth: '40rem',
            mx: 'auto'
        }}
        container>
            {stepUI}
            <Stack
            sx={{
                minWidth: '20rem',
                width: '20%',
                // maxWidth: 'calc(50% - 2em)',
                maxWidth: 'calc(100% - 33rem)',
                mt: '10rem',
                justifySelf: 'center',
                mx: 'auto'
                }}>
            <Typography level='h2' sx={{mb: 1}}>Chat Log</Typography>
            <MainContainer style={{ maxHeight: '50rem' }}>
                <ChatContainer style={{height: '100%'}}>       
                    <MessageList>
                        {chatLog}
                    </MessageList>
                </ChatContainer>
            </MainContainer>
            </Stack>
        </Grid>
    );
}