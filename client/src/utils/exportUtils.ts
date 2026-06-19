import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type JSONData = any[];

export const exportToCSV = (data: JSONData, filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const exportToExcel = (data: JSONData, filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data: JSONData, filename: string, title?: string) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF('landscape');
    if (title) {
        doc.text(title, 14, 15);
    }

    // Extract headers
    const headers = Object.keys(data[0]);

    // Format data into an array of arrays
    const formattedData = data.map(item =>
        headers.map(header => {
            const val = item[header];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
        })
    );

    autoTable(doc, {
        head: [headers],
        body: formattedData,
        startY: title ? 25 : 15,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    });

    doc.save(`${filename}.pdf`);
};
