import React from 'react';
import { FilePlusIcon } from './Icons';

interface FileUploadProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, fileName, disabled }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <label
        htmlFor="file-upload"
        title="Tải lên tệp sản phẩm"
        className={`relative flex items-center justify-center w-12 h-12 transition bg-emerald-50 border-2 border-emerald-200 rounded-lg appearance-none cursor-pointer hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          id="file-upload"
          name="file_upload"
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={onFileChange}
          accept=".xlsx, .xls"
          disabled={disabled}
          multiple
        />
        <FilePlusIcon className="h-6 w-6 text-emerald-600" />
      </label>
      {fileName && (
        <p className="text-xs text-slate-500 truncate max-w-[100px]" title={fileName}>
          {fileName}
        </p>
      )}
    </div>
  );
};

export default FileUpload;