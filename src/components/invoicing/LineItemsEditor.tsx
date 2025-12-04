import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineItemInput } from '@/types/invoicing';

interface LineItemsEditorProps {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
}

export const LineItemsEditor = ({ items, onChange }: LineItemsEditorProps) => {
  const addItem = () => {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: keyof LineItemInput, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const calculateLineTotal = (item: LineItemInput) => {
    return (item.quantity || 0) * (item.unitPrice || 0);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1"></div>
      </div>
      
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5">
            <Input
              placeholder="Item description"
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>
          <div className="col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={item.unitPrice}
              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>
          <div className="col-span-2 text-right font-medium pr-2">
            ${calculateLineTotal(item).toFixed(2)}
          </div>
          <div className="col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">
        <Plus className="h-4 w-4 mr-1" />
        Add Item
      </Button>
    </div>
  );
};
