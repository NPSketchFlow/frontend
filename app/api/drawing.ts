import axios from 'axios';

const API_URL = 'http://localhost:8080/api/drawing';

export const getDrawingHistory = async () => {
    try {
        const response = await axios.get(`${API_URL}/history`);
        return response.data;
    } catch (error) {
        console.error('Error fetching drawing history:', error);
        return [];
    }
};

// POST request to send drawing data to the backend
export const postDrawingData = async (drawingData: { action: string; x: number; y: number; color: string; tool: string }) => {
    try {
        const response = await axios.post(`${API_URL}/draw`, drawingData);
        console.log('Drawing data sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending drawing data:', error);
        return null;
    }
};
