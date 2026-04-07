// Google Drive API Integration

const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

const handleDriveError = async (response: Response, action: string) => {
    if (response.status === 401) {
        sessionStorage.removeItem('googleOAuthToken');
        window.dispatchEvent(new CustomEvent('google-auth-expired'));
        throw new Error("Phiên kết nối Google Drive đã hết hạn. Vui lòng đăng nhập lại Google.");
    }
    let errorText = '';
    try { errorText = await response.text(); } catch(e) {}
    throw new Error(`Google Drive ${action} Failed: ${response.statusText} - ${errorText}`);
};

/**
 * Uploads a given File (e.g., .xlsx) directly to Google Drive using the provided OAuth token.
 */
export const uploadFileToDrive = async (file: File, token: string, filenamePrefix: string = 'ycv_report'): Promise<string> => {
    if (!token) throw new Error("Missing Google OAuth Token");

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    
    const uploadTime = formatDate(new Date());
    const creationTime = formatDate(new Date(file.lastModified));
    const extension = file.name.split('.').pop() || 'xlsx';
    const formattedName = `YCX_${creationTime} |Upload: ${uploadTime}.${extension}`;

    const metadata = {
        name: formattedName,
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
        await handleDriveError(response, 'Upload');
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
        await handleDriveError(response, 'Download');
    }

    return await response.blob();
};

export interface DriveFile {
    id: string;
    name: string;
    createdTime: string;
    size?: string;
}

/**
 * Lists all previous YCX Excel reports uploaded to Google Drive.
 */
export const listDriveFiles = async (token: string): Promise<DriveFile[]> => {
    if (!token) throw new Error("Missing Google OAuth Token");

    const query = encodeURIComponent(`name contains 'YCX_' and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false`);
    const fields = encodeURIComponent('files(id, name, createdTime, size)');
    const url = `${DRIVE_FILES_URL}?q=${query}&orderBy=createdTime desc&fields=${fields}&pageSize=100`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        await handleDriveError(response, 'List');
    }

    const data = await response.json();
    return data.files as DriveFile[];
};

/**
 * Deletes a file from Google Drive using its fileId.
 */
export const deleteFileFromDrive = async (fileId: string, token: string): Promise<void> => {
    if (!token) throw new Error("Missing Google OAuth Token");

    const response = await fetch(`${DRIVE_FILES_URL}/${fileId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        await handleDriveError(response, 'Delete');
    }
};
