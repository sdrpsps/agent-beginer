import { forwardRef, Module } from '@nestjs/common';
import { JobModule } from 'src/job/job.module';
import { UsersModule } from 'src/users/users.module';
import { CronJobToolService } from './cron-job-tool.service';
import { DbUsersCrudToolService } from './db-users-crud-tool.service';
import { LlmService } from './llm.service';
import { SendMailToolService } from './send-mail-tool.service';
import { TimeNowToolService } from './time-now-tool.service';
import { WebSearchToolService } from './web-search-tool.service';

@Module({
  imports: [UsersModule, forwardRef(() => JobModule)],
  providers: [
    LlmService,
    SendMailToolService,
    WebSearchToolService,
    DbUsersCrudToolService,
    TimeNowToolService,
    CronJobToolService,
    {
      provide: 'CHAT_MODEL',
      inject: [LlmService],
      useFactory: (llmService: LlmService) => llmService.getModel(),
    },
    {
      provide: 'SEND_MAIL_TOOL',
      inject: [SendMailToolService],
      useFactory: (sendMailToolService: SendMailToolService) =>
        sendMailToolService.tool,
    },
    {
      provide: 'WEB_SEARCH_TOOL',
      inject: [WebSearchToolService],
      useFactory: (webSearchToolService: WebSearchToolService) =>
        webSearchToolService.tool,
    },
    {
      provide: 'DB_USERS_CURD_TOOL',
      inject: [DbUsersCrudToolService],
      useFactory: (dbUsersCrudToolService: DbUsersCrudToolService) =>
        dbUsersCrudToolService.tool,
    },
    {
      provide: 'TIME_NOW_TOOL',
      inject: [TimeNowToolService],
      useFactory: (timeNowToolService: TimeNowToolService) =>
        timeNowToolService.tool,
    },
    {
      provide: 'CRON_JOB_TOOL',
      inject: [CronJobToolService],
      useFactory: (cronJobToolService: CronJobToolService) =>
        cronJobToolService.tool,
    },
  ],
  exports: [
    'CHAT_MODEL',
    'SEND_MAIL_TOOL',
    'WEB_SEARCH_TOOL',
    'DB_USERS_CURD_TOOL',
    'TIME_NOW_TOOL',
    'CRON_JOB_TOOL',
  ],
})
export class ToolModule {}
