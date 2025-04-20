// src/components/SqlResultTable.jsx
import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const SqlResultTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0] || {});

  return (
    <TableContainer component={Paper} sx={{ 
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      maxWidth: '100%'
    }}>
      <Table size="small" sx={{
        '& .MuiTableCell-root': {
          py: 1,
          px: 1.5,
          fontSize: '0.8rem',
          fontFamily: 'IBM Plex Mono, monospace',
          borderColor: '#e2e8f0'
        }
      }}>
        <TableHead sx={{ bgcolor: '#f8fafc' }}>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column} sx={{ 
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#f1f5f9'
              }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index} 
              hover
              sx={{ '&:hover': { backgroundColor: '#f8fafc !important' } }}
            >
              {columns.map((column) => (
                <TableCell key={`${index}-${column}`} sx={{ color: '#475569' }}>
                  {typeof row[column] === 'object' 
                    ? JSON.stringify(row[column])
                    : row[column]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SqlResultTable;