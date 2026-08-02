const xlsx = require('xlsx');

// Parse uploaded Excel file to JSON
const excelToJson = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error('Excel Parsing Error:', error.message);
    throw new Error('Failed to parse Excel file. Ensure it is formatted correctly.');
  }
};

// Generate Excel file buffer from JSON
const jsonToExcel = (data, sheetName = 'Report') => {
  try {
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Write option to return Buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  } catch (error) {
    console.error('Excel Generating Error:', error.message);
    throw new Error('Failed to generate Excel file.');
  }
};

module.exports = { excelToJson, jsonToExcel };
