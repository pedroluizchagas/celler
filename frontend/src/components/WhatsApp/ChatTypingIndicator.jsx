import React from 'react'
import { Box, Typography, Avatar } from '@mui/material'
import { keyframes } from '@mui/system'

const typingAnimation = keyframes`
  0%, 60%, 100% {
    transform: initial;
  }
  30% {
    transform: translateY(-10px);
  }
`

const TypingIndicator = ({ contactName }) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      p={1}
      sx={{
        bgcolor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: 2,
        mb: 1,
      }}
    >
      <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'grey.400' }}>
        {contactName?.[0]?.toUpperCase() || '?'}
      </Avatar>
      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
        {contactName || 'Contato'} está digitando
      </Typography>
      <Box display="flex" alignItems="center" gap={0.3}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'grey.500',
              animation: `${typingAnimation} 1.4s infinite ease-in-out`,
              animationDelay: `${index * 0.16}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  )
}

export default TypingIndicator
