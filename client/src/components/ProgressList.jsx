/*
 * Filename: ProgressList.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component wraps the study completion progress indicator in a list
 */
import React from "react";
import { List, ListItem, ListItemDecorator, ListItemContent } from "@mui/joy";
import { NavigateNext } from '@mui/icons-material';

export default function ProgressList({
    items = [],
    active = '0'
}) {

    let listItemUI = [];
    let itemIdx = 0
    for (const item of items) {
        itemIdx++;
        const isActive = active+1 == itemIdx ? 'active' : '';
        listItemUI.push(<ListItem className={isActive} key={item['name']}>
            <ListItemDecorator>{itemIdx}<NavigateNext /></ListItemDecorator>
            <ListItemContent>
                <strong>{item['name']}</strong>
                <span>{item['time']}</span>
            </ListItemContent>
        </ListItem>);
    }


    return (
            <List orientation='horizontal' className='progressList' sx={{
                justifyContent: 'center',
                mt: '2rem',
                mb: '2rem'
                }}>
                {listItemUI}
            </List>
    );
}


