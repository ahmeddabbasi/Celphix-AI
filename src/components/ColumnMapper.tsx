import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ColumnMapping {
  source_field: string;
  target_field: string | null;
}

interface ColumnMapperProps {
  headers: string[];
  mappings: ColumnMapping[];
  onChange: (mappings: ColumnMapping[]) => void;
}

const TARGET_OPTIONS = [
  { value: 'customer_index', label: 'Index Number' },
  { value: 'customername', label: 'Customer Name' },
  { value: 'customernumber', label: 'Customer Number' },
  { value: null, label: '-- Not Mapped --' }
];

export function ColumnMapper({ headers, mappings, onChange }: ColumnMapperProps) {
  // Track which targets are already selected
  const selectedTargets = mappings
    .map(m => m.target_field)
    .filter(t => t !== null);

  const handleMappingChange = (sourceField: string, newTarget: string | null) => {
    const updated = mappings.map(m =>
      m.source_field === sourceField
        ? { ...m, target_field: newTarget }
        : m
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[500px] max-w-[1400px] overflow-y-auto border-2 border-gray-600 rounded-xl p-6 bg-gradient-to-br from-gray-900 to-black shadow-xl">
        {headers.map((header) => {
          const currentMapping = mappings.find(m => m.source_field === header);
          const currentTarget = currentMapping?.target_field;

          return (
            <div key={header} className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-600 hover:border-gray-500 hover:shadow-md transition-all">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-100 truncate block" title={header}>
                  {header}
                </span>
              </div>
              
              <div className="flex-shrink-0 w-64">
                <Select
                  value={currentTarget || 'unmapped'}
                  onValueChange={(value) => {
                    const newTarget = value === 'unmapped' ? null : value;
                    handleMappingChange(header, newTarget);
                  }}
                >
                  <SelectTrigger className="h-10 text-sm bg-gray-700 border-gray-500 text-gray-100 hover:bg-gray-600 transition-colors">
                    <SelectValue placeholder="Select mapping..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unmapped">
                      <span className="text-gray-400 italic">-- Not Mapped --</span>
                    </SelectItem>
                    {TARGET_OPTIONS.filter(opt => opt.value !== null).map(option => {
                      const isDisabled = selectedTargets.includes(option.value) && currentTarget !== option.value;
                      
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={isDisabled}
                        >
                          {option.label}
                          {isDisabled && ' ✓'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-900 to-blue-800 border-2 border-blue-600 rounded-lg text-sm text-blue-100 shadow-md">
        <span className="font-bold">⚠️ Required Fields:</span>
        <span>Index Number, Customer Name, Customer Number</span>
      </div>
    </div>
  );
}
