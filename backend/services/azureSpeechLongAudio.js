const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { validateAudioFile } = require('./audioValidator');
const { convertToWav, cleanupTempFile, getAudioInfo } = require('./audioConverter');

// 将音频文件分割成多个片段
async function splitAudioFile(audioPath, segmentDuration = 60) {
  const outputDir = path.join(path.dirname(audioPath), 'segments');
  
  // 创建临时目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 获取音频信息
  const audioInfo = await getAudioInfo(audioPath);
  const duration = parseFloat(audioInfo.duration);
  
  console.log(`音频总时长: ${duration}秒，将分割成${segmentDuration}秒的片段`);
  
  const segments = [];
  const segmentCount = Math.ceil(duration / segmentDuration);
  
  // 使用ffmpeg分割音频
  for (let i = 0; i < segmentCount; i++) {
    const startTime = i * segmentDuration;
    const segmentPath = path.join(outputDir, `segment_${i}.wav`);
    
    // ffmpeg命令：从startTime开始，持续segmentDuration秒
    const ffmpegCmd = `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${segmentDuration} -acodec pcm_s16le -ar 16000 -ac 1 "${segmentPath}" -y`;
    
    try {
      await execAsync(ffmpegCmd);
      segments.push({
        path: segmentPath,
        index: i,
        startTime: startTime,
        duration: Math.min(segmentDuration, duration - startTime)
      });
      console.log(`分割片段 ${i + 1}/${segmentCount} 完成`);
    } catch (error) {
      console.error(`分割片段 ${i} 失败:`, error);
    }
  }
  
  return { segments, outputDir };
}

// 转写单个音频片段
async function transcribeSegment(segmentPath, speechKey, region, language = 'zh-CN') {
  const audioData = fs.readFileSync(segmentPath);
  const requestUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}&format=simple`;
  
  try {
    const response = await axios({
      method: 'post',
      url: requestUrl,
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'audio/wav',
        'Accept': 'application/json'
      },
      data: audioData,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000
    });
    
    if (response.data && response.data.RecognitionStatus === 'Success' && response.data.DisplayText) {
      return response.data.DisplayText;
    }
    
    return '';
  } catch (error) {
    console.error('片段转写失败:', error.message);
    return '';
  }
}

// 清理临时文件和目录
function cleanupSegments(outputDir) {
  try {
    if (fs.existsSync(outputDir)) {
      // 删除所有片段文件
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(outputDir, file));
      });
      // 删除目录
      fs.rmdirSync(outputDir);
    }
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
}

// 处理长音频的主函数
exports.transcribeLongAudio = async (audioFilePath) => {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  console.log('=== 长音频转写开始 ===');
  console.log('音频文件路径:', audioFilePath);
  
  if (!speechKey || !region) {
    throw new Error('Azure Speech服务未配置');
  }

  let convertedFilePath = null;
  let segmentInfo = null;
  
  try {
    // 验证音频文件
    const validation = await validateAudioFile(audioFilePath);
    if (!validation.valid) {
      console.warn('音频文件验证失败:', validation.reason);
      return `[音频文件问题: ${validation.reason}]`;
    }
    
    // 获取音频信息
    const audioInfo = await getAudioInfo(audioFilePath);
    console.log('音频文件信息:', audioInfo);
    const duration = parseFloat(audioInfo.duration);
    
    // 如果音频小于60秒，直接使用原有方法
    if (duration <= 60) {
      console.log('音频时长小于60秒，使用标准转写方法');
      // 调用原有的转写方法
      const { transcribeAudioEnhanced } = require('./azureSpeechEnhanced');
      return await transcribeAudioEnhanced(audioFilePath);
    }
    
    // 转换为WAV格式（如果需要）
    let processFilePath = audioFilePath;
    if (audioFilePath.toLowerCase().endsWith('.webm') || audioFilePath.toLowerCase().endsWith('.m4a')) {
      console.log('检测到WebM/M4A格式，开始转换为WAV...');
      convertedFilePath = await convertToWav(audioFilePath);
      processFilePath = convertedFilePath;
      console.log('音频转换成功');
    }
    
    // 分割音频文件
    console.log('开始分割长音频...');
    segmentInfo = await splitAudioFile(processFilePath, 55); // 使用55秒片段，留5秒余量
    
    // 转写每个片段
    console.log(`开始转写 ${segmentInfo.segments.length} 个片段...`);
    const transcripts = [];
    
    for (const segment of segmentInfo.segments) {
      console.log(`转写片段 ${segment.index + 1}/${segmentInfo.segments.length}...`);
      const transcript = await transcribeSegment(
        segment.path,
        speechKey,
        region,
        'zh-CN'
      );
      
      if (transcript) {
        transcripts.push(transcript);
        console.log(`片段 ${segment.index + 1} 转写完成`);
      } else {
        console.log(`片段 ${segment.index + 1} 无识别结果`);
      }
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 合并所有转写结果
    const fullTranscript = transcripts.join(' ');
    console.log(`转写完成，共识别 ${transcripts.length} 个片段`);
    
    return fullTranscript || '[无法识别到语音内容]';
    
  } catch (error) {
    console.error('=== 长音频转写错误 ===');
    console.error('错误:', error.message);
    throw new Error(`长音频转写失败: ${error.message}`);
  } finally {
    // 清理临时文件
    if (convertedFilePath) {
      cleanupTempFile(convertedFilePath);
    }
    if (segmentInfo && segmentInfo.outputDir) {
      cleanupSegments(segmentInfo.outputDir);
    }
  }
};