/*
 * Filename: PublicGoods.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file evaluates the level at which whether a particpant will cooperate or defect from their partner(s).
 */
import * as React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChartsTooltip } from '@mui/x-charts';
import WarningIcon from '@mui/icons-material/Warning';
import { Alert, Button, Box, Container, FormControl, FormLabel, Grid, Typography, Stack, FormHelperText, List, ListItem, Radio, RadioGroup, Slider, Textarea } from '@mui/joy';
import { useState } from 'react';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

// TODO: Remove next?
export default function PublicGoodsGame({next}) {

    const player = usePlayer();
    const stageTimer = useStageTimer();
    const gameParams = player.get('gameParams');
    const game = useGame();
    const [step, setStep] = useState(1);
    const [cooperationExplanation, setCooperationExplanation] = useState('');
    const [hypothetical, setHypothetical] = useState('');
    
    const [shareType, setShareType] = useState('Share');
    const [shareAmt, setShareAmt] = useState(0);
    
    const riskDisplayClass = shareAmt > 0.5 ? '' : 'hidden';
    const minBonus = 1.0 - shareAmt;
    
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
        player.set('submitCooperationDecision', shareAmt);
        player.set('submitCooperationType', shareType);
        player.set('submitCooperationExplanation', cooperationExplanation);
        player.set('submitHypothetical', hypothetical);

        game.set('submitCooperationDecision', {
            playerId: player.id,
            cooperationDecision: shareAmt,
            cooperationType: shareType
        });
        next();
    }

    ChartJS.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        // Legend
      );

    const maxShareAmt = 1.0;

    const options = {
        responsive: true,
        plugins: {
        title: { display: false},
        },
        scales: {
            x: {
            grid: {
                display: false
            },
            ticks: {
                // labelOffset: 30
            }
            },
            y: {
            min: 0,
            max: ( gameParams.bonus - maxShareAmt )* 2,
            grid: {
                display: false
            }
            }
        },
        aspectRatio: 1,
    };
  

    const defaultPlayer = 1.0;
    const defaultPartner = 2.0;
    const currentPlayer = defaultPlayer - shareAmt;
    let currentPartner = defaultPartner;
    if (shareType == 'Share')   currentPartner += shareAmt*2;
    else                        currentPartner -= shareAmt*2;


    const labels = [['Default', formatMoney(defaultPlayer)], ['Current',formatMoney(currentPlayer)]];
  
    const data = {
        labels,
        datasets: [
        {
            label: '',
            data: [defaultPlayer,currentPlayer],
            backgroundColor: ['rgba(50, 50, 50, 0.2)','rgb(37, 99, 235)'],
        }
        ],
    };
    
    
    const partnerLabels = [['Default', formatMoney(defaultPartner)], ['Current',formatMoney(currentPartner)]];
    const partnerData = {
        labels: partnerLabels,
        datasets: [
        {
            label: 'Partner',
            data: [defaultPartner, currentPartner],
            backgroundColor: ['rgba(50, 50, 50, 0.2)','rgb(37, 99, 235)'],
        }
        ],
    };

    return (
        <Container maxWidth="100vw">
            <Stack sx={{
                maxWidth: {
                    md: '30rem'
                },
                mx: 'auto',
                mt: '10rem',
                alignItems: 'center'
            }} gap={1} >
                <Typography level="h2" textAlign="center">
                    Bonus Allocation
                </Typography>
                <Typography level="body-md" textAlign="center">
                    {msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)} remaining.
                    <br/><br/>
                    You have been awarded a {formatMoney(gameParams.bonus)} bonus. Please decide how you would like to allocate your bonus payment.
                    
                    You may:
                    </Typography>
                    <List component="ul" marker="disc">
                        <ListItem>Keep it all</ListItem>
                        <ListItem>Pay to <b>share</b> some with your partner</ListItem>
                        <ListItem>Pay to <b>take away</b> from your partner</ListItem>
                    </List>
                    <Typography level="body-md" textAlign="center">
                    The effect on your partner is 2x the amount you pay. Test out your options by moving the slider below.
                    </Typography>
                

                <Grid container columns={2} columnGap={8} justifyContent="center" alignItems="center">
                    <div className="potContainer">
                        <span>Effect on your<br />minimum bonus</span>
                        <Bar options={options} data={data}/>
                    </div>                
                    <div className="potContainer">
                        <span>Effect on partner's<br />minimum bonus</span>
                        <Bar options={options} data={partnerData} />
                    </div>
                </Grid>
                <Alert startDecorator={<WarningIcon/>} title="Risk" color="warning" className={riskDisplayClass} sx={{my: 3}}>
                    <div>
                        <div><strong>High Allocation Risk</strong></div>
                        <Typography level="body-sm" color="warning">
                            Your bonus could decrease to <strong>{formatMoney(minBonus)}</strong> depending on your partner's allocation decision.
                        </Typography>
                    </div>
                </Alert>
                <Typography level="body-md">Would you like to share or take away?</Typography>
                <RadioGroup aria-label="Share type" name="shareType" defaultValue="Share" onChange={(e)=>setShareType(e.target.value)}>
                        <List
                            sx={{
                            '--List-gap': '0.5rem',
                            '--ListItem-paddingY': '1rem',
                            '--ListItem-radius': '8px',
                            '--ListItemDecorator-size': '32px',
                            }}
                        >
                            {[ 'Share',
                                'Take'].map((item, index) => (
                            <ListItem variant="outlined" key={item} sx={{ boxShadow: 'sm' }}>
                                <Radio
                                overlay
                                value={item}
                                label={item}
                                sx={{ flexGrow: 1, flexDirection: 'row-reverse' }}
                                slotProps={{
                                    action: ({ checked }) => ({
                                    sx: (theme) => ({
                                        ...(checked && {
                                        inset: -1,
                                        border: '2px solid',
                                        borderColor: theme.vars.palette.primary[500],
                                        }),
                                    }),
                                    }),
                                }}
                                />
                            </ListItem>
                            ))}
                        </List>
                    </RadioGroup>
                    <Typography level="body-md">Use the slider to specify an amount from $0 to $1</Typography>
                <Slider 
                
                style={{width: '20rem', mx: 'auto'}}
                defaultValue={0} min={0} max={maxShareAmt} step={0.1} onChange={(e)=>setShareAmt(e.target.value)}/>


                <Typography level='body-md' textAlign={'center'}>To help us understand your decision, it would be great if you could answer the following questions.</Typography>
                <FormControl>
                    <FormLabel>Please explain why you selected to {shareType.toLowerCase()} {formatMoney(shareAmt)}</FormLabel>
                    <Textarea minRows={3} value={cooperationExplanation} onChange={(e) => setCooperationExplanation(e.target.value)} placeholder="Type answer here"/>
                    {/* <FormHelperText>This is a helper text.</FormHelperText> */}
                </FormControl>

                <FormControl>
                    <FormLabel sx={{textAlign:'center'}}>In what situation would you make a different decision?</FormLabel>
                    <Textarea minRows={3} value={hypothetical} onChange={(e) => setHypothetical(e.target.value)} placeholder="Type answer here"/>
                    {/* <FormHelperText>This is a helper text.</FormHelperText> */}
                </FormControl>

                {/* <RadioGroup
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
                </RadioGroup> */}

                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2 }} onClick={handleButtonClick}>Confirm Decision</Button>
                </Box>
            </Stack>
            
        </Container>
        );
    }