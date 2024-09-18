import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

const IntroContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const AsciiArtContainer = styled.pre`
  font-size: 0.5em; 
  line-height: 1; 
  color: #00ff00;
  text-align: center;
  margin-bottom: 20px;
`;

const IntroText = styled.div`
  color: #00ff00;
  font-size: 1.5em;
  margin-top: 20px;
`;

const glitterAnimation = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;

const GlitterContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const Glitter = styled.div`
  position: absolute;
  width: 3px;
  height: 3px;
  background-color: #fff;
  border-radius: 50%;
  opacity: 0;
  animation: ${glitterAnimation} ${props => props.duration}s infinite;
  animation-delay: ${props => props.delay}s;
  top: ${props => props.top}%;
  left: ${props => props.left}%;
`;

const AsciiArtWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const Intro = ({ asciiLogo, onIntroComplete }) => {
  const [introText, setIntroText] = useState('');
  const [glitterCount, setGlitterCount] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const fullText = "Rose Terminal v0.1.0beta";

  const maxGlitters = 100;

  const typeText = useCallback((index = 0) => {
    if (index < fullText.length) {
      setIntroText(fullText.slice(0, index + 1));
      setGlitterCount(Math.min(maxGlitters, Math.floor((index / fullText.length) * maxGlitters)));
      setTimeout(() => typeText(index + 1), 100);
    } else {
      setIsTypingComplete(true);
      setGlitterCount(maxGlitters);
      setTimeout(onIntroComplete, 50);
    }
  }, [fullText, onIntroComplete]);

  useEffect(() => {
    typeText();
  }, [typeText]);

  const glitters = useMemo(() => {
    return Array.from({ length: maxGlitters }, (_, i) => ({
      key: i,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 1.5,
      top: Math.random() * 100,
      left: Math.random() * 100,
    }));
  }, []);

  return (
    <IntroContainer>
      <AsciiArtWrapper>
        <AsciiArtContainer>{asciiLogo}</AsciiArtContainer>
        <GlitterContainer>
          {glitters.slice(0, glitterCount).map(glitter => (
            <Glitter
              key={glitter.key}
              delay={glitter.delay}
              duration={glitter.duration}
              top={glitter.top}
              left={glitter.left}
            />
          ))}
        </GlitterContainer>
      </AsciiArtWrapper>
      <IntroText>{introText}</IntroText>
    </IntroContainer>
  );
};

export default Intro;
