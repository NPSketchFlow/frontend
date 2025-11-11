'use client';

import React, { useState, useEffect } from 'react';
import backendIntegration from '../services/backendIntegration';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface OnlineUser {
  id: string;
  name?: string;
  status?: string;
  avatarUrl?: string;
  lastSeen?: string;
}

export default function BackendTestPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [testResults, setTestResults] = useState<{
    restApi: boolean;
    websocket: boolean;
    details: Record<string, unknown>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [uploadTest, setUploadTest] = useState<{
    status: string;
    fileId?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      runTests();
    }
  }, [isMounted]);

  const runTests = async () => {
    setIsLoading(true);
    try {
      const results = await backendIntegration.testConnection();
      setTestResults(results);

      if (results.restApi) {
        const users = await backendIntegration.getOnlineUsers();
        setOnlineUsers(users);
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testVoiceUpload = async () => {
    setUploadTest({ status: 'Recording...' });

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setUploadTest({ status: 'Uploading...' });

        try {
          const result = await backendIntegration.uploadVoice(
            audioBlob,
            'test-user-123'
          );
          setUploadTest({
            status: 'Success',
            fileId: result.fileId,
          });
        } catch (error) {
          setUploadTest({
            status: 'Failed',
            error: error instanceof Error ? error.message : String(error),
          });
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setUploadTest({ status: 'Recording... (will stop in 3s)' });

      setTimeout(() => {
        mediaRecorder.stop();
      }, 3000);
    } catch (error) {
      setUploadTest({
        status: 'Failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Backend Connection Test
            </h1>
            <button
              onClick={runTests}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshIcon />
              <span>{isLoading ? 'Testing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Configuration */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="font-semibold text-gray-700 mb-2">Configuration</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>REST API:</strong> {backendIntegration.config.apiBase}
              </p>
              <p>
                <strong>WebSocket:</strong> {backendIntegration.config.wsBase}
              </p>
            </div>
          </div>

          {/* Connection Tests */}
          {testResults && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Connection Status
              </h2>

              {/* REST API Test */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {testResults.restApi ? (
                    <CheckCircleIcon className="text-green-500" />
                  ) : (
                    <ErrorIcon className="text-red-500" />
                  )}
                  <div>
                    <h3 className="font-semibold">REST API</h3>
                    <p className="text-sm text-gray-600">
                      {testResults.restApi
                        ? 'Connected successfully'
                        : 'Connection failed'}
                    </p>
                  </div>
                </div>
                {testResults.details.restApi !== undefined && (
                  <pre className="text-xs bg-gray-100 p-2 rounded max-w-md overflow-auto">
                    {JSON.stringify(testResults.details.restApi, null, 2)}
                  </pre>
                )}
              </div>

              {/* WebSocket Test */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {testResults.websocket ? (
                    <CheckCircleIcon className="text-green-500" />
                  ) : (
                    <ErrorIcon className="text-red-500" />
                  )}
                  <div>
                    <h3 className="font-semibold">WebSocket/UDP</h3>
                    <p className="text-sm text-gray-600">
                      {testResults.websocket
                        ? 'Connected successfully'
                        : 'Connection failed'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Online Users */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">
                  Online Users ({onlineUsers.length})
                </h3>
                {onlineUsers.length > 0 ? (
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                    {JSON.stringify(onlineUsers, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500">No users online</p>
                )}
              </div>

              {/* Voice Upload Test */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Voice Upload Test</h3>
                  <button
                    onClick={testVoiceUpload}
                    disabled={!testResults.restApi}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <PlayArrowIcon fontSize="small" />
                    <span>Test Upload</span>
                  </button>
                </div>
                {uploadTest && (
                  <div className="text-sm">
                    <p className="mb-2">
                      <strong>Status:</strong> {uploadTest.status}
                    </p>
                    {uploadTest.fileId && (
                      <p className="text-green-600">
                        <strong>File ID:</strong> {uploadTest.fileId}
                      </p>
                    )}
                    {uploadTest.error && (
                      <p className="text-red-600">
                        <strong>Error:</strong> {uploadTest.error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Error Details */}
              {(testResults.details.restApiError ||
                testResults.details.websocketError) && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">
                    Error Details
                  </h3>
                  <div className="space-y-2 text-sm text-red-700">
                    {testResults.details.restApiError && (
                      <p>
                        <strong>REST API:</strong>{' '}
                        {String(testResults.details.restApiError)}
                      </p>
                    )}
                    {testResults.details.websocketError && (
                      <p>
                        <strong>WebSocket:</strong>{' '}
                        {String(testResults.details.websocketError)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Next Steps</h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  {!testResults.restApi && (
                    <>
                      <li>Make sure your backend server is running</li>
                      <li>Check if its listening on http://localhost:8080</li>
                      <li>Verify CORS is enabled for http://localhost:3000</li>
                    </>
                  )}
                  {!testResults.websocket && (
                    <>
                      <li>Check WebSocket endpoint at ws://localhost:8080/udp</li>
                      <li>Ensure WebSocket support is enabled in backend</li>
                    </>
                  )}
                  {testResults.restApi && testResults.websocket && (
                    <li className="text-green-700">
                      ✓ All systems operational! You can now use the voice chat.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
