import React from 'react';
import styled from 'styled-components';

const PromptContainer = styled.span`
  color: #00ff00;
  margin-right: 10px;
`;

const Prompt = () => {
  return (
    <PromptContainer>$</PromptContainer>
  );
};

export default Prompt;