const axios = require('axios');
const fs = require('fs');
const { validateAudioFile } = require('./audioValidator');
const { convertToWav, cleanupTempFile, getAudioInfo } = require('./audioConverter');

// Enhanced Azure Speech service with multiple language support and better error handling
exports.transcribeAudioEnhanced = async (audioFilePath) => {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  console.log('=== Enhanced Azure Speech 转写开始 ===');
  console.log('音频文件路径:', audioFilePath);
  
  if (!speechKey || !region) {
    throw new Error('Azure Speech服务未配置');
  }

  let convertedFilePath = null;
  
  try {
    // 首先验证音频文件
    const validation = await validateAudioFile(audioFilePath);
    if (!validation.valid) {
      console.warn('音频文件验证失败:', validation.reason);
      return `[音频文件问题: ${validation.reason}]`;
    }
    
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
    
    // 首先尝试自动语言检测
    const autoDetectUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN,en-US&format=detailed`;
    console.log('尝试自动语言检测...');
    
    try {
      const autoResponse = await axios({
        method: 'post',
        url: autoDetectUrl,
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': processFilePath.endsWith('.wav') ? 'audio/wav' : 'audio/webm; codecs=opus',
          'Accept': 'application/json'
        },
        data: audioData,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000 // 30秒超时
      });
      
      console.log('自动检测响应:', JSON.stringify(autoResponse.data, null, 2));
      
      if (autoResponse.data && autoResponse.data.RecognitionStatus === 'Success' && autoResponse.data.DisplayText) {
        console.log('自动检测成功，识别到的语言:', autoResponse.data.Language || 'unknown');
        return autoResponse.data.DisplayText;
      }
    } catch (autoError) {
      console.log('自动语言检测失败，尝试其他方法...');
    }
    
    // 尝试不同的语言设置
    const languages = ['zh-CN', 'en-US', 'zh-HK', 'zh-TW'];
    
    for (const lang of languages) {
      console.log(`\n尝试语言: ${lang}`);
      const requestUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=simple`;
      
      try {
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
          maxContentLength: Infinity,
          timeout: 30000
        });
        
        if (response.data && response.data.RecognitionStatus === 'Success' && response.data.DisplayText) {
          console.log(`${lang} 转写成功:`, response.data.DisplayText);
          return response.data.DisplayText;
        }
      } catch (langError) {
        console.log(`${lang} 转写失败:`, langError.message);
      }
    }
    
    // 如果所有语言都没有结果，返回空字符串但带说明
    console.warn('所有语言都未能识别到内容，可能音频文件中没有可识别的语音');
    return '[无法识别到语音内容，请检查录音是否包含清晰的语音]';
    
  } catch (error) {
    console.error('=== Enhanced Azure Speech 错误 ===');
    console.error('错误:', error.message);
    throw new Error(`语音转写失败: ${error.message}`);
  } finally {
    // 清理临时转换的文件
    if (convertedFilePath) {
      cleanupTempFile(convertedFilePath);
    }
  }
};