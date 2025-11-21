import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.stub';

@Module({
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule { }
