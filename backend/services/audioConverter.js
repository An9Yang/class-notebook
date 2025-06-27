const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

/**
 * Convert audio file to WAV format suitable for Azure Speech Service
 * @param {string} inputPath - Path to the input audio file
 * @returns {Promise<string>} - Path to the converted WAV file
 */
exports.convertToWav = async (inputPath) => {
  // Generate output path with .wav extension
  const outputPath = inputPath.replace(path.extname(inputPath), '_converted.wav');
  
  console.log('=== 音频格式转换开始 ===');
  console.log('输入文件:', inputPath);
  console.log('输出文件:', outputPath);
  
  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')  // PCM 16-bit little-endian - Azure's preferred format
      .audioFrequency(16000)     // 16kHz sample rate for speech recognition
      .audioChannels(1)          // Mono audio
      .on('start', (commandLine) => {
        console.log('FFmpeg命令:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('转换进度:', progress.percent ? `${progress.percent.toFixed(2)}%` : '处理中...');
      })
      .on('end', () => {
        console.log('音频转换成功');
        // Verify the output file exists
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log('输出文件大小:', stats.size, 'bytes');
          resolve(outputPath);
        } else {
          reject(new Error('转换后的文件未创建'));
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg错误:', err.message);
        // Clean up partial output file if it exists
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch (cleanupError) {
            console.error('清理失败文件时出错:', cleanupError);
          }
        }
        reject(new Error(`音频格式转换失败: ${err.message}`));
      })
      .save(outputPath);
  });
};

/**
 * Clean up temporary converted files
 * @param {string} filePath - Path to the file to delete
 */
exports.cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath) && filePath.includes('_converted')) {
    try {
      fs.unlinkSync(filePath);
      console.log('临时文件已清理:', filePath);
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
};

/**
 * Get audio file information
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<Object>} - Audio metadata
 */
exports.getAudioInfo = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        resolve({
          format: metadata.format.format_name,
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          codec: audioStream ? audioStream.codec_name : 'unknown',
          sampleRate: audioStream ? audioStream.sample_rate : 0,
          channels: audioStream ? audioStream.channels : 0
        });
      }
    });
  });
};