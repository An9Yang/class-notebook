# 课堂笔记系统开发计划

## 项目概述
一个为大学生设计的课堂笔记系统，整合录音、拍照、OCR、智能问答功能，帮助学生高效记录和复习课堂内容。

## 技术栈选择
- **前端**: React + TypeScript
- **后端**: Node.js + Express
- **数据库**: MongoDB Atlas
- **文件存储**: Azure Blob Storage
- **AI服务**: 
  - Azure OpenAI (智能问答)
  - Azure Speech Services (语音转文字)
  - Azure AI Document Intelligence (OCR识别)

## 开发阶段规划

### 第一阶段：MVP核心功能（第1个月）

#### Week 1-2: 基础架构搭建
- [ ] 创建React项目框架
- [ ] 搭建Node.js后端API
- [ ] 配置MongoDB Atlas连接
- [ ] 设置Azure服务账号和API密钥
- [ ] 实现基础用户认证（简单登录）

#### Week 3: 录音功能
- [ ] 前端录音界面设计
- [ ] 实现浏览器录音功能
- [ ] 音频文件上传到Azure Blob Storage
- [ ] 集成Azure Speech to Text
- [ ] 转写结果保存到MongoDB

#### Week 4: 拍照和OCR功能
- [ ] 图片上传界面
- [ ] 图片压缩和预览
- [ ] 集成Azure Document Intelligence
- [ ] OCR结果展示和编辑
- [ ] 时间戳同步机制

### 第二阶段：智能功能（第2个月）

#### Week 5-6: 笔记编辑器
- [ ] 富文本编辑器集成
- [ ] 音频片段关联
- [ ] 图片和文字混排
- [ ] 自动保存功能
- [ ] 笔记导出（PDF/Markdown）

#### Week 7-8: RAG智能问答
- [ ] 构建向量索引系统
- [ ] 集成Azure OpenAI
- [ ] 问答界面设计
- [ ] 答案引用和高亮
- [ ] 历史对话管理

### 第三阶段：增强功能（第3个月）

#### Week 9-10: 复习模式
- [ ] 智能复习卡片生成
- [ ] 搜索功能实现
- [ ] 时间轴导航
- [ ] 学习进度跟踪

#### Week 11-12: 协作和优化
- [ ] 笔记分享功能
- [ ] 性能优化
- [ ] 移动端适配
- [ ] 用户反馈收集
- [ ] Bug修复和稳定性提升

## 技术实现细节

### 数据模型设计
```javascript
// 用户模型
User: {
  _id: ObjectId,
  email: String,
  name: String,
  createdAt: Date
}

// 课堂模型
Class: {
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  date: Date,
  recordings: [ObjectId],
  images: [ObjectId],
  notes: Object,
  createdAt: Date
}

// 录音模型
Recording: {
  _id: ObjectId,
  classId: ObjectId,
  audioUrl: String,
  transcript: String,
  duration: Number,
  timestamp: Date
}

// 图片模型
Image: {
  _id: ObjectId,
  classId: ObjectId,
  imageUrl: String,
  ocrText: String,
  timestamp: Date
}
```

### API端点设计
```
POST   /api/auth/login          - 用户登录
POST   /api/auth/register       - 用户注册

GET    /api/classes            - 获取所有课堂
POST   /api/classes            - 创建新课堂
GET    /api/classes/:id        - 获取课堂详情

POST   /api/recordings         - 上传录音
GET    /api/recordings/:id     - 获取录音详情

POST   /api/images             - 上传图片
GET    /api/images/:id         - 获取图片详情

POST   /api/notes/:classId     - 保存笔记
GET    /api/notes/:classId     - 获取笔记

POST   /api/qa/ask             - 智能问答
```

## 开发环境配置

### 必需的环境变量
```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# Azure
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...

# App
PORT=3001
REACT_APP_API_URL=http://localhost:3001
```

### 本地开发启动命令
```bash
# 后端
cd backend
npm install
npm run dev

# 前端
cd frontend
npm install
npm start
```

## 部署计划
1. 前端部署到 Azure Static Web Apps
2. 后端部署到 Azure App Service
3. 使用 Azure DevOps 或 GitHub Actions 实现 CI/CD

## 成功指标
- MVP完成时支持完整的录音->转写->编辑->问答流程
- 页面加载时间 < 3秒
- 语音转写准确率 > 90%
- OCR识别准确率 > 95%
- 用户可以在5分钟内完成一次完整的课堂记录

## 风险和缓解措施
1. **技术风险**: Azure服务限流 -> 实现请求队列和重试机制
2. **成本风险**: API调用超预算 -> 设置使用量告警和限制
3. **用户体验风险**: 网络不稳定 -> 实现离线缓存和断点续传