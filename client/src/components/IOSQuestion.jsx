/*
 * Filename: LikertQuestion.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component is a 7-point likert-style radio button input element.
 */
import React from "react";
import { FormControl, FormLabel, Typography, RadioGroup } from '@mui/joy';
import ImageRadioButton from "./ImageRadioButton.jsx";

// import IOS1Partner from '../images/IOS 1 Partner.svg';
// import IOS2Partner from '../images/IOS 2 Partner.svg';
// import IOS3Partner from '../images/IOS 3 Partner.svg';
// import IOS4Partner from '../images/IOS 4 Partner.svg';
// import IOS5Partner from '../images/IOS 5 Partner.svg';
// import IOS6Partner from '../images/IOS 6 Partner.svg';
// import IOS7Partner from '../images/IOS 7 Partner.svg';

// import IOS1AI from '../images/IOS 1 AI.svg';
// import IOS2AI from '../images/IOS 2 AI.svg';
// import IOS3AI from '../images/IOS 3 AI.svg';
// import IOS4AI from '../images/IOS 4 AI.svg';
// import IOS5AI from '../images/IOS 5 AI.svg';
// import IOS6AI from '../images/IOS 6 AI.svg';
// import IOS7AI from '../images/IOS 7 AI.svg';





export default function IOSQuestion({
    onChange = null,
    value=null,
    type='partner'
}) {

    const typeTxt = (type == 'partner') ? ' Partner' : ' AI';
    return (
            <FormControl>
                <FormLabel></FormLabel>
                <RadioGroup
                    overlay
                    name={name}
                    value={value}
                    orientation="horizontal"
                    sx={{ display: 'flex', flexDirection: 'row', mx: 'auto', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}
                    onChange={onChange}
                >
                    <ImageRadioButton src={"/images/IOS 1"+typeTxt+".svg"} value="0" />
                    <ImageRadioButton src={"/images/IOS 2"+typeTxt+".svg"} value="1" />
                    <ImageRadioButton src={"/images/IOS 3"+typeTxt+".svg"} value="2" />
                    <ImageRadioButton src={"/images/IOS 4"+typeTxt+".svg"} value="3" />
                    <ImageRadioButton src={"/images/IOS 5"+typeTxt+".svg"} value="4" />
                    <ImageRadioButton src={"/images/IOS 6"+typeTxt+".svg"} value="5" />
                    <ImageRadioButton src={"/images/IOS 7"+typeTxt+".svg"} value="6" />
                </RadioGroup>
            </FormControl>
    );
}
