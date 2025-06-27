# 音频转换配置指南

## 问题描述
Azure Speech Service无法直接识别WebM格式的音频文件，导致转写返回"[无法识别到语音内容，请检查录音是否包含清晰的语音]"。

## 解决方案
在发送音频到Azure之前，将WebM格式转换为WAV格式（16kHz, 单声道, PCM 16-bit）。

## 实现细节

### 1. 音频转换服务 (`services/audioConverter.js`)
- **convertToWav**: 将任意格式音频转换为Azure兼容的WAV格式
- **getAudioInfo**: 获取音频文件的元数据信息
- **cleanupTempFile**: 清理临时转换文件

### 2. 更新的转写服务
- `azureSpeechEnhanced.js`: 自动检测WebM文件并转换
- `azureSpeechSimple.js`: 同样支持自动转换
- 转换后的文件会在转写完成后自动清理

### 3. 音频验证器更新
- 对WebM和M4A文件使用更宽松的验证规则
- 避免误判WebM文件为无效音频

## 依赖要求

### 1. Node.js包
```json
"fluent-ffmpeg": "^2.1.3"
```

### 2. 系统依赖 - FFmpeg
必须在系统中安装FFmpeg：

#### macOS
```bash
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

#### Windows
1. 从 https://ffmpeg.org/download.html 下载
2. 解压到合适的目录
3. 添加到系统PATH环境变量

## 测试音频转换

1. 放置测试文件：
```bash
# 在uploads/recordings/目录下放置test.webm文件
```

2. 运行测试脚本：
```bash
node test/testAudioConversion.js
```

## 转换流程

1. **接收WebM音频** → 浏览器录制的音频文件
2. **验证音频文件** → 检查文件大小和基本有效性
3. **转换为WAV** → 使用FFmpeg转换为16kHz单声道WAV
4. **发送到Azure** → 使用正确的Content-Type头
5. **清理临时文件** → 删除转换生成的临时WAV文件

## 性能考虑

- 转换过程会增加处理时间（通常1-3秒）
- 临时文件会占用磁盘空间，但会自动清理
- 建议在生产环境使用队列系统处理大量转换任务

## 故障排除

### FFmpeg未找到
- 确保FFmpeg已正确安装并在PATH中
- 运行 `ffmpeg -version` 验证安装

### 转换失败
- 检查源文件是否损坏
- 确保有足够的磁盘空间
- 查看FFmpeg错误日志

### Azure仍无法识别
- 验证Azure配置是否正确
- 确认音频中确实包含语音内容
- 尝试使用不同的语言设置