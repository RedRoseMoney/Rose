import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import asciichart from 'asciichart';
import { useWeb3 } from '../contexts/Web3Context'; // Add this import

const ChartContainer = styled.div`
  font-family: monospace;
  white-space: pre-wrap; /* This ensures newlines are rendered correctly */
  font-size: 12px;
  color: #00ff00;
  margin-bottom: 10px;
`;

const MAX_DATA_POINTS = 100;

function asciiPlot1D(values, width, height) {
    // Use asciichart to plot the values
    return asciichart.plot(values, { height });
}

const Chart = () => { // Remove the data prop
    const [width, setWidth] = useState(60);  // Default width
    const [height, setHeight] = useState(20);  // Default height
    const [chartData, setChartData] = useState([]);
    const { reserve0, reserve1 } = useWeb3(); // Update this line

    const resizeChart = () => {
        // Dynamically calculate chart width and height based on window size
        const newWidth = Math.floor(window.innerWidth * 0.75 / 10); // 60% of screen width
        const newHeight = Math.floor(window.innerHeight * 0.1 / 10); // 30% of screen height

        setWidth(newWidth);
        setHeight(newHeight);
    };

    const updateChartData = useCallback(() => {
        if (reserve0 && reserve1) {
            const reserve0Value = parseFloat(reserve0);
            const reserve1Value = parseFloat(reserve1);
            
            if (!isNaN(reserve0Value) && !isNaN(reserve1Value) && reserve1Value !== 0) {
                setChartData(prevData => {
                    const ratio = reserve0Value / reserve1Value;
                    const newData = [...prevData, ratio];
                    // Keep only the last MAX_DATA_POINTS
                    return newData.slice(-MAX_DATA_POINTS);
                });
            }
        }
    }, [reserve0, reserve1]);

    useEffect(() => {
        // Set initial size
        resizeChart();

        // Listen to window resize events
        window.addEventListener('resize', resizeChart);

        // Update chart data immediately
        updateChartData();

        // Set up interval to update chart data every 5 seconds
        const intervalId = setInterval(updateChartData, 5000);

        // Clean up
        return () => {
            window.removeEventListener('resize', resizeChart);
            clearInterval(intervalId);
        };
    }, [updateChartData]);

    // Generate the ASCII chart string
    const chartString = chartData.length > 0 ? asciiPlot1D(chartData, width, height) : 'No data available';

    return (
        <ChartContainer>
            {chartString}
        </ChartContainer>
    );
};

export default Chart;
