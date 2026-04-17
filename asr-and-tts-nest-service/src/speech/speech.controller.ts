import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';
import type { UploadedAudio } from './speech.service';

@Controller('speech')
export class SpeechController {
  constructor(
    @Inject(SpeechService) private readonly speechService: SpeechService,
  ) {}

  @Post('asr')
  @UseInterceptors(FileInterceptor('audio'))
  async recognize(@UploadedFile() file: UploadedAudio) {
    if (!file.buffer.length) {
      throw new BadRequestException(
        '请通过 FormData 的 audio 字段上传音频文件',
      );
    }

    const text = await this.speechService.recognizeBySentence(file);
    return { text };
  }
}
