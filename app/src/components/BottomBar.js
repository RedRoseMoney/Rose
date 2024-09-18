import React from 'react';
import styled from 'styled-components';
import { useWeb3 } from '../contexts/Web3Context';
import { usePopUp } from '../contexts/PopUpContext';
import { useState, useCallback } from 'react';
import { FaEthereum } from 'react-icons/fa6';

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

const AlphaValue = styled.div`
  font-size: 12px;
  color: #00ff00;
  position: absolute;
  top: 50%;
  left: 20px;
`;

const ConnectButton = styled.span`
  color: ${props => props.$isConnected ? '#4CAF50' : '#2196F3'};
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
  color: #00ff00;
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
  color: #00ff00;
`;

const CurrencyToggle = styled(EthLogo)`
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const BalanceText = styled.span`
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const BottomBar = () => {
  const { isConnected, balance, roseBalance, connectWallet, disconnectWallet, alpha } = useWeb3();
  const { showPopUp } = usePopUp();
  const [showEth, setShowEth] = useState(true);

  const handleConnect = async () => {
    if (isConnected) {
      await disconnectWallet();
    } else {
      try {
        await connectWallet();
      } catch (error) {
        showPopUp('Failed to connect wallet: ' + error.message);
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const toggleCurrency = () => {
    setShowEth(!showEth);
  };

  const displayBalance = () => {
    if (!isConnected) return '0.0000';
    const value = showEth ? parseFloat(balance) : parseFloat(roseBalance);
    if (value < 0.0001) {
      return '<0.0001';
    }
    return value.toFixed(4);
  };

  const copyBalance = useCallback(() => {
    const balanceToCopy = showEth ? balance : roseBalance;
    navigator.clipboard.writeText(balanceToCopy)
      .then(() => showPopUp('Balance copied to clipboard'))
      .catch(err => showPopUp('Failed to copy balance: ' + err.message));
  }, [showEth, balance, roseBalance, showPopUp]);

  return (
    <BarContainer>
      <AlphaValue>α: {alpha !== undefined ? parseFloat(alpha).toFixed(4) : 'N/A'}</AlphaValue>
      <ConnectButton $isConnected={isConnected} onClick={handleConnect}>
        {isConnected ? 'Disconnect' : 'Connect'}
      </ConnectButton>
      <Balance>
        <BalanceText onClick={copyBalance}>{displayBalance()}</BalanceText>
        <CurrencyToggle onClick={toggleCurrency}>
          {showEth ? <FaEthereum /> : '🌹'}
        </CurrencyToggle>
      </Balance>
    </BarContainer>
  );
};

export default BottomBar;
