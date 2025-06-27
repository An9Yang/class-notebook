const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Azure Speech配置
const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY || '',
  process.env.AZURE_SPEECH_REGION || ''
);

// 设置语言为中文
speechConfig.speechRecognitionLanguage = 'zh-CN';

// 转换音频格式
const convertToWav = async (inputPath) => {
  const outputPath = inputPath.replace(path.extname(inputPath), '.wav');
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

// 将音频文件转换为文字
exports.transcribeAudio = async (audioFilePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(audioFilePath)) {
        reject(new Error('音频文件不存在'));
        return;
      }

      // 如果不是WAV格式，先转换
      let wavFilePath = audioFilePath;
      if (!audioFilePath.endsWith('.wav')) {
        try {
          wavFilePath = await convertToWav(audioFilePath);
        } catch (error) {
          reject(new Error(`音频格式转换失败: ${error.message}`));
          return;
        }
      }

      // 创建音频配置
      const audioConfig = sdk.AudioConfig.fromWavFileInput(
        fs.readFileSync(wavFilePath)
      );

      // 创建语音识别器
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      let fullTranscript = '';

      // 识别结果事件
      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          fullTranscript += e.result.text + ' ';
        }
      };

      // 错误事件
      recognizer.canceled = (s, e) => {
        recognizer.close();
        if (e.reason === sdk.CancellationReason.Error) {
          reject(new Error(`语音识别错误: ${e.errorDetails}`));
        } else {
          resolve(fullTranscript.trim());
        }
      };

      // 完成事件
      recognizer.sessionStopped = (s, e) => {
        recognizer.close();
        
        // 清理临时WAV文件
        if (wavFilePath !== audioFilePath && fs.existsSync(wavFilePath)) {
          fs.unlinkSync(wavFilePath);
        }
        
        resolve(fullTranscript.trim());
      };

      // 开始连续识别
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('开始语音识别...');
        },
        (error) => {
          recognizer.close();
          reject(new Error(`启动语音识别失败: ${error}`));
        }
      );

    } catch (error) {
      reject(error);
    }
  });
};

// 验证Azure Speech配置
exports.validateSpeechConfig = () => {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  if (!key || !region) {
    console.warn('⚠️  Azure Speech服务未配置，语音转文字功能将不可用');
    return false;
  }
  
  console.log('✅ Azure Speech服务已配置');
  return true;
};