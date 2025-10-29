import { useCallback } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "./ui/button";

interface FileUploadProps {
  onFilesProcessed: (files: Array<{ filename: string; columns: string[]; rows: any[] }>) => void;
  spreadsheets: Array<{ filename: string; columns: string[]; rows: any[] }>;
  onRemove: (index: number) => void;
}

export const FileUpload = ({ onFilesProcessed, spreadsheets, onRemove }: FileUploadProps) => {
  const processFile = useCallback(
    async (file: File) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            let workbook: XLSX.WorkBook;
            
            if (file.name.endsWith('.csv')) {
              workbook = XLSX.read(data, { type: 'binary' });
            } else {
              workbook = XLSX.read(data, { type: 'array' });
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
              toast.error("Planilha vazia ou formato inválido");
              return;
            }
            
            const columns = Object.keys(jsonData[0] as object);
            
            onFilesProcessed([{
              filename: file.name,
              columns,
              rows: jsonData,
            }]);
            
            toast.success(`${file.name} carregada com sucesso!`);
          } catch (error) {
            console.error("Erro ao processar planilha:", error);
            toast.error("Erro ao processar planilha");
          }
        };
        
        if (file.name.endsWith('.csv')) {
          reader.readAsBinaryString(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      } catch (error) {
        console.error("Erro ao ler arquivo:", error);
        toast.error("Erro ao ler arquivo");
      }
    },
    [onFilesProcessed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      
      const validFiles = files.filter(file => {
        const ext = file.name.toLowerCase();
        return ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
      });
      
      if (validFiles.length === 0) {
        toast.error("Por favor, envie apenas arquivos CSV, XLS ou XLSX");
        return;
      }
      
      validFiles.forEach(processFile);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      
      Array.from(files).forEach(processFile);
    },
    [processFile]
  );

  return (
    <div className="w-full space-y-2">
      {/* Upload Area - Compacto */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border border-dashed border-border rounded-lg px-4 py-2.5 hover:border-primary/50 transition-colors cursor-pointer bg-card/30 backdrop-blur-sm"
      >
        <input
          type="file"
          id="spreadsheet-upload"
          className="hidden"
          accept=".csv,.xls,.xlsx"
          multiple
          onChange={handleFileInput}
        />
        <label
          htmlFor="spreadsheet-upload"
          className="flex items-center gap-3 cursor-pointer"
        >
          <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Enviar planilhas
            </p>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">
            .csv, .xlsx
          </p>
        </label>
      </div>
      
      {/* Lista de planilhas - Compacta com scroll horizontal */}
      {spreadsheets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {spreadsheets.map((spreadsheet, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 bg-card/50 rounded-lg px-3 py-2 border border-border/50 shrink-0 group hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate max-w-[140px]" title={spreadsheet.filename}>
                    {spreadsheet.filename}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemove(index)}
                className="h-5 w-5 shrink-0 rounded-sm hover:bg-destructive/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title={`Remover ${spreadsheet.filename}`}
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
