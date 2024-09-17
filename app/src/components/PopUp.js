import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-20px); }
`;

const PopUpContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 5px;
  padding: 10px;
  max-width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: ${props => props.isClosing ? fadeOut : fadeIn} 0.3s ease-in-out;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  &:hover {
    color: #fff;
  }
`;

const Message = styled.p`
  color: #f0f0f0;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  margin: 0;
  padding-right: 20px;
`;

const PopUp = ({ message, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const closePopUp = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      closePopUp();
    }, 3000);

    return () => clearTimeout(timer);
  }, [closePopUp]);

  const handleClose = () => {
    closePopUp();
  };

  return (
    <PopUpContainer isClosing={isClosing}>
      <CloseButton onClick={handleClose}>&times;</CloseButton>
      <Message>{message}</Message>
    </PopUpContainer>
  );
};

export default PopUp;
