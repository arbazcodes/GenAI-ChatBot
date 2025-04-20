// src/components/MessageBubble.jsx
import React from 'react';
import { Paper, Box } from '@mui/material';

const MessageBubble = ({ type, children, isError }) => {
  const isBot = type === 'bot';
  
  return (
    <Box sx={{ 
      display: 'flex',
      justifyContent: isBot ? 'flex-start' : 'flex-end',
      mb: 1.5
    }}>
      <Paper
        sx={{
          p: 1.5,
          maxWidth: '85%',
          backgroundColor: isError ? '#fee2e2' : isBot ? 'white' : '#3b82f6',
          color: isError ? '#dc2626' : isBot ? '#1e293b' : 'white',
          borderRadius: isBot ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          lineHeight: 1.4
        }}
      >
        {children}
      </Paper>
    </Box>
  );
};

export default MessageBubble;