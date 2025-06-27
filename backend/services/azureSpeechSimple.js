const axios = require('axios');
const fs = require('fs');
const { convertToWav, cleanupTempFile, getAudioInfo } = require('./audioConverter');

// 使用Azure Speech REST API进行转写（支持更多格式）
exports.transcribeAudioREST = async (audioFilePath) => {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  console.log('=== Azure Speech 转写开始 ===');
  console.log('音频文件路径:', audioFilePath);
  console.log('Azure区域:', region);
  console.log('是否有Speech Key:', !!speechKey);
  
  if (!speechKey || !region) {
    console.error('Azure配置缺失 - speechKey:', !!speechKey, ', region:', region);
    throw new Error('Azure Speech服务未配置');
  }

  let convertedFilePath = null;
  
  try {
    // 获取音频文件信息
    try {
      const audioInfo = await getAudioInfo(audioFilePath);
      console.log('音频文件信息:', audioInfo);
    } catch (infoError) {
      console.warn('无法获取音频信息:', infoError.message);
    }
    
    // 如果是WebM格式，先转换为WAV
    let processFilePath = audioFilePath;
    if (audioFilePath.toLowerCase().endsWith('.webm') || audioFilePath.toLowerCase().endsWith('.m4a')) {
      console.log('检测到WebM/M4A格式，开始转换为WAV...');
      try {
        convertedFilePath = await convertToWav(audioFilePath);
        processFilePath = convertedFilePath;
        console.log('音频转换成功，使用转换后的文件:', processFilePath);
      } catch (convertError) {
        console.error('音频转换失败:', convertError);
        // 如果转换失败，仍然尝试使用原始文件
        console.log('将尝试使用原始文件进行转写');
      }
    }
    
    // 读取音频文件
    const audioData = fs.readFileSync(processFilePath);
    console.log('音频文件大小:', audioData.length, 'bytes');
    
    const requestUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN&format=simple`;
    console.log('请求URL:', requestUrl);
    
    // 调用Azure Speech REST API
    const response = await axios({
      method: 'post',
      url: requestUrl,
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': processFilePath.endsWith('.wav') ? 'audio/wav' : 'audio/webm; codecs=opus',
        'Accept': 'application/json'
      },
      data: audioData,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    console.log('=== Azure Speech 响应 ===');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.RecognitionStatus === 'Success') {
      const displayText = response.data.DisplayText;
      console.log('转写成功，文本:', displayText);
      console.log('文本长度:', displayText ? displayText.length : 0);
      return displayText;
    } else {
      console.error('转写未成功，状态:', response.data?.RecognitionStatus);
      throw new Error(response.data?.RecognitionStatus || '转写失败');
    }
    
  } catch (error) {
    console.error('=== Azure Speech 错误 ===');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw new Error(`语音转写失败: ${error.response?.data?.Message || error.message}`);
  } finally {
    // 清理临时转换的文件
    if (convertedFilePath) {
      cleanupTempFile(convertedFilePath);
    }
  }
};