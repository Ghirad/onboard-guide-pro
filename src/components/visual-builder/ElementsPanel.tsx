import { MousePointer2, Link, FormInput, ToggleLeft, Navigation, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export interface ScannedElement {
  type: 'button' | 'link' | 'input' | 'checkbox' | 'radio' | 'select' | 'menu' | 'navigation' | 'other';
  selector: string;
  label: string;
  tagName: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface ElementsPanelProps {
  elements: ScannedElement[];
  isLoading: boolean;
  onElementClick: (element: ScannedElement) => void;
  onElementHover: (selector: string | null) => void;
  onScanElements: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  button: <MousePointer2 className="h-3.5 w-3.5" />,
  link: <Link className="h-3.5 w-3.5" />,
  input: <FormInput className="h-3.5 w-3.5" />,
  checkbox: <ToggleLeft className="h-3.5 w-3.5" />,
  radio: <ToggleLeft className="h-3.5 w-3.5" />,
  select: <FormInput className="h-3.5 w-3.5" />,
  menu: <Navigation className="h-3.5 w-3.5" />,
  navigation: <Navigation className="h-3.5 w-3.5" />,
  other: <MoreHorizontal className="h-3.5 w-3.5" />,
};

const typeLabels: Record<string, string> = {
  button: 'Botões',
  link: 'Links',
  input: 'Campos de entrada',
  checkbox: 'Checkboxes',
  radio: 'Radio buttons',
  select: 'Selects',
  menu: 'Menus',
  navigation: 'Navegação',
  other: 'Outros',
};

export function ElementsPanel({
  elements,
  isLoading,
  onElementClick,
  onElementHover,
  onScanElements,
}: ElementsPanelProps) {
  // Group elements by type
  const groupedElements = elements.reduce((acc, el) => {
    if (!acc[el.type]) acc[el.type] = [];
    acc[el.type].push(el);
    return acc;
  }, {} as Record<string, ScannedElement[]>);

  const typeOrder = ['button', 'link', 'input', 'select', 'navigation', 'menu', 'checkbox', 'radio', 'other'];
  const sortedTypes = typeOrder.filter(type => groupedElements[type]?.length > 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Elementos Detectados</h3>
          <p className="text-xs text-muted-foreground">
            {elements.length} elementos encontrados
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onScanElements}
          disabled={isLoading}
        >
          {isLoading ? 'Escaneando...' : 'Reescanear'}
        </Button>
      </div>

      {elements.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <MousePointer2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum elemento encontrado</p>
          <p className="text-xs mt-1">Clique em "Reescanear" após a página carregar</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
          </div>
          <p className="text-sm mt-4">Escaneando elementos...</p>
        </div>
      )}

      {!isLoading && elements.length > 0 && (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <Accordion type="multiple" defaultValue={sortedTypes} className="space-y-1">
            {sortedTypes.map(type => (
              <AccordionItem key={type} value={type} className="border rounded-lg px-2">
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2">
                    {typeIcons[type]}
                    <span className="text-sm font-medium">{typeLabels[type]}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {groupedElements[type].length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-2">
                  <div className="space-y-1">
                    {groupedElements[type].map((el, index) => (
                      <div
                        key={`${el.selector}-${index}`}
                        className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        onMouseEnter={() => onElementHover(el.selector)}
                        onMouseLeave={() => onElementHover(null)}
                        onClick={() => onElementClick(el)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{el.label}</p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            {el.selector}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onElementClick(el);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      )}
    </div>
  );
}
