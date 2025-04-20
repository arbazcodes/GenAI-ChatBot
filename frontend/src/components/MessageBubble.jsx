// src/components/MessageBubble.jsx
import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const MessageBubble = ({ type, children, isError }) => {
  const isBot = type === 'bot';
  
  return (
    <Box sx={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', mb: 2 }}>
      <Paper sx={{
        p: 2,
        maxWidth: '80%',
        backgroundColor: isError ? '#ffebee' : isBot ? '#f0f0f0' : '#2196f3',
        color: isError ? '#b71c1c' : isBot ? 'inherit' : 'white',
        borderRadius: isBot ? '0 16px 16px 16px' : '16px 0 16px 16px'
      }}>
        {children}
      </Paper>
    </Box>
  );
};

export default MessageBubble;