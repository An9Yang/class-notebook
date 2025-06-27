const fs = require('fs');
const path = require('path');

// Simple audio validation to check if file might be silent or corrupted
exports.validateAudioFile = async (audioFilePath) => {
  try {
    const stats = fs.statSync(audioFilePath);
    
    // Check file size
    if (stats.size < 1000) {
      return {
        valid: false,
        reason: '文件太小，可能已损坏'
      };
    }
    
    // For WebM files, be more lenient with validation
    const ext = path.extname(audioFilePath).toLowerCase();
    const isWebM = ext === '.webm';
    const isM4A = ext === '.m4a';
    
    // Read a sample of the file to check for patterns
    const buffer = fs.readFileSync(audioFilePath);
    const sampleSize = Math.min(buffer.length, 10000);
    const sample = buffer.slice(1000, 1000 + sampleSize); // Skip header
    
    // Check for silence (all zeros or very low values)
    let nonZeroCount = 0;
    let totalVariance = 0;
    let lastValue = 0;
    
    for (let i = 0; i < sample.length; i++) {
      const value = sample[i];
      if (value !== 0) nonZeroCount++;
      totalVariance += Math.abs(value - lastValue);
      lastValue = value;
    }
    
    const nonZeroRatio = nonZeroCount / sample.length;
    const avgVariance = totalVariance / sample.length;
    
    console.log('音频验证结果:');
    console.log('- 文件类型:', ext);
    console.log('- 文件大小:', stats.size, 'bytes');
    console.log('- 非零值比例:', (nonZeroRatio * 100).toFixed(2) + '%');
    console.log('- 平均变化值:', avgVariance.toFixed(2));
    
    // WebM and M4A files may have different encoding, so be more lenient
    if (isWebM || isM4A) {
      // For WebM/M4A, just check if file has some content
      if (stats.size < 5000) {
        return {
          valid: false,
          reason: 'WebM/M4A文件太小，可能没有录制成功'
        };
      }
      // Skip detailed validation for WebM/M4A as they use different encoding
      return {
        valid: true,
        reason: 'WebM/M4A文件格式正常'
      };
    }
    
    // For other formats, apply stricter validation
    if (nonZeroRatio < 0.01) {
      return {
        valid: false,
        reason: '音频文件可能是静音的'
      };
    }
    
    if (avgVariance < 0.1) {
      return {
        valid: false,
        reason: '音频文件可能没有有效的声音内容'
      };
    }
    
    return {
      valid: true,
      reason: '音频文件格式正常'
    };
    
  } catch (error) {
    return {
      valid: false,
      reason: '无法读取音频文件: ' + error.message
    };
  }
};