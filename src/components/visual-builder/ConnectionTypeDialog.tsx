import { Link2, GitBranch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConnectionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDefault: () => void;
  onSelectBranch: () => void;
  sourceTitle?: string;
  targetTitle?: string;
}

export function ConnectionTypeDialog({
  open,
  onOpenChange,
  onSelectDefault,
  onSelectBranch,
  sourceTitle,
  targetTitle,
}: ConnectionTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como conectar estes passos?</DialogTitle>
          <DialogDescription>
            {sourceTitle && targetTitle ? (
              <>De "<strong>{sourceTitle}</strong>" para "<strong>{targetTitle}</strong>"</>
            ) : (
              'Escolha o tipo de conexão entre os passos'
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto py-4 px-4 justify-start gap-4 hover:border-primary hover:bg-primary/5"
            onClick={() => {
              onSelectDefault();
              onOpenChange(false);
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 text-blue-600">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Conexão Padrão</div>
              <div className="text-xs text-muted-foreground">
                Próximo passo automático na sequência
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto py-4 px-4 justify-start gap-4 hover:border-amber-500 hover:bg-amber-500/5"
            onClick={() => {
              onSelectBranch();
              onOpenChange(false);
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 text-amber-600">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Ramificação Condicional</div>
              <div className="text-xs text-muted-foreground">
                Baseado em ação do usuário ou condição
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
