import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, TextField, IconButton, ToggleButtonGroup,
  ToggleButton, Typography, Paper, CircularProgress, Divider, Button
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

function App() {
  // DB config state
  const [dbUrl, setDbUrl] = useState('');
  const [dbConfigured, setDbConfigured] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  // only initialise WS once DB is configured
  useEffect(() => {
    if (!dbConfigured) return;

    ws.current = new ReconnectingWebSocket('ws://localhost:8000/ws');

    ws.current.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.status === "error") {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: `Error: ${response.error}`,
          isError: true
        }]);
        setIsLoading(false);
        return;
      }

      const { sql_query, query_result, llm_response } = response.data;
      setMessages(prev => [...prev, {
        type: 'bot',
        content: llm_response || 'No response.',
        sql: sql_query,
        rawData: query_result
      }]);
      setIsLoading(false);
    };

    Prism.highlightAll();
    return () => ws.current && ws.current.close();
  }, [dbConfigured]);

  useEffect(() => {
    Prism.highlightAll();
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const handleConfigure = async () => {
    try {
      const resp = await fetch('/configure-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database_url: dbUrl })
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Configuration failed');
      }
      setDbConfigured(true);
    } catch (e) {
      alert(`Failed to configure database: ${e.message}`);
    }
  };

  // ** If not configured, show DB config form **
  if (!dbConfigured) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Configure Database
          </Typography>
          <TextField
            fullWidth
            label="Database URL"
            placeholder="postgresql://user:pass@host:port/dbname"
            value={dbUrl}
            onChange={e => setDbUrl(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={handleConfigure}>
            Connect
          </Button>
        </Paper>
      </Container>
    );
  }

  // ** Once configured, show chat UI **
  return (
    <Container disableGutters maxWidth={false} sx={{
      display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#f8fafc'
    }}>
      {/* mode toggle */}
      <Box sx={{ px: 4, py: 1.5, backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <ToggleButtonGroup
          value={isCompanyMode ? 'company' : 'general'}
          exclusive onChange={(e,val)=> val!==null && setIsCompanyMode(val==='company')}
        >
          <ToggleButton value="general">
            <ChatBubbleIcon sx={{ mr:1 }} /><Typography>General Chat</Typography>
          </ToggleButton>
          <ToggleButton value="company">
            <StorageIcon sx={{ mr:1 }} /><Typography>Database Mode</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* messages */}
      <Box sx={{ flex:1, overflowY:'auto', px:4, py:2 }}>
        {messages.map((msg,i)=>(
          <Box key={i} sx={{ mb:2 }}>
            <MessageBubble type={msg.type} isError={msg.isError}>
              {msg.content}
            </MessageBubble>
            {msg.sql && (
              <>
                <Divider sx={{ my:1 }} />
                <Paper sx={{ p:1.5, bgcolor:'#2d2d2d', color:'#dcdcdc', borderRadius:1 }}>
                  <pre style={{ margin:0 }}><code className="language-sql">{msg.sql}</code></pre>
                </Paper>
              </>
            )}
            {msg.rawData && (
              <>
                <Divider sx={{ my:1 }} />
                <SqlResultTable data={msg.rawData} />
              </>
            )}
          </Box>
        ))}
        {isLoading && (
          <MessageBubble type="bot">
            <CircularProgress size={20} sx={{ color:'#64748b' }}/>
          </MessageBubble>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* input */}
      <Box sx={{ p:2, backgroundColor:'white', boxShadow:'0 -1px 4px rgba(0,0,0,0.05)' }}>
        <TextField
          fullWidth variant="outlined"
          value={inputMessage} onChange={e=>setInputMessage(e.target.value)}
          onKeyDown={e=> e.key==='Enter' && handleSend()}
          placeholder="Type your message..."
          InputProps={{
            endAdornment: (
              <IconButton onClick={handleSend}>
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