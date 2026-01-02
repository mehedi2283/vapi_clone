import React, { useState } from 'react';
import { Upload, FileText, Trash2, Search, File } from 'lucide-react';
import { FileItem } from '../types';

const MOCK_FILES: FileItem[] = [
  { id: 'file_1', name: 'company_policy.pdf', size: '2.4 MB', type: 'PDF', uploadedAt: '2023-11-01' },
  { id: 'file_2', name: 'pricing_tier_2024.docx', size: '156 KB', type: 'DOCX', uploadedAt: '2023-11-04' },
  { id: 'file_3', name: 'knowledge_base_faq.txt', size: '45 KB', type: 'TXT', uploadedAt: '2023-11-05' },
];

export const Files: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>(MOCK_FILES);
  const [isDragging, setIsDragging] = useState(false);

  const handleDelete = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Mock upload
    const newFile: FileItem = {
      id: `file_${Date.now()}`,
      name: 'uploaded_document.pdf',
      size: '1.2 MB',
      type: 'PDF',
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setFiles([newFile, ...files]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Files</h1>
        <button className="flex items-center gap-2 bg-vapi-accent hover:bg-teal-300 text-black px-4 py-2 rounded-lg font-medium transition-colors">
          <Upload size={18} />
          <span>Upload File</span>
        </button>
      </div>

      {/* Drag Drop Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer
          ${isDragging ? 'border-vapi-accent bg-vapi-accent/5' : 'border-zinc-800 bg-vapi-card hover:border-zinc-700'}`}
      >
        <div className="p-3 bg-zinc-900 rounded-full mb-3">
          <Upload size={24} className="text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-white mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-zinc-500">PDF, TXT, DOCX or JSON (max. 10MB)</p>
      </div>

      <div className="flex items-center gap-4 bg-vapi-card p-2 rounded-lg border border-vapi-border">
        <Search className="text-zinc-500 ml-2" size={20} />
        <input 
          type="text" 
          placeholder="Search files..." 
          className="bg-transparent border-none focus:outline-none text-white w-full placeholder-zinc-500"
        />
      </div>

      <div className="bg-vapi-card border border-vapi-border rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Size</th>
              <th className="px-6 py-4 font-medium">Uploaded</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {files.map(file => (
              <tr key={file.id} className="group hover:bg-zinc-900/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-vapi-accent" />
                    <span className="text-zinc-200 font-medium">{file.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">{file.type}</span>
                </td>
                <td className="px-6 py-4 text-zinc-400">{file.size}</td>
                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{file.uploadedAt}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(file.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No files uploaded.</div>
        )}
      </div>
    </div>
  );
};