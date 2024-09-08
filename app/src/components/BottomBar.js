import React from 'react';
import styled from 'styled-components';

const BarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1e1e1e;
  padding: 5px 20px;
  height: 10px;
  border-top: 1px solid #333;
  position: relative;
`;

const ConnectButton = styled.span`
  color: ${props => props.isConnected ? '#4CAF50' : '#2196F3'};
  font-size: 12px;
  cursor: pointer;
  transition: color 0.3s ease, transform 0.2s ease;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%);

  &:hover {
    transform: translateX(-50%) scale(1.05);
  }
`;

const Balance = styled.div`
  font-size: 12px;
  color: '#00ff00';
  display: flex;
  align-items: center;
  position: absolute;
  top = 50%;
  right: 20px;
  transform: translateY(50%);
`;

const EthLogo = styled.span`
  font-size: 14px;
  margin-left: 2px;
  top = 50%;
  color: '#00ff00';
`;

const BottomBar = ({ isConnected, balance, onConnect }) => {
  return (
    <BarContainer>
      <ConnectButton isConnected={isConnected} onClick={onConnect}>
        {isConnected ? 'Connected' : 'Connect'}
      </ConnectButton>
      <Balance>
        {isConnected ? balance.toFixed(2) : '0.00'}
        <EthLogo>ETH</EthLogo>
      </Balance>
    </BarContainer>
  );
};

export default BottomBar;
