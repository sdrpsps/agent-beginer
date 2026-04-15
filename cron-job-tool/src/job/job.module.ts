import { forwardRef, Module } from '@nestjs/common';
import { ToolModule } from 'src/tool/tool.module';
import { JobAgentService } from '../ai/job-agent.service';
import { JobService } from './job.service';

@Module({
  imports: [forwardRef(() => ToolModule)],
  providers: [JobService, JobAgentService],
  exports: [JobService],
})
export class JobModule {}
