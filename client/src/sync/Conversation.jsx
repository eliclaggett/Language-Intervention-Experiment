/*
 * Filename: Conversation.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays a chat window for participants to discuss with each other about assigned topics.
 */
import React,{ useState, useEffect, useRef } from 'react';
import { Button, Box, Container, IconButton, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { PlaylistRemoveTwoTone, SmartToyOutlined } from '@mui/icons-material';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

import '../chat.scss';
import { Avatar, MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import { State } from '@empirica/tajriba';

import WithinGroupGraphic from '../components/WithinGroupGraphic.jsx';
import AcrossGroupGraphic from '../components/AcrossGroupGraphic.jsx';

// import { Hint } from 'react-autocomplete-hint';
import { Hint } from'../utils/react-autocomplete-hint/dist/src/index.js'; // Use custom hint to show autocomplete suggestions as soon as they are generated
// import { clearInterval } from 'timers';
import TimerMixin from 'react-timer-mixin';

// TODO: Remove next?
export default function Conversation({next}) {

    // const timerMixin = TimerMixin();
    const player = usePlayer();
    const playerId = player.get('id');
    const gameParams = player.get('gameParams');
    const playerGroup = player.get('group');
    const partnerGroup = player.get('partnerGroup');
    const acknowledgedGroup = player.get('acknowledgeGroup') || false;


    const topic = player.get('topic');
    const opinionSurveyResponses = player.get('submitOpinionSurvey');
    const opinionStrength = opinionSurveyResponses[topic]

    const game = useGame();
    const stageTimer = useStageTimer();

    const [step, setStep] = useState(1);
    const [text, setText] = useState('');
    const [autocompleteOptions, setAutocompleteOptions] = useState(['']);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const [typingIndicator, setTypingIndicator] = React.useState(null);
    const [reportPartnerText, setReportPartnerText] = useState('Report Language');
    const [reportPartnerStatus, setReportPartnerStatus] = useState(false);
    // const [debouncedIsTyping, setDebouncedIsTyping] = React.useState(false);


    // Empirica message state
    const chatChannel = player.get('chatChannel');
    const typingChannel = player.get('typingChannel') || '';
    const messages = game.get(chatChannel);
    let pairTypingStatus = game.get(typingChannel) || [false, false];
    
    // The typing channel is an attribute of the game that allows participants to see when their partner types and vice versa
    // We store these statuses in an array, so we need to get which array index is the player and which is the partner
    const participantIdx = typingChannel.split('-').indexOf(player.id)-1;
    const partnerIdx = 1 - participantIdx;


    const [msgsUI, setMsgsUI] = useState([]);
    let msgKey = 'm';
    let msgIdx = 0;
    let msgCount = 0;

    const valueRef = useRef(text);
    valueRef.current = text;
    // const inputRef = useRef();

    function updateTypingStatus(idx, val) {
        setIsTyping(val);
        const typingStatus = pairTypingStatus;
        typingStatus[idx] = val;
        return typingStatus;
    }

    // Setup communication with Python server
    useEffect(() => {

        window.autocompletion = undefined;
        // TEST-ONLY
        // setAutocompleteOptions(['Hi there! I\'m happy to chat with you about this topic'])

        // Handle receiving a message from the server
        window.nlpServer.onmessage = (msg) => {

            const data = JSON.parse(msg.data);
            
            let currentAutocompletion = typeof(window.autocompletion) === 'undefined' ?  '' : window.autocompletion;

            // Get autocompleted text
            let partial_reply = data.partial_reply;
            
            // Remove any generated text that starts a new sentence. (Only complete the current sentence)
            // const re = new RegExp( "[\.|\!|\?]", "g" );
            // re.test(completion);
            // if (re.lastIndex > 0) completion = completion.substring(0, re.lastIndex);

            // Store autocompleted text
            currentAutocompletion += partial_reply;

            window.autocompletion = currentAutocompletion;

            setAutocompleteOptions([currentAutocompletion]);
          };

        // Send a message to the server if the user has stopped typing for a couple seconds
        const interval = setInterval(() => { 

            // Only ask for an autocompletion once, when the user stops typing for a couple seconds
            game.set(typingChannel, updateTypingStatus(participantIdx, false));

            // Send a message to the Python server asking for an autocompletion
            if (window.autocompletion === undefined) {
                window.autocompletion = '';
                window.nlpServer.send(JSON.stringify({
                    command: 'autocomplete',
                    pairId: player.id,
                    incomplete_msg: valueRef.current
                }));
            }

        }, 5 * 1000);

        // This function is run to cleanup (remove) the infinite loop of generating autocompletions when this component is unmounted
        return () => clearInterval(interval); 
    }, []);

    useEffect(() => {
        if (typeof(messages) == 'object' && 'length' in messages) {
            const uiElems = [];

            let firstFromSender = true;
            let lastSender = -1;

            if (messages.length == 2) {
                window.nlpServer.send(JSON.stringify({
                    command: 'initialize_history',
                    pairId: player.id,
                    history: [messages[0].txt, messages[1].txt]
                }));
            }

            for (const msg of messages) {
                
                firstFromSender = lastSender != msg.sender;
                lastSender = msg.sender

                let senderTxt = '';
                if (msg.sender == playerId) {
                    senderTxt = 'You';
                } else if (msg.sender != playerId && msg.sender != -1) {
                    senderTxt = 'Partner';
                }

                let avatar = '';
                let msgClass = '';
                if (msg.sender == -1) {
                    avatar = <Avatar src='images/smart_toy.svg' size='sm' />;
                    msgClass = 'botMsg';
                }
                if (msg.sender == -999) {
                    senderTxt = "🤖";
                    msgClass = 'treatmentMsg';
                }

                uiElems.push(<Message className={msgClass} model={{
                    message: msg.txt,
                    sentTime: "just now",
                    sender: 'p'+msg.sender,
                    direction: msg.sender == playerId ? 'outgoing' : 'incoming',
                    position: 'single',
                    }} key={msgKey + msgIdx} avatarPosition="tl"><Message.Header sender={senderTxt} />{avatar}</Message>);
                msgIdx++;
            }
            let newMsgCount = msgIdx;
            if (newMsgCount > msgCount) {
                msgCount = newMsgCount;
                setMsgsUI(uiElems);
            }
        }
    }, [messages]);

    useEffect(() => {
        if (pairTypingStatus[partnerIdx] == true) {
            setTypingIndicator(<TypingIndicator content='Partner is typing'/>);
        } else {
            setTypingIndicator(null);
        }
    }, [pairTypingStatus])
    
    // Process sending a message to the partner
    function handleSend() {
        game.set(chatChannel, [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: text
        }]);

        game.set(typingChannel, updateTypingStatus(participantIdx, false));
    }

    // Process typing in the message input field
    function handleChange(txt) {
        setText(txt.target.value);

        if (!isTyping) {
            game.set(typingChannel, updateTypingStatus(participantIdx, true));
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            setText('');
            handleSend();
        }
      }

    function handleButtonClick(evt) {
        // next();
        player.stage.set('submit', true);
    }
    function goToChat() {
        player.set('acknowledgeGroup', true);

    }

    const handleAutocompleteFill = (val) => {
        player.set('acceptSuggestion', [...player.get('acceptSuggestion'), val])
    }

    let reportPartnerInterval = null;
    const handleReportPartner = () => {
        if (reportPartnerStatus) {
            setReportPartnerText('Report Language');
            setReportPartnerStatus(false);
            window.reportPartnerTimer = 0;
            TimerMixin.clearInterval(reportPartnerInterval);

            game.set('reportPartner', {victim: player.id});
        } else {
            setReportPartnerStatus(true);
            setReportPartnerText('Confirm (5s)');
            window.reportPartnerTimer = 4;
            reportPartnerInterval = TimerMixin.setInterval(() => {
                if (window.reportPartnerTimer <= 0) {
                    setReportPartnerText('Report Language');
                    setReportPartnerStatus(false);
                    TimerMixin.clearInterval(reportPartnerInterval);
                } else {
                    setReportPartnerText('Confirm ('+window.reportPartnerTimer+'s)');
                    window.reportPartnerTimer--;
                }
            }, 1000);
        }
    }

    const handleSuggestionClick = () => {
        setText(autocompleteOptions[0]);
    }

    const groupTxt = playerGroup == partnerGroup ? 'the same' : 'a different';
    const groupGraphic = playerGroup == partnerGroup ? 
    <WithinGroupGraphic topic={topic} opinionDirection={opinionStrength} />
    : <AcrossGroupGraphic topic={topic} opinionDirection={opinionStrength} />;
    const groupImg = playerGroup == partnerGroup
        ? <img src="images/shake0.png" id="groupTypeIcon" className="sameGroup"/>
        : <img src="images/vs0.png" id="groupTypeIcon" />;

    const acknowledgeGroupUI = <Stack sx={{
        maxWidth: {
            sm: '30rem',
            md: '30rem'
        },
        mx: 'auto',
        mt: '10rem',
        textAlign: 'center'
    }} gap={1}>
        <Typography level="body-md">
            We finished grouping like-minded participants and assigning conversation partners.
        </Typography>
        <Typography level="h1">
            Your partner is from {groupTxt} group.
        </Typography>
        {groupGraphic}
        <Typography level="body-md">
            Next, you will chat with your partner about an assigned topic.
        </Typography>
        <Button onClick={goToChat}>Continue to Chat</Button>
    </Stack>;

    const skipButtonUI = window.location.hostname == 'localhost'
        ? <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}><Button sx={{ my: 2 }} onClick={handleButtonClick}>(Development Only) Skip</Button></Box>
        : '';

    const suggestionClass = autocompleteOptions[0].length > 0 ? 'msgSend treatment' : 'msgSend treatment hidden';
    const autocompleteUI = <div className={suggestionClass}>
        <span>Suggestion (click to copy)</span>
        <div className="input-wrapper">
            {/* <textarea value={autocompleteOptions[0]}></textarea> */}
            <div onClick={handleSuggestionClick}>{autocompleteOptions[0]}</div>
        </div>
        <IconButton variant='plain' size="sm">&#x1F916;</IconButton>
    </div>;

    const chatUI = <Stack sx={{
        maxWidth: {
            sm: '30rem',
            md: '30rem'
        },
        mx: 'auto',
        mt: '10rem',
    }} gap={1} >
        <Typography level="h2" textAlign="center">
       Chat
        </Typography>
        <Typography level="body-md" textAlign="center">{msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)} remaining</Typography>
        <MainContainer>
            <ChatContainer style={{height: '25rem'}}>       
                <MessageList typingIndicator={typingIndicator}>
                    {msgsUI}
                </MessageList>
                
                    {/* <MessageInput placeholder="Type message here" onSend={handleSend} onChange={handleChange} attachButton={null}> */}
                    
                    {/* </MessageInput> */}
                
            </ChatContainer>
            <div className='msgSend'>
                <Hint options={autocompleteOptions} allowTabFill={true} onFill={handleAutocompleteFill}>
                    <input type="text" placeholder="Type a message here" value={text} onChange={handleChange} onKeyDown={handleKeyDown}/>
                </Hint>
                <IconButton variant="plain" onClick={handleSend}>
                    <SendRoundedIcon />
                </IconButton>
            </div>
            {autocompleteUI}
        </MainContainer>
        {skipButtonUI}
        <Button variant='outlined' color="danger" onClick={handleReportPartner} sx={{
            flex: 0,
            width: '10rem',
            mx: 'auto',
            mb: '2rem'}}
        >{reportPartnerText}</Button>
    </Stack>;

    const ui = acknowledgedGroup ? chatUI : acknowledgeGroupUI;

    return (
        <Container maxWidth="100vw">
            {ui}   
        </Container>
        );
    }