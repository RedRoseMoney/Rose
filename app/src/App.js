import React from 'react';
import Terminal from './components/Terminal';
import GlobalStyles from './styles/GlobalStyles';
import { Web3Provider } from './contexts/Web3Context';
import { PopUpProvider } from './contexts/PopUpContext';
import GlitterCursor from './components/GlitterCursor';

function App() {
  return (
    <Web3Provider>
      <PopUpProvider>
        <GlobalStyles />
        <Terminal />
        <GlitterCursor />
      </PopUpProvider>
    </Web3Provider>
  );
}

export default App;
