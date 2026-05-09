/**
 * Google Sheets Export Service
 * Creates a new Google Spreadsheet, writes data, shares it publicly, and returns the URL.
 */

interface SheetExportOptions {
    title: string;
    headers: string[];
    rows: (string | number)[][];
    sheetName?: string;
}

/**
 * Create a new Google Spreadsheet, populate it with data, and share it publicly (anyone can edit).
 * Returns the URL of the created spreadsheet.
 */
export async function exportToGoogleSheet(
    token: string,
    options: SheetExportOptions
): Promise<string> {
    const { title, headers, rows, sheetName = 'Sheet1' } = options;

    // 1. Create a new blank spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: { title },
            sheets: [{
                properties: {
                    title: sheetName,
                    gridProperties: { frozenRowCount: 1 }
                }
            }]
        })
    });

    if (!createRes.ok) {
        const errBody = await createRes.text();
        if (createRes.status === 401 || createRes.status === 403) {
            throw new Error('AUTH_EXPIRED');
        }
        throw new Error(`Không thể tạo Google Sheet: ${errBody}`);
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl;
    const sheetId = spreadsheet.sheets[0].properties.sheetId;

    // 2. Write data (headers + rows)
    const allRows = [headers, ...rows];
    const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?valueInputOption=USER_ENTERED`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                range: sheetName,
                majorDimension: 'ROWS',
                values: allRows
            })
        }
    );

    if (!writeRes.ok) {
        const errBody = await writeRes.text();
        throw new Error(`Không thể ghi dữ liệu: ${errBody}`);
    }

    // 3. Format header row (bold, background color, auto-resize)
    const numCols = headers.length;
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                // Bold header
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                textFormat: { bold: true, fontSize: 11 },
                                backgroundColor: { red: 0.85, green: 0.92, blue: 1.0 },
                                horizontalAlignment: 'CENTER',
                                verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment)'
                    }
                },
                // Auto-resize all columns
                {
                    autoResizeDimensions: {
                        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: numCols }
                    }
                },
                // Freeze header row
                {
                    updateSheetProperties: {
                        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                        fields: 'gridProperties.frozenRowCount'
                    }
                }
            ]
        })
    }).catch(() => { /* formatting is non-critical */ });

    // 4. Share the spreadsheet publicly (anyone with link can edit)
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            role: 'writer',
            type: 'anyone'
        })
    }).catch((err) => {
        console.warn('Could not set public sharing:', err);
    });

    return spreadsheetUrl;
}
