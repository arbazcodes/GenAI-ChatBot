// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Container, TextField, IconButton, ToggleButtonGroup, ToggleButton,
  Typography, Paper, CircularProgress, Divider, styled, useTheme 
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StorageIcon from '@mui/icons-material/Storage';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ReconnectingWebSocket from 'reconnecting-websocket';
import MessageBubble from './components/MessageBubble';
import SqlResultTable from './components/SqlResultTable';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import './App.css';

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  margin: '10px 0',
  borderRadius: '8px',
  overflow: 'hidden',
  width: '100%',
  '& .MuiToggleButton-root': {
    flex: 1,
    border: 'none',
    borderRadius: 0,
    padding: '8px 12px',
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    transition: 'all 0.3s ease',
    color: theme.palette.text.secondary,
    backgroundColor: '#f1f5f9',
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
    '&:hover': {
      backgroundColor: '#e2e8f0',
    },
  }
}));

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    ws.current = new ReconnectingWebSocket('ws://localhost:8000/ws');
    ws.current.onmessage = (event) => {
      const response = JSON.parse(event.data);

      if (response.status === "error") {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: `Error: ${response.message || 'Unknown error occurred'}`,
          isError: true
        }]);
        setIsLoading(false);
        return;
      }

      setMessages(prev => [...prev, {
        type: 'bot',
        content: response.llm_response || response.response,
        sql: response.sql_query,
        result: response.query_result,
        rawData: response.query_result
      }]);
      setIsLoading(false);
    };

    Prism.highlightAll();
    return () => ws.current.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    Prism.highlightAll();
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;

    setMessages(prev => [...prev, { type: 'user', content: inputMessage }]);
    setIsLoading(true);

    ws.current.send(JSON.stringify({
      message: inputMessage,
      mode: isCompanyMode ? 'company' : 'general'
    }));

    setInputMessage('');
  };

  return (
    <Container disableGutters maxWidth={false} sx={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      backgroundColor: '#f8fafc',
    }}>
      {/* Mode Toggle Header */}
      <Box sx={{ 
        px: { xs: 2, sm: 4 }, py: 1.5,
        backgroundColor: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <StyledToggleButtonGroup
          value={isCompanyMode ? 'company' : 'general'}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null) setIsCompanyMode(newMode === 'company');
          }}
        >
          <ToggleButton value="general">
            <ChatBubbleIcon sx={{ fontSize: 18, mr: 1 }} />
            <Typography variant="body2">General Chat</Typography>
          </ToggleButton>
          <ToggleButton value="company">
            <StorageIcon sx={{ fontSize: 18, mr: 1 }} />
            <Typography variant="body2">Database Mode</Typography>
          </ToggleButton>
        </StyledToggleButtonGroup>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flex: 1,
        overflowY: 'auto',
        px: { xs: 2, sm: 4 },
        py: 2,
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 4 },
      }}>
        {messages.map((msg, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <MessageBubble type={msg.type} isError={msg.isError}>
              <Box sx={{ px: 1.5, pt: 1 }}>
                {formatResponse(msg.content)}
              </Box>

              {msg.sql && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Paper sx={{ 
                    p: 1.5,
                    bgcolor: '#2d2d2d',
                    color: '#dcdcdc',
                    borderRadius: '8px',
                    overflow: 'auto'
                  }}>
                    <pre style={{ margin: 0, fontSize: '0.85rem' }}>
                      <code className="language-sql">{msg.sql}</code>
                    </pre>
                  </Paper>
                </>
              )}

              {msg.rawData && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <SqlResultTable data={msg.rawData} />
                </>
              )}
            </MessageBubble>
          </Box>
        ))}

        {isLoading && (
          <MessageBubble type="bot">
            <Box sx={{ px: 2, py: 1 }}>
              <CircularProgress size={20} sx={{ color: '#64748b' }} />
            </Box>
          </MessageBubble>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ 
        p: { xs: 1.5, sm: 2 },
        backgroundColor: 'white',
        boxShadow: '0 -1px 4px rgba(0,0,0,0.05)'
      }}>
        <TextField
          fullWidth
          variant="outlined"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: '0.95rem',
              '& fieldset': { borderColor: '#e2e8f0' },
              '&:hover fieldset': { borderColor: '#cbd5e1' },
              '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
            }
          }}
          InputProps={{
            endAdornment: (
              <IconButton 
                onClick={handleSend} 
                size="small"
                sx={{ 
                  color: '#3b82f6',
                  ml: 1,
                  '&:hover': { 
                    backgroundColor: '#e0f2fe',
                    transform: 'scale(1.1)'
                  },
                  transition: 'transform 0.2s ease'
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
      </Box>
    </Container>
  );
}

function formatResponse(text) {
  if (!text) return null;
  
  return text.split('\n\n').map((paragraph, pIndex) => (
    <p key={pIndex} style={{ margin: '4px 0', lineHeight: 1.6 }}>
      {paragraph.split(/(\*\*.*?\*\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} style={{ 
            color: '#3b82f6',
            fontWeight: 500,
            padding: '0 2px'
          }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </p>
  ));
}

export default App;
