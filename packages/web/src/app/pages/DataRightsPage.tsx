import { DataRights } from '@/components/compliance/DataRights';
import { DataExportImport } from '@/components/compliance/DataExportImport';
import { Shield } from 'lucide-react';

export default function DataRightsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* Privacy banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-medium text-blue-900">您的数据由您掌控</h2>
            <ul className="mt-2 space-y-1 text-xs text-blue-700">
              <li>• 练习、话术、复盘数据默认仅在当前会话有效</li>
              <li>• 您可以随时保存到账号、导出备份、或一键删除</li>
              <li>• 上传的知识库文件仅用于为您生成更好的话术</li>
              <li>• 平台管理员无法查看您的任何内容数据</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export / Import / Delete */}
      <DataExportImport />

      {/* Existing data rights component */}
      <DataRights />
    </div>
  );
}
