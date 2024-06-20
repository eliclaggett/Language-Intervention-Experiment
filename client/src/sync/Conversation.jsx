/*
 * Filename: Conversation.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays a chat window for participants to discuss with each other about assigned topics.
 */
import React,{ useState, useEffect, useRef } from 'react';
import { Alert, Button, Box, Container, IconButton, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import { PlayCircleRounded, PlaylistRemoveTwoTone, SmartToyOutlined, SendRounded, ScheduleSendRounded, Warning, SentimentVerySatisfied, SentimentVerySatisfiedRounded, FastForwardRounded } from '@mui/icons-material';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';
import { wsSend } from '../utils/utils.js';

import '../chat.scss';
import { Avatar, MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import { State } from '@empirica/tajriba';

import WithinGroupGraphic from '../components/WithinGroupGraphic.jsx';
import AcrossGroupGraphic from '../components/AcrossGroupGraphic.jsx';

// import { Hint } from 'react-autocomplete-hint';
import { Hint } from'../utils/react-autocomplete-hint/dist/src/index.js'; // Use custom hint to show autocomplete suggestions as soon as they are generated
// import { clearInterval } from 'timers';
import TimerMixin from 'react-timer-mixin';
import TaskInstructions from '../components/TaskInstructions.jsx';

import {
	RegExpMatcher,
	TextCensor,
	englishDataset,
	englishRecommendedTransformers,
    keepStartCensorStrategy
} from 'obscenity';

// TODO: Remove next?
export default function Conversation({next}) {

    // const timerMixin = TimerMixin();
    const player = usePlayer();
    const game = useGame();
    const playerId = player.id;
    const msgCount = player.get('msgCount') || 999;
    const [playerMsgCount, setPlayerMsgCount] = useState(0);
    const gameParams = player.get('gameParams');
    const playerGroup = player.get('group') || 0;
    const partnerGroup = player.get('partnerGroup') || 0;
    const pairType = playerGroup == partnerGroup ? 0 : 1;
    const acknowledgedGroup = player.get('acknowledgeGroup') || false;
    const readInstructions = player.get('readChatFeatures') || false;
    const msgUnderReview = player.get('msgUnderReview') || '';
    const [editingMsg, setEditingMsg] = useState(false);
    const [rngPerMessage, setRngPerMessage] = useState(0);
    const earlyFinishTimeLeft = player.get('earlyFinishTime');
    const conversationStartTime = game.get('conversationStartTime');
    const cooperationDiscussionStartTime = game.get('cooperationDiscussionStartTime');
    const matcher = new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
    });

    const topic = player.get('topic') || 'q1';
    const opinionSurveyResponses = player.get('submitOpinionSurvey');
    const opinionStrength = opinionSurveyResponses ? opinionSurveyResponses[topic] : 0;

    const stageTimer = useStageTimer();
    const currentStage = game.get('currentStage');

    const forceEarlyFinish = player.get('forceEarlyFinish');
    const [step, setStep] = useState(1);
    const [suggestionIdx, setSuggestionIdx] = useState(-1);
    const [numMsgsSent, setNumMsgsSent] = useState(0);
    const [text, setText] = useState('');
    const [autocompleteOptions, setAutocompleteOptions] = useState(['']);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const [typingIndicator, setTypingIndicator] = React.useState(null);
    const [reportPartnerText, setReportPartnerText] = useState('Report Partner');
    const [reportPartnerStatus, setReportPartnerStatus] = useState(false);
    const [skipDisplay, setSkipDisplay] = useState('none');
    // const [debouncedIsTyping, setDebouncedIsTyping] = React.useState(false);


    // Empirica message state
    const chatChannel = player.get('chatChannel');
    // console.log(chatChannel.split('-')[2]);
    const typingChannel = player.get('typingChannel') || '';
    const messages = game.get(chatChannel) || [];
    let pairTypingStatus = game.get(typingChannel) || [false, false];
    
    // The typing channel is an attribute of the game that allows participants to see when their partner types and vice versa
    // We store these statuses in an array, so we need to get which array index is the player and which is the partner
    const participantIdx = typingChannel.split('-').indexOf(player.id)-1;
    const partnerIdx = 1 - participantIdx;
    const partnerId = player.get('partnerId');

    const [msgsUI, setMsgsUI] = useState([]);
    let msgKey = 'm';
    let msgIdx = 0;

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

        window.suggestion = undefined;
        window.canRequestAutocomplete = true;
        window.requestRewrite = false;

        // TEST-ONLY
        // setAutocompleteOptions(['Hi there! I\'m happy to chat with you about this topic'])


        if (messages && messages.length >= 2) {
            const histMsgs = messages;
            histMsgs[0].personId = -1;
            histMsgs[1].personId = -1;

            wsSend(JSON.stringify({
                command: 'update_history',
                pairId: player.id,
                pairType: pairType,
                history: histMsgs,
                topic: parseInt(topic.substring(1))-1,
                topicAgree: opinionStrength,
                treatmentAlgorithm: gameParams.treatmentAlgorithm
            }), true);
        }

        // Handle receiving a message from the server
        window.suggestionIdx = -1;
        window.nlpServer.onmessage = (msg) => {

            const data = JSON.parse(msg.data);
            
            if(data.idx != window.suggestionIdx) {
                window.suggestion = '';
                window.suggestionIdx = data.idx;
            }
            let currentSuggestion = typeof(window.suggestion) === 'undefined' || window.suggestion == 'undefined' ? '' : window.suggestion;
            
            // Get autocompleted text
            let partial_reply = data.partial_reply;
            
            // Remove any generated text that starts a new sentence. (Only complete the current sentence)
            // const re = new RegExp( "[\.|\!|\?]", "g" );
            // re.test(completion);
            // if (re.lastIndex > 0) completion = completion.substring(0, re.lastIndex);

            // Store autocompleted text
            if (partial_reply != '[EOS]') {
                currentSuggestion += partial_reply;
                window.suggestion = currentSuggestion;
            } else {

                // Remove 'You: '
                if (currentSuggestion.slice(0, 4).toLowerCase() == 'you:') {
                    currentSuggestion = currentSuggestion.slice(currentSuggestion.indexOf(':')+1).trim();
                }

                // Remove surrounding quotes
                if (currentSuggestion[0] == '"' && currentSuggestion[-1] == '"') {
                    currentSuggestion = currentSuggestion.slice(1,-1);
                }

                // Convert to lowercase to match participant's style
                let convertToLowercase = false;
                for(let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i].sender == playerId) {
                        if (messages[i].txt === messages[i].txt.toLowerCase()) convertToLowercase = true;
                        break;
                    }
                }
                if (convertToLowercase) currentSuggestion = currentSuggestion.toLowerCase();


                
                currentSuggestion = currentSuggestion.replace('PARTNER', 'partner');
                
                // Remove obscenities
                const asteriskStrategy = (ctx) => '*'.repeat(ctx.matchLength);
                const censor = new TextCensor().setStrategy(keepStartCensorStrategy(asteriskStrategy));
                const matches = matcher.getAllMatches(currentSuggestion);
                currentSuggestion = censor.applyTo(currentSuggestion, matches);
                
                if (currentSuggestion != 'undefined') {
                    window.suggestion = currentSuggestion;
                }

                console.log(currentSuggestion);
                player.set('showSuggestion', currentSuggestion);
                setAutocompleteOptions([currentSuggestion]);
                window.requestRewrite = false;
            }
          };

        // Send a message to the server if the user has stopped typing for a couple seconds
        const interval = setInterval(() => { 

            // Only ask for an autocompletion once, when the user stops typing for a couple seconds
            game.set(typingChannel, updateTypingStatus(participantIdx, false));

            // Send a message to the Python server asking for an autocompletion
            // if (window.suggestion === undefined && window.canRequestAutocomplete == true) {
            //     window.suggestion = '';
            //     wsSend(JSON.stringify({
            //         command: 'autocomplete',
            //         pairId: player.id,
            //         incomplete_msg: valueRef.current
            //     }));
            // }

        }, 5 * 1000);

        // const histMsgs = messages.length > 1 ? [messages[0], messages[1]] : [{},{}];
        // histMsgs[0].personId = -1;
        // histMsgs[1].personId = -1;
        // wsSend(JSON.stringify({
        //     command: 'update_history',
        //     pairId: player.id,
        //     pairType: pairType,
        //     topic: parseInt(topic.substring(1))-1,
        //     topicAgree: opinionStrength,
        //     history: histMsgs
        // }), true);

        // This function is run to cleanup (remove) the infinite loop of generating autocompletions when this component is unmounted
        return () => clearInterval(interval); 
    }, []);

    useEffect(() => {
        if (typeof(messages) == 'object' && 'length' in messages) {
            const uiElems = [];

            let firstFromSender = true;
            let lastSender = -1;

            const histMsgs = messages.length > 1 ? [messages[0], messages[1]] : [{},{}];
            histMsgs[0].personId = -1;
            histMsgs[1].personId = -1;

            // if (messages.length == 2) {
            //     wsSend(JSON.stringify({
            //         command: 'update_history',
            //         pairId: player.id,
            //         pairType: pairType,
            //         topic: parseInt(topic.substring(1))-1,
            //         topicAgree: opinionStrength,
            //         history: histMsgs
            //     }), true);
            // }

            let numMyMsgs = 0;
            let numPlayerMsgs = 0;
            for (const msg of messages) {
                
                firstFromSender = lastSender != msg.sender;
                lastSender =  { ...msg }.sender

                let senderTxt = '';
                if (msg.sender == playerId) {
                    numMyMsgs += 1;
                    numPlayerMsgs += 1;
                    senderTxt = 'You';
                } else if (msg.sender == partnerId) {
                    senderTxt = 'Partner';
                    numPlayerMsgs += 1;
                }

                let avatar = '';
                let msgClass = '';
                if (msg.sender == -1) {
                    avatar = <Avatar src='images/smart_toy.svg' size='sm' />;
                    msgClass = 'botMsg';
                }
                else if (msg.sender == '-'+playerId) {
                    msgClass = 'youLeftMsg';
                }
                else if (msg.sender == '-'+partnerId) {
                    msgClass = 'partnerLeftMsg';
                }
                else if (msg.sender == -999) {
                    senderTxt = "🤖";
                    msgClass = 'treatmentMsg';
                }

                uiElems.push(<Message className={msgClass} model={{
                    message: msg.txt,
                    sentTime: "just now",
                    sender: 'p'+msg.sender,
                    direction: (msg.sender == playerId || msg.sender == '-'+playerId) ? 'outgoing' : 'incoming',
                    position: 'single',
                    }} key={msgKey + msgIdx} avatarPosition="tl"><Message.Header sender={senderTxt} />{avatar}</Message>);
                msgIdx++;
            }
            setPlayerMsgCount(numPlayerMsgs);
            setNumMsgsSent(numMyMsgs);
            let newMsgCount = msgIdx;
            if (newMsgCount > msgCount) {
                const newMsgs = messages.slice(msgCount - newMsgCount);
                player.set('msgCount', newMsgCount);
                for (const msg of newMsgs) {
                    let personId = 1;
                    if (msg.sender == playerId) personId = 0;
                    else if (msg.sender == -1) personId = -1;
                    msg.personId = personId;

                    wsSend(JSON.stringify({
                        command: 'update_history',
                        pairId: player.id,
                        pairType: pairType,
                        personId: personId,
                        msg: msg,
                        topic: parseInt(topic.substring(1))-1,
                        topicAgree: opinionStrength,
                        treatmentAlgorithm: gameParams.treatmentAlgorithm
                    }), true);
                }
                
            }
            setMsgsUI(uiElems);

            if (numPlayerMsgs >= gameParams.numMsgsFinishEarly && !player.get('requestEarlyFinish') && !player.get('forceEarlyFinish')) {
                setSkipDisplay('flex');
            }
        }
    }, [messages]);

    useEffect(() => {
        if (forceEarlyFinish) {
            setSkipDisplay('none');
        }
    }, [forceEarlyFinish]);

    useEffect(() => {
        if (
            msgCount > 0
            && messages.length > 0
            && messages[messages.length - 1].sender != playerId
            && messages[messages.length - 1].sender != -1
            && currentStage != 'cooperationDiscussion'
            && gameParams.treatmentType == 'suggestion'
        ){
            // Send a message to the Python server asking for an autocompletion if...
            // - We receive a message from the partner
            // - The last message was sufficiently long?
            // - There's been a long pause
            // - We are in the main conversation step (not the bonus discussion)
            window.suggestion = '';
            if (rngPerMessage <= gameParams.suggestionProbability) {
                TimerMixin.setTimeout(() => {
                    wsSend(JSON.stringify({
                        command: 'suggest',
                        pairId: player.id,
                        incomplete_msg: valueRef.current
                    }));
                }, 5000);
            }
        } else {
            window.suggestion = '';
            setAutocompleteOptions(['']);
        }
        setRngPerMessage(Math.random());
    }, [msgCount]);

    useEffect(() => {
        if (pairTypingStatus[partnerIdx] == true) {
            setTypingIndicator(<TypingIndicator content='Partner is typing'/>);
        } else {
            setTypingIndicator(null);
        }
    }, [pairTypingStatus]);

    useEffect(() => {
        const el = document.querySelector('textarea');
        if (el) {
            el.style.height = "";el.style.height = el.scrollHeight + "px"   
        }
    }, [text]);

    // Process sending a message to the partner
    function handleSend() {
        game.set(chatChannel, [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: text
        }]);

        setAutocompleteOptions(['']);
        setText('');
        setEditingMsg(false);
        window.canRequestAutocomplete = true;
        window.suggestion = undefined;

        game.set(typingChannel, updateTypingStatus(participantIdx, false));
    }

    function handleScheduleSend() {

        const updatedMessageList = [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: text,
        }];

        for(const msg of updatedMessageList) {
            let personId = 1;
            if (msg.sender == playerId) personId = 0;
            else if (msg.sender == -1) personId = -1;
            msg.personId = personId;
        }

        updatedMessageList[0].personId = -1;
        updatedMessageList[1].personId = -1;

        wsSend(JSON.stringify({
            command: 'rewrite',
            pairId: player.id,
            pairType: pairType,
            history: updatedMessageList,
            topic: parseInt(topic.substring(1))-1,
            topicAgree: opinionStrength
        }), true);
        
        window.requestRewrite = true;

        player.set('msgUnderReview', text);
        setEditingMsg(true);

        // game.set(chatChannel, updatedMessageList);

        // setAutocompleteOptions(['']);
        // setText('');
        // window.canRequestAutocomplete = true;
        // window.suggestion = undefined;

        game.set(typingChannel, updateTypingStatus(participantIdx, false));

    }
    function handleSendOriginal() {
        game.set(chatChannel, [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: msgUnderReview
        }]);

        setText('');
        setAutocompleteOptions(['']);
        setEditingMsg(false);
        player.set('msgUnderReview' ,'');

        game.set(typingChannel, updateTypingStatus(participantIdx, false));
    }
    function handleSendRewrite() {
        game.set(chatChannel, [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: autocompleteOptions[0]
        }]);

        setText('');
        setAutocompleteOptions(['']);
        setEditingMsg(false);
        player.set('msgUnderReview' ,'');

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
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend();
            e.preventDefault();
        }
    }
    const handleScheduleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleScheduleSend();
            e.preventDefault();
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
            setReportPartnerText('Report Partner');
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
                    setReportPartnerText('Report Partner');
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
        setAutocompleteOptions(['']);
        window.canRequestAutocomplete = false;
        player.set('acceptSuggestion', autocompleteOptions[0]);
    }
    const handleSendSuggestion = () => {
        player.set('acceptSuggestion', autocompleteOptions[0]);

        game.set(chatChannel, [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: autocompleteOptions[0]
        }]);

        setAutocompleteOptions(['']);
        setText('');
        setEditingMsg(false);
        window.canRequestAutocomplete = true;
        window.suggestion = undefined;

        game.set(typingChannel, updateTypingStatus(participantIdx, false));
    }
    const handleRewriteClick = () => {
        setText(autocompleteOptions[0]);
        setAutocompleteOptions(['']);
        setEditingMsg(true);
        player.set('msgUnderReview' ,'');
        player.set('editRewrite', autocompleteOptions[0]);
    }
    const handleOriginalClick = () => {
        setText(msgUnderReview);
        setAutocompleteOptions(['']);
        setEditingMsg(true);
        player.set('msgUnderReview' ,'');
        player.set('editOriginal', msgUnderReview);
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
        <Button onClick={goToChat} sx={{mb: 4}}>Continue to Chat</Button>
    </Stack>;

    const readInstructionsUI = <div style={{marginTop: '10rem'}}><TaskInstructions /></div>;

    const skipButtonUI = window.location.hostname == 'localhost'
        ? <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}><Button sx={{ my: 2 }} onClick={handleButtonClick}>(Development Only) Skip</Button></Box>
        : '';

    const suggestionClass = autocompleteOptions[0].length > 0 && autocompleteOptions[0] != 'undefined' ? 'msgSend treatment' : 'msgSend treatment hidden';
    
    let autocompleteUI = '';
    let rewriteUI = '';
    let sendButtonUI = <IconButton variant="plain" onClick={handleSend}>
        <SendRounded />
    </IconButton>;

    let keyDownHandler = handleKeyDown; 

    if (gameParams.treatmentType == 'suggestion') {
        autocompleteUI = <div className={suggestionClass}>
            <span onClick={handleSuggestionClick}>Suggestion (click to copy)</span>
            <div className="input-wrapper">
                {/* <textarea value={autocompleteOptions[0]}></textarea> */}
                <div onClick={handleSuggestionClick}>{autocompleteOptions[0]}</div>
            </div>
            <IconButton variant="plain" onClick={handleSendSuggestion}>
                <SendRounded />
            </IconButton>;
        </div>;
    } else if (gameParams.treatmentType == 'rewrite' && !editingMsg && rngPerMessage <= gameParams.suggestionProbability) {
        rewriteUI = <div className={suggestionClass}>
            <span onClick={handleSuggestionClick}>Suggestion (click to copy)</span>
            <div className="input-wrapper">
                {/* <textarea value={autocompleteOptions[0]}></textarea> */}
                <div onClick={handleSuggestionClick}>{autocompleteOptions[0]}</div>
            </div>
            <IconButton variant='plain' size="sm">&#x1F916;</IconButton>
        </div>;
        sendButtonUI = <IconButton variant="plain" onClick={handleScheduleSend}>
            <ScheduleSendRounded />
        </IconButton>;
        keyDownHandler = handleScheduleKeyDown; 
    }

    // FUTURE: Undo disabling the autocomplete hint
    let msgSendUI = <div className='msgSend'>
        <Hint options={[]} allowTabFill={true} onFill={handleAutocompleteFill}>
            <textarea rows={1} value={text} onChange={handleChange} onKeyDown={keyDownHandler} className='hintedText' placeholder='Type a message here'></textarea>
            {/* <input type="text" placeholder="Type a message here" value={text} onChange={handleChange} onKeyDown={handleKeyDown}/> */}
        </Hint>
        {sendButtonUI}
    </div>;
    
    if (msgUnderReview.length > 0 && autocompleteOptions[0].length > 0 && autocompleteOptions[0] != 'undefined' ) {
        msgSendUI = <div className='msgSend treatment original'>
            <div id="rewriteHint">pick a<br />message</div>
            <span onClick={handleOriginalClick}>Original message </span>
            <div className="input-wrapper">
                <div onClick={handleOriginalClick}>{msgUnderReview}</div>
            </div>
            <IconButton variant="plain" onClick={handleSendOriginal}>
                <SendRounded />
            </IconButton>
        </div>;
        rewriteUI = <div className='msgSend treatment'>
            <span onClick={handleRewriteClick}>Suggested rephrasing (click to edit)</span>
            <div className="input-wrapper">
                {/* <textarea value={autocompleteOptions[0]}></textarea> */}
                <div onClick={handleRewriteClick}>{autocompleteOptions[0]}</div>
            </div>
            <IconButton variant="plain" onClick={handleSendRewrite}>
                <SendRounded />
            </IconButton>
        </div>;
    }

    if (window.requestRewrite) {
        msgSendUI = <div className='msgSend'>
            Analyzing message...
        </div>;
        rewriteUI = '';
    }

    let warningDisplay = 'none';
    if (stageTimer && stageTimer.elapsed / 1000 / 60 > 3 && numMsgsSent < 2) {
        warningDisplay = 'flex';
    }

    function handleEarlyFinish() {
        // TODO: Implement early finish
        // game.set(chatChannel, [...messages, {
        //     sender: '-'+playerId,
        //     sentTime: 'just now',
        //     txt: ''
        // }]);
        player.set('requestEarlyFinish', true);
        game.set('earlyFinishTime', {
            playerId: player.id,
            finishTime: stageTimer?.remaining ? stageTimer.remaining : 0}
        );
        setSkipDisplay('none');
    }

    let timeLeft = stageTimer?.remaining ? stageTimer.remaining : 0;
    const elapsed = stageTimer?.elapsed ? stageTimer.elapsed : 0;

    if ((forceEarlyFinish || player.get('requestEarlyFinish')) && stageTimer) {
        timeLeft = gameParams.cooperationDiscussionTime * 1000 * 60 - (earlyFinishTimeLeft - timeLeft);
        if (timeLeft <= 0) {
            next();
        }
    } else if (currentStage == 'cooperationDiscussion') {
        timeLeft = (gameParams.chatTime + gameParams.cooperationDiscussionTime) * 1000 * 60 - elapsed;
        if (timeLeft <= 0) {
            next();
        }
    } else {
        // conversation discussion
        timeLeft = gameParams.chatTime * 1000 * 60 - elapsed;
    }

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
        <Typography level="body-md" textAlign="center">{msToTime(timeLeft)} remaining</Typography>
        <Alert
            variant="soft"
            color="danger"
            invertedColors
            startDecorator={
                <Warning />
            }
            sx={{ alignItems: 'flex-start', gap: '1rem', display: warningDisplay }}
        >
            <Box sx={{ flex: 1 }}>
            <Typography level="h3">Inactivity warning!</Typography>
            <Typography level="body-md">
                If you do not actively participate in this chat, you will be removed from this study.
            </Typography>
            </Box>
        </Alert>
        <MainContainer style={{overflow: 'visible'}}>
            <ChatContainer style={{height: '25rem'}}>       
                <MessageList typingIndicator={typingIndicator}>
                    {msgsUI}
                </MessageList>
                
                    {/* <MessageInput placeholder="Type message here" onSend={handleSend} onChange={handleChange} attachButton={null}> */}
                    
                    {/* </MessageInput> */}
                
            </ChatContainer>
            {msgSendUI}
            {rewriteUI}
            {autocompleteUI}
            <div className='msgSend'>
                <Alert
                    variant="soft"
                    color="neutral"
                    invertedColors
                    startDecorator={
                        <FastForwardRounded />
                    }
                    style={{alignItems: 'flex-start', display: currentStage != 'cooperationDiscussion' ? skipDisplay : 'none'}}
                >
                    <Box sx={{ flex: 1, mt: -0.25 }}>
                        <Typography level="body-md">
                            Thanks for your active participation! You may end the chat early if you'd like.
                        </Typography>
                        <Box sx={{ mt: -0, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button variant="outlined" size="sm" onClick={handleEarlyFinish}>
                                Go to next step
                            </Button>
                        </Box>
                    </Box>
                </Alert>
            </div>
        </MainContainer>
        {skipButtonUI}
        <Button variant='outlined' color="danger" onClick={handleReportPartner} sx={{
            flex: 0,
            width: '10rem',
            mx: 'auto',
            mb: '2rem'}}
        >{reportPartnerText}</Button>
    </Stack>;

    let ui = '';
    if (acknowledgedGroup) {
        if (readInstructions) {
            ui = chatUI;
        } else {
            ui = readInstructionsUI;
        }
    } else {
        ui = acknowledgeGroupUI;
    }

    return (
        <Container maxWidth="100vw">
            {ui}   
        </Container>
        );
    }