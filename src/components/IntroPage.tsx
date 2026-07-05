import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, AlertCircle, Plus, FileUp, Github, FolderOpen } from 'lucide-react';

interface IntroPageProps {
  onCreate: () => void;
  onFileUpload: (content: string, fileName: string) => void;
  onLoadDraft?: () => void;
  draftInfo?: { fileName?: string; savedAt: string } | null;
}

const IntroPage: React.FC<IntroPageProps> = ({ onCreate, onFileUpload, onLoadDraft, draftInfo }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.mpif')) {
      setErrorMessage('Please upload a .mpif file');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('loading');
    setErrorMessage('');

    try {
      const content = await file.text();
      if (!content.includes('data_') && !content.includes('_mpif_')) {
        throw new Error('File does not appear to be a valid MPIF file');
      }
      setTimeout(() => onFileUpload(content, file.name), 500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to read file');
      setUploadStatus('error');
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      'text/plain': ['.mpif'],
      'application/octet-stream': ['.mpif']
    },
    maxFiles: 1,
  });

  const handleUploadClick = () => {
    setUploadStatus('idle');
    setErrorMessage('');
    open();
  }

  return (
    <div {...getRootProps()} className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 focus:outline-none overflow-hidden">
      <input {...getInputProps()} />
      
      {/* GitHub Link */}
      <a
        href="https://github.com/MuhammadArhumSraw/MPIF-GUI"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-6 right-6 z-10 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
        title="View on GitHub"
      >
        <Github className="h-6 w-6 text-gray-700 group-hover:text-gray-900 transition-colors" />
      </a>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
        {/* Hero Section */}
        <div className="text-center mb-12 max-w-4xl">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-6">
            MPIF Dashboard
          </h1>
          
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Create, edit, and manage MPIF files with precision and ease. Built for researchers, by researchers.
          </p>
        </div>

        {/* Action Cards */}
        <div className={`grid gap-8 mb-12 w-full ${draftInfo ? 'md:grid-cols-3 max-w-6xl' : 'md:grid-cols-2 max-w-4xl'}`}>
          {/* Upload Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={uploadStatus === 'loading' ? undefined : handleUploadClick}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-6">
                <FileUp className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-4">
                Upload Existing File
              </h3>
              
              <p className="text-slate-600 mb-6 leading-relaxed">
                Load and edit your existing MPIF files
                {uploadStatus === 'loading' && (
                  <span className="block mt-2 text-blue-600 font-medium">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    Processing...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Create Card */}
          <div 
            className="group relative cursor-pointer"
            onClick={uploadStatus === 'loading' ? undefined : onCreate}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-6">
                <Plus className="w-8 h-8 text-purple-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-4">
                Create New File
              </h3>
              
              <p className="text-slate-600 mb-6 leading-relaxed">
                Start fresh with a new MPIF file
              </p>
            </div>
          </div>

          {draftInfo && onLoadDraft && (
            <div
              className="group relative cursor-pointer"
              onClick={uploadStatus === 'loading' ? undefined : onLoadDraft}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
                <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-xl mb-6">
                  <FolderOpen className="w-8 h-8 text-emerald-600" />
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  Continue Saved Draft
                </h3>

                <p className="text-slate-600 mb-2 leading-relaxed">
                  {draftInfo.fileName || 'Browser draft'}
                </p>
                <p className="text-sm text-slate-500">
                  Saved {new Date(draftInfo.savedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>


        {/* Error Display */}
        {uploadStatus === 'error' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-center text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default IntroPage;
