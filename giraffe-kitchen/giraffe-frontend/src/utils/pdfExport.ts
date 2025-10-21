import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DetailedReview } from '../types/managerReview';

// Helper to get status label in Hebrew
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'טיוטה',
    submitted: 'הוגש',
    completed: 'הושלם',
  };
  return labels[status] || status;
};

// Helper to get quarter label in Hebrew
const getQuarterLabel = (quarter: string): string => {
  const labels: Record<string, string> = {
    Q1: 'רבעון 1 (ינואר-מרץ)',
    Q2: 'רבעון 2 (אפריל-יוני)',
    Q3: 'רבעון 3 (יולי-ספטמבר)',
    Q4: 'רבעון 4 (אוקטובר-דצמבר)',
  };
  return labels[quarter] || quarter;
};

// Helper to get score color
const getScoreColor = (score: number | null): [number, number, number] => {
  if (!score) return [156, 163, 175]; // gray
  if (score >= 85) return [34, 197, 94]; // green
  if (score >= 70) return [234, 179, 8]; // yellow
  return [239, 68, 68]; // red
};

export const exportReviewToPDF = (review: DetailedReview) => {
  const doc = new jsPDF();

  // Set right-to-left direction (for Hebrew)
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Title
  doc.setFontSize(20);
  doc.text('Giraffe Kitchens', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(16);
  doc.text('Manager Performance Review', pageWidth / 2, 30, { align: 'center' });

  // Basic Info Section
  doc.setFontSize(12);
  let yPos = 45;

  doc.text(`Manager: ${review.manager?.name || 'N/A'}`, 20, yPos);
  yPos += 8;
  doc.text(`Branch: ${review.branch?.name || 'N/A'}`, 20, yPos);
  yPos += 8;
  doc.text(`Period: ${getQuarterLabel(review.quarter)} ${review.year}`, 20, yPos);
  yPos += 8;
  doc.text(`Reviewer: ${review.reviewer?.name || 'N/A'}`, 20, yPos);
  yPos += 8;
  doc.text(`Status: ${getStatusLabel(review.status)}`, 20, yPos);
  yPos += 15;

  // Overall Score
  if (review.overall_score !== null) {
    doc.setFontSize(14);
    const scoreColor = getScoreColor(review.overall_score);
    doc.setTextColor(...scoreColor);
    doc.text(`Overall Score: ${review.overall_score}`, 20, yPos);
    doc.setTextColor(0, 0, 0); // Reset to black
    yPos += 12;
  }

  // Auto Data Section
  doc.setFontSize(11);
  doc.text('System Data (from audits):', 20, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.text(`Sanitation Avg: ${review.auto_data.sanitation_avg?.toFixed(1) || 'N/A'} (${review.auto_data.sanitation_count || 0} audits)`, 25, yPos);
  yPos += 6;
  doc.text(`Dish Checks Avg: ${review.auto_data.dish_checks_avg?.toFixed(1) || 'N/A'} (${review.auto_data.dish_checks_count || 0} checks)`, 25, yPos);
  yPos += 12;

  // Operational Category (35%)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Operational (35%) - Score: ${review.operational.score?.toFixed(1) || 'N/A'}`, 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 8;

  const operationalRows = [
    ['Sanitation (10pts)', review.operational.sanitation.score || '-', review.operational.sanitation.comments || '-'],
    ['Inventory (10pts)', review.operational.inventory.score || '-', review.operational.inventory.comments || '-'],
    ['Quality (10pts)', review.operational.quality.score || '-', review.operational.quality.comments || '-'],
    ['Maintenance (5pts)', review.operational.maintenance.score || '-', review.operational.maintenance.comments || '-'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Score', 'Comments']],
    body: operationalRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // People Category (30%)
  doc.setFont('helvetica', 'bold');
  doc.text(`People (30%) - Score: ${review.people.score?.toFixed(1) || 'N/A'}`, 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 8;

  const peopleRows = [
    ['Recruitment (10pts)', review.people.recruitment.score || '-', review.people.recruitment.comments || '-'],
    ['Scheduling (10pts)', review.people.scheduling.score || '-', review.people.scheduling.comments || '-'],
    ['Retention (10pts)', review.people.retention.score || '-', review.people.retention.comments || '-'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Score', 'Comments']],
    body: peopleRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // Business Category (25%)
  doc.setFont('helvetica', 'bold');
  doc.text(`Business (25%) - Score: ${review.business.score?.toFixed(1) || 'N/A'}`, 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 8;

  const businessRows = [
    ['Sales (15pts)', review.business.sales.score || '-', review.business.sales.comments || '-'],
    ['Efficiency (10pts)', review.business.efficiency.score || '-', review.business.efficiency.comments || '-'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Score', 'Comments']],
    body: businessRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Leadership Category (10%)
  doc.setFont('helvetica', 'bold');
  doc.text(`Leadership (10%) - Score: ${review.leadership.score?.toFixed(1) || 'N/A'}`, 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 8;

  const leadershipRows = [
    ['Leadership', '-', review.leadership.comments || '-'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Score', 'Comments']],
    body: leadershipRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by Giraffe Kitchens Management System', pageWidth / 2, finalY > pageHeight - 20 ? pageHeight - 10 : finalY, { align: 'center' });
  doc.text(new Date().toLocaleString('en-US'), pageWidth / 2, finalY > pageHeight - 20 ? pageHeight - 5 : finalY + 5, { align: 'center' });

  // Save the PDF
  const filename = `Review_${review.manager?.name || 'Unknown'}_${review.quarter}${review.year}.pdf`;
  doc.save(filename);
};
