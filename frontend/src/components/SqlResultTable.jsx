// src/components/SqlResultTable.jsx
import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const SqlResultTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0] || {});

  return (
    <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
      <Table size="small" sx={{ 
        '& .MuiTableCell-root': {
          py: 1.5,
          fontSize: '0.875rem',
          border: '1px solid rgba(224, 224, 224, 0.5)'
        }
      }}>
        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column} sx={{ fontWeight: 600 }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} hover>
              {columns.map((column) => (
                <TableCell key={`${index}-${column}`}>
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