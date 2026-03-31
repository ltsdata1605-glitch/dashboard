// Google Drive API Integration

const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

/**
 * Uploads a given File (e.g., .xlsx) directly to Google Drive using the provided OAuth token.
 */
export const uploadFileToDrive = async (file: File, token: string, filenamePrefix: string = 'ycv_report'): Promise<string> => {
    if (!token) throw new Error("Missing Google OAuth Token");

    const metadata = {
        name: `${filenamePrefix}_${Date.now()}_${file.name}`,
        mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        parents: [] // Optionally create an app folder and put ID here
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch(DRIVE_UPLOAD_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: form
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Drive Upload Failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.id as string; // Required fileId to download later
};


/**
 * Fetches the binary Blob of the Excel file from Google Drive using its fileId.
 */
export const downloadFileFromDrive = async (fileId: string, token: string): Promise<Blob> => {
    if (!token) throw new Error("Missing Google OAuth Token");

    const response = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Google Drive Download Failed: ${response.statusText}`);
    }

    return await response.blob();
};
