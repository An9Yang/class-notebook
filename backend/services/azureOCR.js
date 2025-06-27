const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');
const fs = require('fs');

// 创建Document Intelligence客户端
let documentClient = null;

const getDocumentClient = () => {
  if (!documentClient) {
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    
    if (!endpoint || !apiKey) {
      throw new Error('Azure Document Intelligence未配置');
    }
    
    console.log('Azure Document Intelligence配置:');
    console.log('Endpoint:', endpoint);
    console.log('Key前缀:', apiKey.substring(0, 10) + '...');
    
    documentClient = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(apiKey)
    );
  }
  return documentClient;
};

// 从图片中提取文字
exports.extractTextFromImage = async (imagePath) => {
  try {
    const client = getDocumentClient();
    
    // 读取图片文件
    const imageBuffer = fs.readFileSync(imagePath);
    
    console.log('开始OCR识别，文件大小:', imageBuffer.length, 'bytes');
    
    // 使用预构建的读取模型进行分析
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-read',  // 改用read模型，专门用于文字识别
      imageBuffer
    );
    
    console.log('等待OCR处理完成...');
    
    // 等待分析完成
    const result = await poller.pollUntilDone();
    
    // 提取文本内容，保持原始格式
    let extractedText = '';
    
    if (result.content) {
      extractedText = result.content;
    }
    
    // 如果有段落信息，使用段落来更好地保持格式
    if (result.paragraphs && result.paragraphs.length > 0) {
      const paragraphs = result.paragraphs.map(p => p.content);
      extractedText = paragraphs.join('\n\n');
    }
    
    // 如果有表格，也提取表格内容
    const tables = [];
    if (result.tables) {
      for (const table of result.tables) {
        const tableData = [];
        for (let i = 0; i < table.rowCount; i++) {
          const row = [];
          for (let j = 0; j < table.columnCount; j++) {
            const cell = table.cells.find(c => c.rowIndex === i && c.columnIndex === j);
            row.push(cell ? cell.content : '');
          }
          tableData.push(row);
        }
        tables.push(tableData);
      }
    }
    
    return {
      text: extractedText,
      tables: tables,
      confidence: result.pages?.[0]?.words?.[0]?.confidence || 0
    };
    
  } catch (error) {
    console.error('OCR识别错误详情:');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    if (error.code === 'ENOENT') {
      throw new Error('图片文件不存在');
    }
    
    if (error.statusCode === 401) {
      throw new Error('Azure认证失败，请检查API密钥');
    }
    
    if (error.statusCode === 404) {
      throw new Error('Azure endpoint不正确');
    }
    
    throw new Error(`OCR识别失败: ${error.message || '未知错误'}`);
  }
};

// 验证Azure Document Intelligence配置
exports.validateOCRConfig = () => {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  
  if (!endpoint || !key) {
    console.warn('⚠️  Azure Document Intelligence未配置，OCR功能将不可用');
    return false;
  }
  
  console.log('✅ Azure Document Intelligence已配置');
  return true;
};