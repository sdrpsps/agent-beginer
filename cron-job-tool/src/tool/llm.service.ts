import { ChatOpenAI } from '@langchain/openai';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  getModel() {
    return new ChatOpenAI({
      modelName: this.configService.get<string>('MODEL_NAME'),
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      configuration: {
        baseURL: this.configService.get<string>('OPENAI_BASE_URL'),
      },
    });
  }
}
