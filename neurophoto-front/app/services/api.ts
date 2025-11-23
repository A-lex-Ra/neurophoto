import { FileRecord, FilesResponse, TokenPair, GenerationResponse } from '../types/api';

// Tool types
export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  enum?: any[];
  cost?: number; // credit cost for this parameter
  enumCosts?: Record<string, number>; // cost per enum value
}

export interface Tool {
  name: string;
  display_name: string;
  description: string;
  cost?: number; // base cost for the tool
  parameters: {
    type: string;
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

class ApiClient {
  public readonly baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  }

  setTokens(tokens: TokenPair) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  async refreshTokens(): Promise<TokenPair> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh tokens');
    }

    const tokens = await response.json();
    this.setTokens(tokens);
    return tokens;
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (response.status === 401 && this.refreshToken) {
        try {
          await this.refreshTokens();

          const headers = (options.headers as Record<string, string>) || {};
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          options.headers = headers;

          return fetch(url, options);
        } catch (refreshError) {
          // If refresh fails, throw original 401 or refresh error
          throw refreshError;
        }
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Tools API
  async getTools(): Promise<Tool[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/tools/list`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tools');
    }

    return response.json();
  }

  async callTool(toolName: string, params: Record<string, any>): Promise<GenerationResponse> {
    console.log('Calling tool:', toolName, 'with params:', params);

    const response = await this.fetchWithRetry(`${this.baseUrl}/tools/${toolName}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || 'Failed to call tool');
    }

    const data = await response.json();
    console.log('Tool call response:', data);

    if (!data.id || !data.jobId || !data.streamUrl) {
      throw new Error('Invalid response format from server');
    }

    return data;
  }

  // AI Generation
  async generate(prompt: string, fileId?: string): Promise<GenerationResponse> {
    console.log('Generating with params:', { fileId, prompt });

    const response = await this.fetchWithRetry(`${this.baseUrl}/generations/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
      body: JSON.stringify({
        inputFileId: fileId,
        prompt
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || 'Failed to start generation');
    }

    const data = await response.json();
    console.log('Generate response:', data);

    if (!data.id || !data.jobId || !data.streamUrl) {
      throw new Error('Invalid response format from server');
    }

    return data;
  }

  // Gallery API methods
  async uploadFile(file: File): Promise<FileRecord> {
    const formData = new FormData();
    formData.append('file', file);

    // Upload usually doesn't need JSON content type, but needs auth
    const headers = this.getHeaders() as Record<string, string>;

    const response = await this.fetchWithRetry(`${this.baseUrl}/gallery/upload`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  }

  async getUserFiles(userId: string, limit = 50, offset = 0): Promise<FilesResponse> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/gallery/user/${userId}?limit=${limit}&offset=${offset}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user files');
    }

    return response.json();
  }

  async getFileUrl(fileId: string): Promise<string> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/gallery/${fileId}/url`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get file URL');
    }

    const data = await response.json();
    return data.url;
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/gallery/${fileId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }
}

export const api = new ApiClient();