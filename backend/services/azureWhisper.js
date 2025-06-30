const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { validateAudioFile } = require('./audioValidator');
const { convertToWav, cleanupTempFile, getAudioInfo } = require('./audioConverter');

// Azure OpenAI Whisper 转写服务
exports.transcribeWithWhisper = async (audioFilePath) => {
  const endpoint = process.env.AZURE_WHISPER_ENDPOINT || 'https://indieapp.openai.azure.com';
  const deploymentName = process.env.AZURE_WHISPER_DEPLOYMENT || 'gpt-4o-transcribe';
  const apiKey = process.env.AZURE_WHISPER_KEY;
  const apiVersion = '2025-03-01-preview';
  
  console.log('=== Azure OpenAI Whisper 转写开始 ===');
  console.log('音频文件路径:', audioFilePath);
  
  if (!apiKey || !endpoint) {
    throw new Error('Azure OpenAI Whisper服务未配置');
  }

  let processFilePath = audioFilePath;
  let convertedFilePath = null;
  
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
    console.log(`音频时长: ${duration}秒 (${Math.floor(duration/60)}分${Math.floor(duration%60)}秒)`);
    
    // 检查文件大小（Whisper API 限制 25MB）
    const stats = fs.statSync(audioFilePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`文件大小: ${fileSizeMB.toFixed(2)}MB`);
    
    if (fileSizeMB > 25) {
      console.warn('文件大小超过25MB限制，可能需要压缩或分段处理');
      // 这里可以添加音频压缩逻辑
    }
    
    // 如果是WebM格式，转换为支持的格式
    if (audioFilePath.toLowerCase().endsWith('.webm')) {
      console.log('检测到WebM格式，开始转换为MP3...');
      // Whisper 支持 mp3, mp4, mpeg, mpga, m4a, wav, webm
      // 但为了兼容性，我们转换为 wav
      convertedFilePath = await convertToWav(audioFilePath);
      processFilePath = convertedFilePath;
      console.log('音频转换成功');
    }
    
    // 准备表单数据
    const form = new FormData();
    form.append('file', fs.createReadStream(processFilePath));
    form.append('model', 'whisper-1'); // 使用 whisper 模型
    form.append('language', 'zh'); // 指定中文，提高准确率
    form.append('response_format', 'json'); // 返回 JSON 格式
    
    // 构建请求URL
    const url = `${endpoint}/openai/deployments/${deploymentName}/audio/transcriptions?api-version=${apiVersion}`;
    
    console.log('开始调用 Azure OpenAI Whisper API...');
    console.log('请求URL:', url);
    
    // 发送请求
    const response = await axios({
      method: 'post',
      url: url,
      data: form,
      headers: {
        ...form.getHeaders(),
        'api-key': apiKey,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300000 // 5分钟超时（长音频需要更多时间）
    });
    
    console.log('Whisper API 响应状态:', response.status);
    
    if (response.data && response.data.text) {
      const transcript = response.data.text;
      console.log('转写成功！');
      console.log('转写文本长度:', transcript.length);
      console.log('转写文本预览:', transcript.substring(0, 100) + '...');
      
      // 如果有额外信息，也记录下来
      if (response.data.duration) {
        console.log('音频时长（API返回）:', response.data.duration, '秒');
      }
      if (response.data.language) {
        console.log('检测到的语言:', response.data.language);
      }
      
      return transcript;
    } else {
      console.error('API响应格式异常:', response.data);
      throw new Error('转写结果格式异常');
    }
    
  } catch (error) {
    console.error('=== Azure OpenAI Whisper 错误 ===');
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
      
      // 处理常见错误
      if (error.response.status === 413) {
        throw new Error('音频文件太大，请确保文件小于25MB');
      } else if (error.response.status === 400) {
        throw new Error('音频格式不支持或请求参数错误');
      } else if (error.response.status === 401) {
        throw new Error('API密钥无效或已过期');
      } else if (error.response.status === 429) {
        throw new Error('请求频率超限，请稍后重试');
      }
    }
    
    console.error('错误详情:', error.message);
    throw new Error(`Whisper转写失败: ${error.message}`);
  } finally {
    // 清理临时文件
    if (convertedFilePath) {
      cleanupTempFile(convertedFilePath);
    }
  }
};

// 导出一个兼容原有接口的函数
exports.transcribeAudioWhisper = exports.transcribeWithWhisper;