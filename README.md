# 课堂笔记系统 (Class Notebook)

一个专为大学生设计的智能课堂笔记系统，支持录音转文字、图片OCR识别和笔记整理。

## 功能特点

- 🎙️ **录音转文字** - 自动将课堂录音转换为可搜索的文字（支持中英文）
- 📸 **图片OCR** - 拍摄板书和PPT，自动提取文字内容
- 📝 **笔记编辑** - 整合所有内容的富文本编辑器
- 🔐 **用户认证** - 安全的登录注册系统
- ☁️ **云端存储** - 使用MongoDB Atlas存储数据
- 🤖 **AI服务** - 集成Azure AI服务进行语音和图像识别

## 技术栈

### 前端
- React 18 + TypeScript
- React Router v6
- Axios

### 后端
- Node.js + Express
- MongoDB (Mongoose)
- JWT认证
- Multer文件上传

### AI服务
- Azure Speech Services (语音转文字)
- Azure Document Intelligence (OCR)

## 快速开始

### 前置要求

1. Node.js 16+
2. MongoDB Atlas账号
3. Azure账号（用于AI服务）
4. FFmpeg（用于音频格式转换）

### 安装FFmpeg

macOS:
```bash
brew install ffmpeg
```

Linux:
```bash
sudo apt-get install ffmpeg
```

Windows:
从 https://ffmpeg.org/download.html 下载并安装

### 环境配置

1. 在 `backend` 目录创建 `.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# MongoDB配置
MONGODB_URI=your_mongodb_atlas_uri

# JWT配置
JWT_SECRET=your_jwt_secret

# Azure配置
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region
AZURE_DOC_INTELLIGENCE_KEY=your_azure_doc_key
AZURE_DOC_INTELLIGENCE_ENDPOINT=your_azure_doc_endpoint
```

### 安装依赖

```bash
# 安装所有依赖
npm run install-all

# 或分别安装
cd frontend && npm install
cd ../backend && npm install
```

### 运行项目

从根目录运行：
```bash
npm start
```

这会同时启动：
- 前端开发服务器 (http://localhost:3000)
- 后端API服务器 (http://localhost:3001)

## 项目结构

```
class-notebook/
├── frontend/               # React前端
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── contexts/      # Context API
│   │   ├── services/      # API服务
│   │   └── utils/         # 工具函数
│   └── public/
├── backend/               # Node.js后端
│   ├── controllers/       # 控制器
│   ├── models/           # 数据模型
│   ├── routes/           # 路由
│   ├── services/         # 业务服务
│   ├── middleware/       # 中间件
│   └── uploads/          # 上传文件存储
└── docs/                 # 文档

```

## 主要功能使用

1. **注册/登录** - 创建账号并登录系统
2. **创建课堂** - 点击"开始新的课堂"创建笔记
3. **录音** - 录制课堂音频，自动转写为文字
4. **拍照** - 上传图片，自动识别文字内容
5. **编辑笔记** - 在富文本编辑器中整理笔记
6. **管理** - 查看、删除课堂和内容

## 部署

详见 [部署文档](docs/DEPLOYMENT.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

🤖 使用 [Claude Code](https://claude.ai/code) 开发

Co-Authored-By: Claude <noreply@anthropic.com>