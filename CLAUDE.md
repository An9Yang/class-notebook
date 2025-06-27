# Claude 上下文文档

## 项目概述
这是一个为大学生设计的课堂笔记系统，主要解决课堂信息记录和整理的痛点。用户是非技术背景的创始人，需要清晰易懂的技术指导。

## 关键决策和背景
1. **用户现有资源**：
   - Azure (有充足credits)
   - Google Cloud (有充足credits)
   - AWS (有充足credits)
   - MongoDB Atlas
   - 非技术背景，需要通俗解释

2. **技术选型决策**：
   - 统一使用Azure AI服务（Azure OpenAI、Speech、Document Intelligence）
   - 数据库使用MongoDB Atlas（云端版）
   - 存储使用Azure Blob Storage
   - 前端React，后端Node.js

3. **开发策略**：
   - 直接开发云端MVP，充分利用credits
   - 3个月完成功能完整的MVP
   - 优先级：录音转写 > 拍照OCR > 笔记编辑 > 智能问答

## 当前项目状态
- **阶段**：MVP开发中，已完成核心功能
- **已完成**：
  - ✅ 技术方案审阅和优化
  - ✅ 开发计划制定
  - ✅ 项目文档创建
  - ✅ 项目初始化和环境搭建
  - ✅ 用户认证系统
  - ✅ 课堂管理功能
  - ✅ 录音上传和转写（Azure Speech Services）
  - ✅ 图片上传和OCR识别（Azure Document Intelligence）
  - ✅ 笔记编辑功能
  - ✅ 搜索功能
  - 🚧 智能问答功能（需要配置Azure OpenAI）
- **待完成**：
  - ⏳ 富文本编辑器
  - ⏳ 标签系统
  - ⏳ 协作功能

## 重要文件说明
1. **DEVELOPMENT_PLAN.md**：详细的3个月开发计划，包含每周任务
2. **PROGRESS.md**：开发进度跟踪，每周更新
3. **CLAUDE.md**：本文档，用于AI助手理解项目上下文

## 沟通原则
- 使用通俗易懂的语言，避免技术术语
- 给出具体可执行的步骤
- 提供成本估算和时间预期
- 重点关注实用性和可行性

## 技术栈总结
```
前端：React (网页界面)
后端：Node.js + Express (服务器)
数据库：MongoDB Atlas (存数据)
文件存储：Azure Blob Storage (存音频、图片)
AI服务：
  - Azure OpenAI (智能问答)
  - Azure Speech (语音转文字)
  - Azure Document Intelligence (图片文字识别)
```

## 常见问题和解答
1. **Q: 为什么选择Azure？**
   A: 所有AI服务在一个平台，管理简单，一个账单

2. **Q: MVP要多少钱？**
   A: 有credits不用担心，实际成本约$100-150/月

3. **Q: 多久能用上？**
   A: 1个月基础功能，3个月完整MVP

## 下次对话提醒
- 询问是否已创建GitHub仓库
- 检查Azure账号是否配置完成
- 确认是否需要帮助初始化项目代码
- 提醒配置环境变量

## 项目特殊要求
1. 保持架构简单，便于非技术人员理解
2. 优先实现核心功能，避免过度设计
3. 确保每个阶段都有可用的产品
4. 预留扩展空间，但不要过早优化

## 更新记录
- 2025-06-26：项目启动，完成技术选型和计划制定
- 2025-06-27：完成核心功能开发，包括录音转写、OCR识别、搜索功能

## 重要配置提醒
**Azure OpenAI配置**：智能问答功能需要在.env文件中配置以下内容：
```
# Azure OpenAI (智能问答)
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT=gpt-4
```
请联系Azure管理员获取这些配置信息。