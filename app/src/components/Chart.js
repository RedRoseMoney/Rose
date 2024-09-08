import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import asciichart from 'asciichart';

const ChartContainer = styled.div`
  font-family: monospace;
  white-space: pre-wrap; /* This ensures newlines are rendered correctly */
  font-size: 12px;
  color: #00ff00;
  margin-bottom: 10px;
`;

function asciiPlot1D(values, width, height) {
    // Use asciichart to plot the values
    return asciichart.plot(values, { height });
}

const Chart = ({ data }) => {
    const [width, setWidth] = useState(60);  // Default width
    const [height, setHeight] = useState(20);  // Default height

    const resizeChart = () => {
        // Dynamically calculate chart width and height based on window size
        const newWidth = Math.floor(window.innerWidth * 0.75 / 10); // 60% of screen width
        const newHeight = Math.floor(window.innerHeight * 0.1 / 10); // 30% of screen height

        setWidth(newWidth);
        setHeight(newHeight);
    };

    useEffect(() => {
        // Set initial size
        resizeChart();

        // Listen to window resize events
        window.addEventListener('resize', resizeChart);

        // Clean up the event listener when component unmounts
        return () => window.removeEventListener('resize', resizeChart);
    }, []);

    // Generate the ASCII chart string
    const chartString = asciiPlot1D(data, width, height);

    return (
        <ChartContainer>
            {chartString}
        </ChartContainer>
    );
};

export default Chart;
