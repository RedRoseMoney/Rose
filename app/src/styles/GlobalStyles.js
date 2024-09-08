import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500&display=swap');

  body {
    margin: 0;
    padding: 0;
    font-family: 'Fira Code', monospace;
    background-color: #1e1e1e;
    color: #f0f0f0;
    font-size: 16px;
    line-height: 1.5;
  }

  * {
    box-sizing: border-box;
  }

  ::-webkit-scrollbar {
    width: 10px;
  }

  ::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

export default GlobalStyles;
