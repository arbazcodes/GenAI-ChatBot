// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, TextField, IconButton, Switch, Typography, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReconnectingWebSocket from 'reconnecting-websocket';
import MessageBubble from './components/MessageBubble';
import SqlResultTable from './components/SqlResultTable';
import Prism from 'prismjs';
import 'prismjs/themes/prism-okaidia.css';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    Prism.highlightAll();
  }, [messages]);

  const handleSend = async () => {
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
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ py: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h4">Data Analyst Chat</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Switch
            checked={isCompanyMode}
            onChange={(e) => setIsCompanyMode(e.target.checked)}
            color="primary"
          />
          <Typography>Database Query Mode</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
        {messages.map((msg, index) => (
          <MessageBubble key={index} type={msg.type} isError={msg.isError}>
            {msg.sql && (
              <Paper sx={{ mb: 2, p: 2, bgcolor: '#2d2d2d', color: 'white' }}>
                <pre style={{ margin: 0 }}>
                  <code className="language-sql">{msg.sql}</code>
                </pre>
              </Paper>
            )}
            {msg.rawData && <SqlResultTable data={msg.rawData} />}
            <Typography variant="body1" component="div">
              {msg.content?.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '0.5em 0' }}>{line}</p>
              ))}
            </Typography>
          </MessageBubble>
        ))}
        {isLoading && (
          <MessageBubble type="bot">
            <CircularProgress size={24} />
          </MessageBubble>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ py: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          InputProps={{
            endAdornment: (
              <IconButton onClick={handleSend} color="primary">
                <SendIcon />
              </IconButton>
            )
          }}
        />
      </Box>
    </Container>
  );
}

export default App;