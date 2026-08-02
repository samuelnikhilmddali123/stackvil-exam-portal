const PDFDocument = require('pdfkit');

const generateResultPDF = (result, res) => {
  const doc = new PDFDocument({ margin: 50 });
  
  // Set Response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Result-${result._id}.pdf`);
  
  doc.pipe(res);
  
  // Title / Brand
  doc.fillColor('#1e3a8a')
     .fontSize(24)
     .text('STACKVIL ONLINE EXAMINATION PORTAL', { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#4b5563')
     .fontSize(12)
     .text('Official Performance Certificate & Result Sheet', { align: 'center' });
  doc.moveDown(1.5);
  
  // Decorative line
  doc.moveTo(50, 120).lineTo(550, 120).stroke('#e5e7eb');
  doc.moveDown(2);
  
  // Candidate Details Card
  doc.fillColor('#111827')
     .fontSize(14)
     .text(`Candidate Name :   ${result.candidate.name}`)
     .text(`Email Address  :   ${result.candidate.email}`)
     .text(`Department     :   ${result.candidate.department || 'General'}`)
     .text(`Exam Name      :   ${result.exam.title}`)
     .text(`Date Completed :   ${new Date(result.submittedAt).toLocaleDateString()}`)
     .moveDown(1.5);
     
  // Divider
  doc.moveTo(50, 240).lineTo(550, 240).stroke('#e5e7eb');
  doc.moveDown(1.5);

  // Performance Table / summary
  doc.fontSize(16)
     .fillColor('#1e3a8a')
     .text('Performance Summary', { underline: false })
     .moveDown(0.5);
     
  const correct = result.responses.filter(r => r.isCorrect).length;
  const wrong = result.responses.filter(r => !r.isCorrect && r.answer !== undefined && r.answer !== null && r.answer !== '').length;
  const skipped = result.responses.filter(r => r.answer === undefined || r.answer === null || r.answer === '').length;
  
  doc.fontSize(12)
     .fillColor('#374151')
     .text(`Final Score         :   ${result.score} marks`)
     .text(`Percentage Score    :   ${result.percentage.toFixed(2)}%`)
     .text(`Minimum Pass Cutoff :   ${result.exam.passingScore}%`)
     .text(`Result Status       :   ${result.status.toUpperCase()}`)
     .text(`Total Duration      :   ${Math.floor(result.totalTimeTaken / 60)} minutes, ${result.totalTimeTaken % 60} seconds`)
     .text(`Warnings Logged     :   ${result.warningsCount} / 5`)
     .moveDown(1.5);
     
  // Response Stats
  doc.fontSize(16)
     .fillColor('#1e3a8a')
     .text('Response Metrics', { underline: false })
     .moveDown(0.5);
     
  doc.fontSize(12)
     .fillColor('#374151')
     .text(`Correct Responses   :   ${correct}`)
     .text(`Incorrect Responses :   ${wrong}`)
     .text(`Skipped Questions   :   ${skipped}`)
     .moveDown(2.5);
     
  // Footer
  doc.fontSize(10)
     .fillColor('#9ca3af')
     .text('This document is electronically generated and digitally signed.', { align: 'center' })
     .text('Powered by Stackvil Proctoring & Online Examination Engine.', { align: 'center' });
     
  doc.end();
};

module.exports = { generateResultPDF };
