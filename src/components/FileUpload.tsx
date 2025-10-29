import { useCallback } from "react";
import { Upload, X } from "lucide-react";
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
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border border-dashed border-border rounded-lg px-4 py-2 text-center hover:border-primary/50 transition-colors cursor-pointer bg-card/30 backdrop-blur-sm"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleFileInput}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-primary/10 flex items-center justify-center shrink-0">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">
                Enviar planilhas
              </p>
              <p className="text-xs text-muted-foreground">
                .csv, .xls, .xlsx
              </p>
            </div>
          </div>
        </label>
      </div>
      
      {spreadsheets.length > 0 && (
        <div className="space-y-1.5">
          {spreadsheets.map((spreadsheet, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 bg-card/50 rounded-lg px-3 py-2 border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {spreadsheet.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spreadsheet.rows.length} {spreadsheet.rows.length === 1 ? 'linha' : 'linhas'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                title={`Remover ${spreadsheet.filename}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
