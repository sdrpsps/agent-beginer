import { tool } from '@langchain/core/tools';
import { Module } from '@nestjs/common';
import { ToolModule } from 'src/tool/tool.module';
import { UsersModule } from 'src/users/users.module';
import z from 'zod';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { UserService } from './user.service';

@Module({
  imports: [UsersModule, ToolModule],
  controllers: [AiController],
  providers: [
    AiService,
    UserService,
    {
      provide: 'QUERY_USER_TOOL',
      useFactory: (userService: UserService) => {
        const queryUserArgsSchema = z.object({
          userId: z.string().describe('用户ID，例如: 001, 002, 003'),
        });

        return tool(
          ({ userId }: { userId: string }) => {
            if (!userId) {
              return '用户ID不能为空';
            }
            const user = userService.findOne(userId);
            if (!user) {
              const availableIds = userService
                .findAll()
                .map((u) => u.id)
                .join(', ');

              return `用户ID ${userId} 不存在,可用的用户ID有: ${availableIds}`;
            }
            return `用户信息：\n- ID: ${user.id}\n- 姓名: ${user.name}\n- 邮箱: ${user.email}\n- 角色: ${user.role}`;
          },
          {
            name: 'query_user',
            description:
              '查询数据库中的用户信息。输入用户 ID，返回该用户的详细信息（姓名、邮箱、角色）。',
            schema: queryUserArgsSchema,
          },
        );
      },
      inject: [UserService],
    },
  ],
})
export class AiModule {}
