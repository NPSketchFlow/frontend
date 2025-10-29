"use client";

import { useRef, useState } from 'react';
import { postDrawingData } from '../api/drawing'; // Import the API call

const Whiteboard = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null); // Reference to the canvas element
    const [drawing, setDrawing] = useState(false); // Track if the user is drawing
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 }); // Store the last drawing position

    // Send drawing data to the backend
    const sendDrawingData = async (x: number, y: number, color: string, tool: string) => {
        const drawingData = {
            action: 'draw',
            x,
            y,
            color,
            tool,
        };

        // Call the API to send data to the backend
        const result = await postDrawingData(drawingData);
        if (result) {
            console.log('Drawing data sent successfully');
        }
    };

    // Draw a line on the canvas
    const drawLine = (x: number, y: number, color: string, tool: string) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = color; // Set color
        ctx.lineWidth = 5; // Set line width
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y); // Move to the last position
        ctx.lineTo(x, y); // Draw a line to the new position
        ctx.stroke(); // Apply the stroke

        setLastPos({ x, y }); // Update the last position
    };

    // Start drawing when mouse is pressed
    const startDrawing = (e: React.MouseEvent) => {
        setDrawing(true);
        const { offsetX, offsetY } = e.nativeEvent;
        setLastPos({ x: offsetX, y: offsetY });
    };

    // Draw as the mouse moves
    const draw = (e: React.MouseEvent) => {
        if (!drawing || !canvasRef.current) return;

        const { offsetX, offsetY } = e.nativeEvent;
        drawLine(offsetX, offsetY, 'black', 'brush'); // Call drawLine with current coordinates

        // Send the drawing data to the backend
        sendDrawingData(offsetX, offsetY, 'black', 'brush');
    };

    // Stop drawing when mouse is released
    const stopDrawing = () => {
        setDrawing(false);
    };

    // Handle mouse out (when the mouse leaves the canvas)
    const handleMouseOut = () => {
        setDrawing(false);
    };

    return (
        <div className="whiteboard-container">
            <canvas
                ref={canvasRef}
                width="800"
                height="600"
                className="border bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={handleMouseOut}
            />
        </div>
    );
};

export default Whiteboard;
