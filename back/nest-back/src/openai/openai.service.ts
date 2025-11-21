import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface OpenAIGenerateImageResponse {
  text: string;
  imageUrl?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.model = process.env.MODEL_NAME || 'gemini-2.5-flash-image-preview';
    this.apiKey = process.env.OPENAI_API_KEY!;
    this.baseUrl = process.env.OPENAI_API_BASE_URL!;
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE_URL,
    });

    this.logger.log(`OpenAI client initialized with model: ${this.model}`);
  }

  /**
   * Generate image from prompt and input image
   */
  async generateImage( //TODO - make image array and optional
    imageBase64: string,
    prompt: string,
  ): Promise<OpenAIGenerateImageResponse> {
    try {
      this.logger.log('Calling OpenAI API for image generation...');

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`, // Замените на ваш API-ключ
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                (imageBase64 && (imageBase64.length > 0) && {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64, // data URL like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                  },
                }),
              ],
            },
          ],
          max_tokens: 1000,
          output_modalities: ['text', 'image'], // Добавляем параметр для получения мультимодального вывода // TODO: проверить правильность
        }),
      });
      const responseJson = await response.json();
      this.logger.debug(`OpenAI response: ${JSON.stringify(responseJson)}`);

      const textResponse = responseJson.choices[0]?.message?.content || '';
      const imageUrlResponse = responseJson.choices[0]?.message?.images[0]?.image_url.url as string;
      
      this.logger.log('Image generation completed successfully');

      return {
        imageUrl: imageUrlResponse,
        text: textResponse,
      };
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate text-only response
   */
  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`OpenAI text generation error: ${error.message}`);
      throw error;
    }
  }
}
